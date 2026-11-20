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
  const client = createProviderClient(config);
  return {
    ...client,
    // Overloaded / rate-limited responses are usually gone a moment later: retry the one-shot calls.
    generateText: (...a) => withRetry(() => client.generateText(...a)),
    generateJson: (...a) => withRetry(() => client.generateJson(...a)),
  };
}

const TRANSIENT =
  /\b(429|500|502|503|504)\b|overload|unavailable|rate|quota|timeout|timed out|fetch failed|ECONN|ETIMEDOUT/i;

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 800): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i >= attempts || !TRANSIENT.test(msg)) throw err;
      await new Promise((r) => setTimeout(r, baseMs * i));
    }
  }
}

function createProviderClient(config: Config): AiClient {
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
