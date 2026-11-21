import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../../src/config.js';
import { createAiClient } from '../../../src/lib/ai/index.js';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('createAiClient (runtime provider selection)', () => {
  it('uses Gemini by default and the provider default model', () => {
    const ai = createAiClient(loadConfig({ ...base, GEMINI_API_KEY: 'k' }));
    expect(ai).toMatchObject({ provider: 'gemini', model: 'gemini-3.8-flash', available: true });
  });

  it('uses OpenAI when LLM_PROVIDER=openai, and LLM_MODEL overrides the model', () => {
    const ai = createAiClient(
      loadConfig({ ...base, LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'k', LLM_MODEL: 'gpt-4o' }),
    );
    expect(ai).toMatchObject({ provider: 'openai', model: 'gpt-4o', available: true });
  });

  it('reports unavailable when the selected provider has no key', () => {
    // A Gemini key must not make the OpenAI provider look configured.
    const ai = createAiClient(loadConfig({ ...base, LLM_PROVIDER: 'openai', GEMINI_API_KEY: 'k' }));
    expect(ai.available).toBe(false);
  });
});

describe('OpenAI client', () => {
  afterEach(() => vi.unstubAllGlobals());
  const client = () => createAiClient(loadConfig({ ...base, LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' }));
  const reply = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

  it('generateJson asks for a JSON object and parses it', async () => {
    const fetchMock = vi.fn(async () =>
      reply({ choices: [{ message: { content: '{"factorId":"f1","confidence":0.8}' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await client().generateJson<{ factorId: string }>('pick one', { type: 'object' });
    expect(out.factorId).toBe('f1');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Record<string, string> },
    ];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body)).toMatchObject({ response_format: { type: 'json_object' }, temperature: 0 });
  });

  it('runAgent executes tool calls and returns the final text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        reply({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [{ id: 'c1', function: { name: 'get_total', arguments: '{"scope":1}' } }],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(reply({ choices: [{ message: { content: 'Scope 1 is 5 t.' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const execute = vi.fn(async () => ({ kg: 5000 }));
    const res = await client().runAgent({
      system: 's',
      history: [],
      message: 'total?',
      tools: [{ name: 'get_total', description: 'd', parameters: { type: 'object', properties: {} } }],
      execute,
    });
    expect(execute).toHaveBeenCalledWith('get_total', { scope: 1 });
    expect(res).toEqual({
      text: 'Scope 1 is 5 t.',
      toolCalls: [{ name: 'get_total', args: { scope: 1 }, result: { kg: 5000 } }],
    });
    const second = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, { body: string }])[1].body);
    expect(second.messages.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 'c1' });
  });

  it('embed requests 768 dimensions and keeps input order', async () => {
    const fetchMock = vi.fn(async () =>
      reply({
        data: [
          { index: 1, embedding: [2] },
          { index: 0, embedding: [1] },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await client().embed(['a', 'b'], 'RETRIEVAL_DOCUMENT')).toEqual([[1], [2]]);
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)).toMatchObject({
      model: 'text-embedding-3-small',
      dimensions: 768,
    });
  });

  it('surfaces API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, text: async () => 'bad key' })),
    );
    await expect(client().generateText('x')).rejects.toThrow('OpenAI 401');
  });
});

describe('withRetry', () => {
  it('retries transient failures, then succeeds', async () => {
    const { withRetry } = await import('../../../src/lib/ai/index.js');
    const fn = vi.fn().mockRejectedValueOnce(new Error('503 model is overloaded')).mockResolvedValue('ok');
    expect(await withRetry(fn, 3, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry permanent errors', async () => {
    const { withRetry } = await import('../../../src/lib/ai/index.js');
    const fn = vi.fn().mockRejectedValue(new Error('400 invalid schema'));
    await expect(withRetry(fn, 3, 1)).rejects.toThrow('invalid schema');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Azure AI Foundry endpoint', () => {
  it('sends the api-key header for Azure hosts only', async () => {
    const { createOpenAiClient } = await import('../../../src/lib/ai/openai.js');
    const seen: Array<Record<string, string>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: { headers: Record<string, string> }) => {
        seen.push(init.headers);
        return new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), { status: 200 });
      }),
    );
    const make = (baseUrl: string) => createOpenAiClient({ apiKey: 'k', model: 'dep', embeddingModel: 'emb', baseUrl });
    await make('https://myres.openai.azure.com/openai/v1').generateText('x');
    await make('https://api.openai.com/v1').generateText('x');
    expect(seen[0]!['api-key']).toBe('k');
    expect(seen[1]!['api-key']).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('reasoning models', () => {
  it('retries without temperature when the model rejects it', async () => {
    const { createOpenAiClient } = await import('../../../src/lib/ai/openai.js');
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        bodies.push(body);
        if ('temperature' in body)
          return new Response('{"error":{"message":"Unsupported value: temperature does not support 0"}}', {
            status: 400,
          });
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), { status: 200 });
      }),
    );
    const ai = createOpenAiClient({
      apiKey: 'k',
      model: 'my-deployment',
      embeddingModel: 'e',
      baseUrl: 'https://x.openai.azure.com/openai/v1',
    });
    expect(await ai.generateJson('x', {})).toEqual({ a: 1 });
    await ai.generateJson('y', {});
    expect(bodies.map((b) => 'temperature' in b)).toEqual([true, false, false]);
    vi.unstubAllGlobals();
  });
});

describe('separate embeddings endpoint', () => {
  it('sends chat and embeddings to their own base URLs', async () => {
    const { createOpenAiClient } = await import('../../../src/lib/ai/openai.js');
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: string) => {
        urls.push(u);
        return new Response(
          JSON.stringify(
            u.endsWith('/embeddings')
              ? { data: [{ index: 0, embedding: [0.1] }] }
              : { choices: [{ message: { content: 'hi' } }] },
          ),
          { status: 200 },
        );
      }),
    );
    const ai = createOpenAiClient({
      apiKey: 'k',
      model: 'gpt-5-mini',
      embeddingModel: 'text-embedding-3-small',
      baseUrl: 'https://a.cognitiveservices.azure.com/openai/v1/',
      embeddingBaseUrl: 'https://b.cognitiveservices.azure.com/openai/v1',
    });
    await ai.generateText('x');
    await ai.embed(['x'], 'RETRIEVAL_QUERY');
    expect(urls).toEqual([
      'https://a.cognitiveservices.azure.com/openai/v1/chat/completions',
      'https://b.cognitiveservices.azure.com/openai/v1/embeddings',
    ]);
    vi.unstubAllGlobals();
  });
});
