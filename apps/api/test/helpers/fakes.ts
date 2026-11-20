import { vi } from 'vitest';
import type { AiClient } from '../../src/lib/gemini.js';
import type { Repositories } from '../../src/repositories/index.js';

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

/**
 * In-memory repositories. Every method is a `vi.fn` with a sensible default;
 * override per test: `fakeRepositories({ system: { ping: vi.fn(async () => false) } })`.
 */
export const fakeRepositories = (overrides: DeepPartial<Repositories> = {}): Repositories => ({
  system: { ping: vi.fn(async () => true), ...overrides.system },
});

/** Gemini is never called for real in tests. `generateText` is a vi.fn so prompts can be asserted. */
export const fakeAi = (reply = ''): AiClient & { generateText: ReturnType<typeof vi.fn> } => ({
  generateText: vi.fn(async () => reply),
});
