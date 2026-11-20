import { vi } from 'vitest';
import type { JobPayloads, JobQueue } from '../../src/jobs/types.js';
import type { AiClient } from '../../src/lib/gemini.js';
import type { Mailer } from '../../src/lib/mailer.js';
import type { Repositories } from '../../src/repositories/index.js';
import { createMemoryRepositories, type MemoryStore } from './memory-repositories.js';

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

/**
 * In-memory repositories (see memory-repositories.ts). Override individual methods per test:
 * `fakeRepositories({ system: { pingDatabase: vi.fn(async () => false) } })`.
 */
export const fakeRepositories = (
  overrides: DeepPartial<Omit<Repositories, 'transaction'>> = {},
  store?: MemoryStore,
): Repositories & { store: MemoryStore } => {
  const repos = createMemoryRepositories(store);
  for (const [name, methods] of Object.entries(overrides)) {
    Object.assign((repos as unknown as Record<string, object>)[name]!, methods);
  }
  return repos;
};

/** Records enqueued jobs instead of touching Redis. `jobs.sent('email.send')` returns payloads of that job. */
export const fakeJobQueue = () => {
  const enqueued: Array<{ name: keyof JobPayloads; payload: unknown }> = [];
  const enqueue = vi.fn(async (name: keyof JobPayloads, payload: unknown) => {
    enqueued.push({ name, payload });
  });
  return {
    enqueue: enqueue as unknown as JobQueue['enqueue'] & typeof enqueue,
    enqueued,
    sent: <K extends keyof JobPayloads>(name: K) =>
      enqueued.filter((j) => j.name === name).map((j) => j.payload as JobPayloads[K]),
  };
};

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

/** Pulls the token out of a link in an email body (verification / invitation). */
export const tokenFromEmail = (text: string): string => {
  const m = text.match(/token=([^\s&]+)/);
  if (!m) throw new Error(`No token link in email:\n${text}`);
  return decodeURIComponent(m[1]!);
};
