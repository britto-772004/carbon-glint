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
