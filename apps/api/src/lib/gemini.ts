import { GoogleGenAI } from '@google/genai';

export interface AiClient {
  /** True when a Gemini API key is configured. */
  readonly available: boolean;
  generateText(prompt: string, opts?: { systemInstruction?: string }): Promise<string>;
  /** Structured output: Gemini returns JSON matching `schema` (an OpenAPI-style schema object). */
  generateJson<T>(prompt: string, schema: Record<string, unknown>, opts?: { systemInstruction?: string }): Promise<T>;
}

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
  };
}
