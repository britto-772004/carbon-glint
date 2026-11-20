import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig, type Config } from '../../src/config.js';
import { createControllers } from '../../src/controllers/index.js';
import { createLogger } from '../../src/lib/logger.js';
import type { Controllers } from '../../src/openapi/types.js';
import type { Repositories } from '../../src/repositories/index.js';
import { createServices, type ServiceDeps, type Services } from '../../src/services/index.js';
import type { AiClient } from '../../src/lib/gemini.js';
import { fakeAi, fakeJobQueue, fakeRepositories } from './fakes.js';

export const testConfig = (env: Record<string, string> = {}): Config =>
  loadConfig({
    NODE_ENV: 'test', // response validation is ON outside production
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://test:test@localhost:5432/unused',
    APP_VERSION: '0.0.0-test',
    ...env,
  });

/** Real services wired to fake (or provided) repositories — for service unit tests. */
export function createTestServices(overrides: Partial<ServiceDeps> = {}) {
  const deps: ServiceDeps = {
    repositories: fakeRepositories(),
    ai: fakeAi(),
    jobs: fakeJobQueue(),
    config: testConfig(),
    ...overrides,
  };
  return { services: createServices(deps), ...deps };
}

interface TestAppOptions {
  config?: Config;
  /** Swap the data layer (fakes by default, or real repos in integration tests). */
  repositories?: Repositories;
  ai?: AiClient;
  /** Replace individual services, e.g. to force a DomainError. */
  services?: Partial<Services>;
  /** Replace individual controllers (rarely needed — contract tests). */
  controllers?: Partial<Controllers>;
}

/**
 * The real app — real OpenAPI routing, request + response validation, real controllers and services —
 * over fake repositories unless you pass others. Use `api` (supertest) to make requests.
 */
export function createTestApp(opts: TestAppOptions = {}) {
  const config = opts.config ?? testConfig();
  const {
    services: realServices,
    repositories,
    ai,
  } = createTestServices({
    config,
    ...(opts.repositories ? { repositories: opts.repositories } : {}),
    ...(opts.ai ? { ai: opts.ai } : {}),
  });
  const services: Services = { ...realServices, ...opts.services };
  const app = createApp(
    { config, logger: createLogger(config), services },
    { ...createControllers(services), ...opts.controllers },
  );
  return { app, api: request(app), services, repositories, ai };
}
