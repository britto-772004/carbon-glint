import { GoogleGenAI } from '@google/genai';
import { EMBEDDING_DIMENSIONS, type AgentResult, type AiClient } from './types.js';

export const EMBEDDING_MODEL = 'gemini-embedding-001';

export function createGeminiClient(apiKey: string | undefined, model: string): AiClient {
  let ai: GoogleGenAI | undefined;
  const getAi = () => {
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    // The SDK defaults to the stable `v1` endpoint, which rejects function calling (the assistant's tools).
    ai ??= new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    return ai;
  };

  return {
    provider: 'gemini',
    model,
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
          config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
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
            tools: [
              {
                functionDeclarations: tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parametersJsonSchema: t.parameters,
                })),
              },
            ],
          },
        });
        const fnCalls = res.functionCalls ?? [];
        if (fnCalls.length === 0) return { text: res.text ?? '', toolCalls: calls };
        // Echo the model's own message back untouched: Gemini 3 models attach a `thoughtSignature` to each
        // functionCall part and reject the follow-up turn (400) if it is dropped.
        const modelContent = res.candidates?.[0]?.content as { parts?: Array<Record<string, unknown>> } | undefined;
        contents.push({
          role: 'model',
          parts: modelContent?.parts?.length ? modelContent.parts : fnCalls.map((fc) => ({ functionCall: fc })),
        });
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
