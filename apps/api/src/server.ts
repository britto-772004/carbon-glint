import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { createRuntime } from './runtime.js';
import { createApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config);
const runtime = createRuntime(config, logger);
const app = createApp({ config, logger, services: runtime.services });

const server = app.listen(config.PORT, config.HOST, () => {
  logger.info({ host: config.HOST, port: config.PORT, env: config.NODE_ENV }, 'API listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void runtime.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
