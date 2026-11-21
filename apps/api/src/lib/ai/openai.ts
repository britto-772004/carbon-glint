import { EMBEDDING_DIMENSIONS, type AgentResult, type AiClient } from './types.js';

export interface OpenAiOptions {
  apiKey: string | undefined;
  model: string;
  embeddingModel: string;
  /** Override for OpenAI-compatible servers (Azure, OpenRouter, vLLM, Ollama…). */
  baseUrl: string;
}

type ChatMessage = Record<string, unknown>;

/** OpenAI (and OpenAI-compatible) client over the REST API — no SDK dependency. */
export function createOpenAiClient({ apiKey, model, embeddingModel, baseUrl }: OpenAiOptions): AiClient {
  const root = baseUrl.replace(/\/+$/, '');
  const isAzure = /\.(openai\.azure\.com|services\.ai\.azure\.com|cognitiveservices\.azure\.com)(:|\/|$)/i.test(root);

  const post = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    const res = await fetch(`${root}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        // Azure OpenAI / AI Foundry authenticate API keys with this header instead of Bearer.
        ...(isAzure ? { 'api-key': apiKey } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  };

  const chat = (messages: ChatMessage[], extra: Record<string, unknown> = {}) =>
    post<{
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    }>('/chat/completions', { model, messages, ...extra });

  const withSystem = (system: string | undefined, rest: ChatMessage[]): ChatMessage[] =>
    system ? [{ role: 'system', content: system }, ...rest] : rest;

  return {
    provider: 'openai',
    model,
    available: Boolean(apiKey),

    async generateText(prompt, opts) {
      const res = await chat(withSystem(opts?.systemInstruction, [{ role: 'user', content: prompt }]));
      return res.choices[0]?.message.content ?? '';
    },

    async generateJson<T>(prompt: string, schema: Record<string, unknown>, opts?: { systemInstruction?: string }) {
      // json_object mode works on every OpenAI-compatible server; the schema goes into the prompt.
      const res = await chat(
        withSystem(opts?.systemInstruction, [
          {
            role: 'user',
            content: `${prompt}\n\nRespond with a single JSON object that matches this JSON schema:\n${JSON.stringify(schema)}`,
          },
        ]),
        { response_format: { type: 'json_object' }, temperature: 0 },
      );
      return JSON.parse(res.choices[0]?.message.content ?? 'null') as T;
    },

    async embed(texts) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 100) {
        const res = await post<{ data: Array<{ index: number; embedding: number[] }> }>('/embeddings', {
          model: embeddingModel,
          input: texts.slice(i, i + 100),
          dimensions: EMBEDDING_DIMENSIONS,
        });
        out.push(...[...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding));
      }
      return out;
    },

    async runAgent({ system, history, message, tools, execute, maxSteps = 5 }) {
      const messages: ChatMessage[] = withSystem(system, [
        ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
        { role: 'user', content: message },
      ]);
      const calls: AgentResult['toolCalls'] = [];
      const toolDefs = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      for (let step = 0; step < maxSteps; step++) {
        const res = await chat(messages, { tools: toolDefs, temperature: 0.2 });
        const msg = res.choices[0]?.message;
        const toolCalls = msg?.tool_calls ?? [];
        if (toolCalls.length === 0) return { text: msg?.content ?? '', toolCalls: calls };
        messages.push({ role: 'assistant', content: msg?.content ?? null, tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
          } catch {
            /* malformed arguments → treat as none */
          }
          let result: unknown;
          try {
            result = await execute(tc.function.name, args);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : 'tool failed' };
          }
          calls.push({ name: tc.function.name, args, result });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ result }).slice(0, 30_000) });
        }
      }
      return { text: '', toolCalls: calls };
    },
  };
}
