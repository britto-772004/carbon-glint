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

export type AiProviderName = 'gemini' | 'openai';

/** Provider-neutral LLM client. Implementations live next to this file (gemini.ts, openai.ts). */
export interface AiClient {
  /** Which backend is serving requests (chosen at runtime by LLM_PROVIDER). */
  readonly provider: AiProviderName;
  /** Model id used for chat / structured output. */
  readonly model: string;
  /** True when the selected provider has an API key configured. */
  readonly available: boolean;
  generateText(prompt: string, opts?: { systemInstruction?: string }): Promise<string>;
  /** Structured output: the model returns JSON matching `schema` (an OpenAPI-style schema object). */
  generateJson<T>(prompt: string, schema: Record<string, unknown>, opts?: { systemInstruction?: string }): Promise<T>;
  /** Embedding vectors (always 768-d, the pgvector column size) for retrieval. */
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

/** Embedding size shared by every provider (matches the `vector(768)` column). */
export const EMBEDDING_DIMENSIONS = 768;
