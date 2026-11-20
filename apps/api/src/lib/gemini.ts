import { GoogleGenAI } from '@google/genai';

export interface AiClient {
  generateText(prompt: string, opts?: { systemInstruction?: string }): Promise<string>;
}

export function createGeminiClient(apiKey: string | undefined, model: string): AiClient {
  let ai: GoogleGenAI | undefined;
  const getAi = () => {
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    ai ??= new GoogleGenAI({ apiKey });
    return ai;
  };

  return {
    async generateText(prompt, opts) {
      const res = await getAi().models.generateContent({
        model,
        contents: prompt,
        ...(opts?.systemInstruction ? { config: { systemInstruction: opts.systemInstruction } } : {}),
      });
      return res.text ?? '';
    },
  };
}
