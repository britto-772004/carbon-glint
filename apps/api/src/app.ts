import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import * as OpenApiValidator from 'express-openapi-validator';
import type { Config } from './config.js';
import type { DatabaseHandle } from './db/client.js';
import type { AiClient } from './lib/gemini.js';
import type { Logger } from './lib/logger.js';
import { createHandlers } from './handlers/index.js';
import { operationIdResolver } from './openapi/resolver.js';
import { errorHandler } from './errors.js';

export const OPENAPI_SPEC_PATH = fileURLToPath(import.meta.resolve('@carbon-glint/api-spec/openapi.yaml'));

export interface AppDeps {
  config: Config;
  database: DatabaseHandle;
  ai: AiClient;
  logger: Logger;
}

export function createApp(deps: AppDeps) {
  const { config, logger } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(helmet());
  if (config.CORS_ORIGINS.length > 0) app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: config.NODE_ENV !== 'test',
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Raw contract for tooling / API explorers.
  const specYaml = readFileSync(OPENAPI_SPEC_PATH, 'utf8');
  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(specYaml);
  });

  // Routes + request/response DTO validation come straight from openapi.yaml.
  app.use(
    OpenApiValidator.middleware({
      apiSpec: OPENAPI_SPEC_PATH,
      validateRequests: { allErrors: true, removeAdditional: false },
      // Catch handler/contract drift everywhere except prod.
      validateResponses: config.NODE_ENV !== 'production',
      validateApiSpec: true,
      operationHandlers: {
        basePath: '',
        resolver: operationIdResolver(createHandlers(deps)),
      },
    }),
  );

  app.use(errorHandler(logger));
  return app;
}
