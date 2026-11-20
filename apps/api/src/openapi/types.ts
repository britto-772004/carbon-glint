import type { RequestHandler } from 'express';
import type { operations } from '@carbon-glint/api-spec';

/**
 * Types derived from the OpenAPI spec. Controllers never declare their own DTOs —
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

/** A controller for one operation: typed req.params/query/body and res.json() from the spec. */
export type Controller<K extends OperationId> = RequestHandler<
  PathParams<K>,
  ResponseBody<K>,
  RequestBody<K>,
  QueryParams<K>
>;

/** Every operationId in the spec must have exactly one controller — enforced at compile time. */
export type Controllers = { [K in OperationId]: Controller<K> };
