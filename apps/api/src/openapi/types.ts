import type { RequestHandler } from 'express';
import type { operations } from '@carbon-glint/api-spec';

/**
 * Types derived from the OpenAPI spec. Handlers never declare their own DTOs —
 * request/response shapes come from `operations[operationId]`, and the runtime
 * shape is enforced by express-openapi-validator against the same spec.
 */
export type OperationId = keyof operations;

type Op<K extends OperationId> = operations[K];
type OrEmpty<T> = [NonNullable<T>] extends [never] ? Record<string, never> : NonNullable<T>;
type JsonContent<R> = R extends { content: { 'application/json': infer B } } ? B : never;

export type PathParams<K extends OperationId> = OrEmpty<Op<K>['parameters']['path']>;
export type QueryParams<K extends OperationId> = OrEmpty<Op<K>['parameters']['query']>;
export type RequestBody<K extends OperationId> =
  Op<K> extends { requestBody?: infer R } ? JsonContent<NonNullable<R>> : never;
export type ResponseBody<K extends OperationId> = {
  [S in keyof Op<K>['responses']]: JsonContent<Op<K>['responses'][S]>;
}[keyof Op<K>['responses']];

export type OperationHandler<K extends OperationId> = RequestHandler<
  PathParams<K>,
  ResponseBody<K>,
  RequestBody<K>,
  QueryParams<K>
>;

/** Every operationId in the spec must have exactly one handler — enforced at compile time. */
export type OperationHandlers = { [K in OperationId]: OperationHandler<K> };
