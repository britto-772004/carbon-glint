import type { Services } from '../services/index.js';
import type { Controllers } from '../openapi/types.js';
import { createAuthControllers } from './auth.controller.js';
import { getHealth } from './health.controller.js';
import type { ControllerOptions } from './http.js';
import { createPlatformControllers } from './platform.controller.js';
import { createTeamControllers } from './team.controller.js';
import { createTenantControllers } from './tenant.controller.js';

/** operationId → controller. Adding an operation to openapi.yaml without one here fails typecheck. */
export const createControllers = (
  services: Services,
  opts: ControllerOptions = { secureCookies: false },
): Controllers => ({
  getHealth: getHealth(services),
  ...createAuthControllers(services, opts),
  ...createTenantControllers(services),
  ...createTeamControllers(services, opts),
  ...createPlatformControllers(services),
});
