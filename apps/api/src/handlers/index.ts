import type { AppDeps } from '../app.js';
import type { OperationHandlers } from '../openapi/types.js';
import { getHealth } from './health.js';

/** operationId → handler. Adding an operation to openapi.yaml without a handler here fails typecheck. */
export const createHandlers = (deps: AppDeps): OperationHandlers => ({
  getHealth: getHealth(deps),
});
