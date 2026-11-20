import { Readable } from 'node:stream';
import { vi } from 'vitest';
import type { JobPayloads, JobQueue } from '../../src/jobs/types.js';
import type { AiClient } from '../../src/lib/ai/index.js';
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
    schedule: vi.fn(async () => undefined) as unknown as JobQueue['schedule'],
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

/** Deterministic bag-of-words embedding (768-d) so vector search is meaningful in tests. */
export const fakeEmbedding = (text: string): number[] => {
  const v = new Array<number>(768).fill(0);
  for (const w of text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length > 2)) {
    let h = 0;
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % 768;
    v[h]! += 1;
  }
  return v;
};

/**
 * Gemini is never called for real in tests. `generateText`, `generateJson` and `runAgent` are vi.fn mocks
 * (override per test); `embed` is deterministic.
 */
export const fakeAi = (reply = '', json: unknown = null) => {
  const ai = {
    provider: 'gemini' as const,
    model: 'fake',
    available: json !== null || reply !== '',
    generateText: vi.fn(async () => reply),
    generateJson: vi.fn(async (_prompt?: string, _schema?: unknown, _opts?: unknown): Promise<unknown> => json),
    embed: vi.fn(async (texts: string[]) => texts.map(fakeEmbedding)),
    runAgent: vi.fn(
      async (
        _opts?: unknown,
      ): Promise<{
        text: string;
        toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
      }> => ({ text: '', toolCalls: [] }),
    ),
  };
  return ai as typeof ai & AiClient;
};

/** In-memory FileStorage. */
export const memoryFiles = () => {
  const data = new Map<string, Buffer>();
  return {
    data,
    put: vi.fn(async (key: string, value: Buffer | Uint8Array | string) => void data.set(key, Buffer.from(value))),
    read: (key: string) => {
      const v = data.get(key);
      if (!v) throw new Error(`missing file ${key}`);
      return Readable.from([v]);
    },
    exists: async (key: string) => data.has(key),
    remove: vi.fn(async (key: string) => void data.delete(key)),
  };
};

/** Pulls the token out of a link in an email body (verification / invitation). */
export const tokenFromEmail = (text: string): string => {
  const m = text.match(/token=([^\s&]+)/);
  if (!m) throw new Error(`No token link in email:\n${text}`);
  return decodeURIComponent(m[1]!);
};
