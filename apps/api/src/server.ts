import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { createGeminiClient } from './lib/gemini.js';
import { createLogger } from './lib/logger.js';
import { createRedis } from './lib/redis.js';
import { createJobQueue } from './jobs/queue.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config);
const database = createDatabase(config.DATABASE_URL);
const redis = createRedis(config.REDIS_URL);
redis.on('error', (err) => logger.warn({ err }, 'redis error'));
const jobs = createJobQueue(config.REDIS_URL);

// Composition root: models → repositories → services → controllers.
const repositories = createRepositories({ db: database.db, redis });
const services = createServices({
  repositories,
  ai: createGeminiClient(config.GEMINI_API_KEY, config.GEMINI_MODEL),
  jobs,
  config,
});
const app = createApp({ config, logger, services });

const server = app.listen(config.PORT, '127.0.0.1', () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void Promise.allSettled([database.close(), jobs.close(), redis.quit()]).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
