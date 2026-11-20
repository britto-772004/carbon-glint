import { Queue } from 'bullmq';
import { bullConnection } from '../lib/redis.js';
import type { JobQueue } from './types.js';

export const QUEUE_NAME = 'carbon-glint';

export function createJobQueue(redisUrl: string): JobQueue & { close(): Promise<void> } {
  const queue = new Queue(QUEUE_NAME, {
    connection: bullConnection(redisUrl),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 1_000, age: 7 * 24 * 3600 },
      removeOnFail: { count: 5_000 },
    },
  });

  return {
    async enqueue(name, payload, opts) {
      await queue.add(name, payload, opts?.delayMs ? { delay: opts.delayMs } : {});
    },
    async schedule(id, name, payload, everyMs) {
      await queue.upsertJobScheduler(id, { every: everyMs }, { name, data: payload });
    },
    close: () => queue.close(),
  };
}
