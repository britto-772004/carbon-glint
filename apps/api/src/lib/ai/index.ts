import type { Config } from '../../config.js';
import { createGeminiClient } from './gemini.js';
import { createOpenAiClient } from './openai.js';
import type { AiClient } from './types.js';

export type { AgentResult, AiClient, AiProviderName, AiTool } from './types.js';

/**
 * Picks the LLM backend at runtime from `LLM_PROVIDER` (gemini | openai). `LLM_MODEL` overrides the
 * provider's default model; each provider reads its own API key.
 */
export function createAiClient(config: Config): AiClient {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      return createOpenAiClient({
        apiKey: config.OPENAI_API_KEY,
        model: config.LLM_MODEL ?? config.OPENAI_MODEL,
        embeddingModel: config.OPENAI_EMBEDDING_MODEL,
        baseUrl: config.OPENAI_BASE_URL,
      });
    case 'gemini':
    default:
      return createGeminiClient(config.GEMINI_API_KEY, config.LLM_MODEL ?? config.GEMINI_MODEL);
  }
}
