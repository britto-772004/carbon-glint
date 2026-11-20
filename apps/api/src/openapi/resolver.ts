import type { RequestHandler } from 'express';
import type * as OpenApiValidator from 'express-openapi-validator';
import type { Controllers } from './types.js';

type ValidatorOptions = Parameters<typeof OpenApiValidator.middleware>[0];
type OperationHandlerOptions = Exclude<ValidatorOptions['operationHandlers'], string | false | undefined>;
type Resolver = OperationHandlerOptions['resolver'];

/**
 * Resolves each route declared in openapi.yaml to a controller via its `operationId`.
 * Routes exist only because the spec declares them — there is no hand-written router.
 */
export function operationIdResolver(controllers: Controllers): Resolver {
  return (_handlersPath, route, apiDoc) => {
    // openApiRoute includes the server base path (e.g. /api); spec paths do not.
    const pathKey = route.openApiRoute.substring(route.basePath.length);
    const pathItem = apiDoc.paths?.[pathKey] as Record<string, { operationId?: string }> | undefined;
    const operationId = pathItem?.[route.method.toLowerCase()]?.operationId;

    if (!operationId) {
      throw new Error(`No operationId for ${route.method} ${route.openApiRoute} in openapi.yaml`);
    }
    const handler = (controllers as unknown as Record<string, RequestHandler | undefined>)[operationId];
    if (!handler) {
      throw new Error(`No controller registered for operationId "${operationId}"`);
    }
    return handler;
  };
}
