import { Worker } from 'bullmq';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { createMailer } from './lib/mailer.js';
import { bullConnection } from './lib/redis.js';
import { QUEUE_NAME } from './jobs/queue.js';
import { createJobHandlers, dispatchJob } from './jobs/handlers.js';
import { createRuntime } from './runtime.js';

/** Background worker process (pm2: carbon-glint-worker). One job at a time to stay within 1 GB RAM. */
const config = loadConfig();
const logger = createLogger(config);
const runtime = createRuntime(config, logger);
const handlers = createJobHandlers({ mailer: createMailer(config, logger), logger, services: runtime.services });

const worker = new Worker(QUEUE_NAME, (job) => dispatchJob(handlers, job.name, job.data), {
  connection: bullConnection(config.REDIS_URL),
  concurrency: 1,
});

worker.on('completed', (job) => logger.info({ jobId: job.id, name: job.name }, 'job completed'));
worker.on('failed', (job, err) =>
  logger.error({ jobId: job?.id, name: job?.name, attempts: job?.attemptsMade, err }, 'job failed'),
);
worker.on('ready', () => logger.info({ queue: QUEUE_NAME }, 'worker ready'));

// Periodic emission-factor sync (idempotent schedule; interval from EF_SYNC_INTERVAL_HOURS, 0 disables).
if (config.EF_SYNC_INTERVAL_HOURS > 0) {
  runtime.jobs
    .schedule('factors-sync', 'factors.sync', { trigger: 'schedule' }, config.EF_SYNC_INTERVAL_HOURS * 3_600_000)
    .then(() => logger.info({ everyHours: config.EF_SYNC_INTERVAL_HOURS }, 'emission factor sync scheduled'))
    .catch((err) => logger.error({ err }, 'could not schedule emission factor sync'));
}

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'worker shutting down');
  await worker.close();
  await runtime.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
