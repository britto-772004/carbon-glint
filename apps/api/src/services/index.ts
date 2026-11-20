import type { Config } from '../config.js';
import type { AiClient } from '../lib/gemini.js';
import type { JobQueue } from '../jobs/types.js';
import type { Repositories } from '../repositories/index.js';
import { createAuthService, type AuthService } from './auth.service.js';
import { createHealthService, type HealthService } from './health.service.js';
import { createPlatformService, type PlatformService } from './platform.service.js';
import { createTeamService, type TeamService } from './team.service.js';
import { createTenantService, type TenantService } from './tenant.service.js';

export interface ServiceDeps {
  repositories: Repositories;
  ai: AiClient;
  /** Schedule background work (emails, imports, calculations). */
  jobs: JobQueue;
  config: Config;
}

export interface Services {
  health: HealthService;
  auth: AuthService;
  tenant: TenantService;
  team: TeamService;
  platform: PlatformService;
}

export const createServices = (deps: ServiceDeps): Services => {
  const auth = createAuthService(deps);
  return {
    health: createHealthService(deps),
    auth,
    tenant: createTenantService(deps),
    team: createTeamService(deps),
    platform: createPlatformService(deps, auth),
  };
};
