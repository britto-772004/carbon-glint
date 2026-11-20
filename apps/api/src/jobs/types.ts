import type { EmailMessage } from '../lib/mailer.js';

/** Every background job: name → payload. Add new jobs here, then a handler in ./handlers.ts. */
export interface JobPayloads {
  'email.send': EmailMessage;
}

export type JobName = keyof JobPayloads;

/** What services use to schedule background work (no BullMQ types leak into services). */
export interface JobQueue {
  enqueue<K extends JobName>(name: K, payload: JobPayloads[K], opts?: { delayMs?: number }): Promise<void>;
}
