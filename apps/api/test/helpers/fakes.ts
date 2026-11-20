import { vi } from 'vitest';
import type { JobQueue } from '../../src/jobs/types.js';
import type { AiClient } from '../../src/lib/gemini.js';
import type { Mailer } from '../../src/lib/mailer.js';
import type { Repositories } from '../../src/repositories/index.js';

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

/**
 * In-memory repositories. Every method is a `vi.fn` with a sensible default;
 * override per test: `fakeRepositories({ system: { ping: vi.fn(async () => false) } })`.
 */
export const fakeRepositories = (overrides: DeepPartial<Repositories> = {}): Repositories => ({
  system: { pingDatabase: vi.fn(async () => true), pingRedis: vi.fn(async () => true), ...overrides.system },
});

/** Records enqueued jobs instead of touching Redis: `expect(jobs.enqueue).toHaveBeenCalledWith('email.send', …)`. */
export const fakeJobQueue = (): JobQueue & { enqueue: ReturnType<typeof vi.fn> } => ({
  enqueue: vi.fn(async () => {}),
});

/** Captures sent emails in `mailer.sent`. */
export const fakeMailer = () => {
  const sent: Parameters<Mailer['send']>[0][] = [];
  return { sent, send: vi.fn(async (m: Parameters<Mailer['send']>[0]) => void sent.push(m)) } satisfies Mailer & {
    sent: unknown[];
  };
};

/** Gemini is never called for real in tests. `generateText` is a vi.fn so prompts can be asserted. */
export const fakeAi = (reply = ''): AiClient & { generateText: ReturnType<typeof vi.fn> } => ({
  generateText: vi.fn(async () => reply),
});
