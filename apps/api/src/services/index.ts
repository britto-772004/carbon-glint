import type { Config } from '../config.js';
import type { AiClient } from '../lib/gemini.js';
import type { JobQueue } from '../jobs/types.js';
import type { Repositories } from '../repositories/index.js';
import { createHealthService, type HealthService } from './health.service.js';

export interface ServiceDeps {
  repositories: Repositories;
  ai: AiClient;
  /** Schedule background work (emails, imports, calculations). */
  jobs: JobQueue;
  config: Config;
}

export interface Services {
  health: HealthService;
}

export const createServices = (deps: ServiceDeps): Services => ({
  health: createHealthService(deps),
});
