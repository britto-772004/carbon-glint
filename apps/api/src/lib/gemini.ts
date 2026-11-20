import { GoogleGenAI } from '@google/genai';

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
}

export interface AgentResult {
  text: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

export interface AiClient {
  /** True when a Gemini API key is configured. */
  readonly available: boolean;
  generateText(prompt: string, opts?: { systemInstruction?: string }): Promise<string>;
  /** Structured output: Gemini returns JSON matching `schema` (an OpenAPI-style schema object). */
  generateJson<T>(prompt: string, schema: Record<string, unknown>, opts?: { systemInstruction?: string }): Promise<T>;
  /** Embedding vectors (768-d) for retrieval. */
  embed(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[][]>;
  /**
   * Function-calling loop: the model may call `tools` (executed by `execute`) for up to `maxSteps` rounds,
   * then returns its final text plus every tool call made.
   */
  runAgent(opts: {
    system: string;
    history: Array<{ role: 'user' | 'model'; text: string }>;
    message: string;
    tools: AiTool[];
    execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    maxSteps?: number;
  }): Promise<AgentResult>;
}

export const EMBEDDING_MODEL = 'gemini-embedding-001';

export function createGeminiClient(apiKey: string | undefined, model: string): AiClient {
  let ai: GoogleGenAI | undefined;
  const getAi = () => {
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    ai ??= new GoogleGenAI({ apiKey });
    return ai;
  };

  return {
    available: Boolean(apiKey),
    async generateText(prompt, opts) {
      const res = await getAi().models.generateContent({
        model,
        contents: prompt,
        ...(opts?.systemInstruction ? { config: { systemInstruction: opts.systemInstruction } } : {}),
      });
      return res.text ?? '';
    },
    async generateJson<T>(prompt: string, schema: Record<string, unknown>, opts?: { systemInstruction?: string }) {
      const res = await getAi().models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
          ...(opts?.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
        },
      });
      return JSON.parse(res.text ?? 'null') as T;
    },
    async embed(texts, taskType) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 50) {
        const res = await getAi().models.embedContent({
          model: EMBEDDING_MODEL,
          contents: texts.slice(i, i + 50),
          config: { taskType, outputDimensionality: 768 },
        });
        out.push(...(res.embeddings ?? []).map((e) => e.values ?? []));
      }
      return out;
    },
    async runAgent({ system, history, message, tools, execute, maxSteps = 5 }) {
      const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
        ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: message }] },
      ];
      const calls: AgentResult['toolCalls'] = [];
      for (let step = 0; step < maxSteps; step++) {
        const res = await getAi().models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: system,
            temperature: 0.2,
            tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }],
          },
        });
        const fnCalls = res.functionCalls ?? [];
        if (fnCalls.length === 0) return { text: res.text ?? '', toolCalls: calls };
        contents.push({ role: 'model', parts: fnCalls.map((fc) => ({ functionCall: fc })) });
        const responses = [];
        for (const fc of fnCalls) {
          const args = (fc.args ?? {}) as Record<string, unknown>;
          let result: unknown;
          try {
            result = await execute(fc.name ?? '', args);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : 'tool failed' };
          }
          calls.push({ name: fc.name ?? '', args, result });
          responses.push({ functionResponse: { name: fc.name, response: { result } } });
        }
        contents.push({ role: 'user', parts: responses });
      }
      return { text: '', toolCalls: calls };
    },
  };
}
