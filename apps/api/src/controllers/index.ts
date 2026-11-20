import type { Services } from '../services/index.js';
import type { Controllers } from '../openapi/types.js';
import { getHealth } from './health.controller.js';

/** operationId → controller. Adding an operation to openapi.yaml without one here fails typecheck. */
export const createControllers = (services: Services): Controllers => ({
  getHealth: getHealth(services),
});
