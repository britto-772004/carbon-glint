import type { Config } from './config.js';
import { createDatabase } from './db/client.js';
import { createJobQueue } from './jobs/queue.js';
import { createAiClient } from './lib/ai/index.js';
import type { Logger } from './lib/logger.js';
import { createRedis } from './lib/redis.js';
import { createLocalFileStorage } from './lib/storage.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';

/** Composition root shared by the API server and the worker: models → repositories → services. */
export function createRuntime(config: Config, logger: Logger) {
  const database = createDatabase(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  redis.on('error', (err) => logger.warn({ err }, 'redis error'));
  const jobs = createJobQueue(config.REDIS_URL);
  const repositories = createRepositories({ db: database.db, redis });
  const services = createServices({
    repositories,
    ai: createAiClient(config),
    jobs,
    files: createLocalFileStorage(config.FILES_DIR),
    config,
  });
  return {
    services,
    jobs,
    close: () => Promise.allSettled([database.close(), jobs.close(), redis.quit()]),
  };
}
