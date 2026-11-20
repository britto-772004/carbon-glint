import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { createGeminiClient } from './lib/gemini.js';
import { createLogger } from './lib/logger.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config);
const database = createDatabase(config.DATABASE_URL);

// Composition root: models → repositories → services → controllers.
const repositories = createRepositories(database.db);
const services = createServices({
  repositories,
  ai: createGeminiClient(config.GEMINI_API_KEY, config.GEMINI_MODEL),
  config,
});
const app = createApp({ config, logger, services });

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void database.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
