import type { ErrorRequestHandler } from 'express';
import type { Schemas } from '@carbon-glint/api-spec';
import type { Logger } from '../lib/logger.js';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UpstreamError,
} from './domain-errors.js';

type ApiError = Schemas['Error'];

/** Domain error → HTTP status. Add new DomainError subclasses here. */
const DOMAIN_STATUS = new Map<abstract new (...args: never[]) => DomainError, number>([
  [NotFoundError, 404],
  [ConflictError, 409],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [BusinessRuleError, 422],
  [TooManyRequestsError, 429],
  // 503, not 502: Cloudflare replaces origin 502/504 responses with its own HTML page, hiding our JSON message.
  [UpstreamError, 503],
]);

const statusForDomainError = (err: DomainError): number => {
  for (const [ctor, status] of DOMAIN_STATUS) if (err instanceof ctor) return status;
  return 500;
};

/** Errors raised by express-openapi-validator (request validation, 404/405 routing, etc.). */
interface HttpErrorLike {
  status?: number;
  message?: string;
  errors?: Array<{ path?: string; message: string }>;
}

const codeForStatus = (status: number): string =>
  ({
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    413: 'PAYLOAD_TOO_LARGE',
    415: 'UNSUPPORTED_MEDIA_TYPE',
  })[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

/** Single place that turns any error into the spec's `Error` response. */
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (err: unknown, _req, res, _next) => {
    let status: number;
    let body: ApiError;

    if (err instanceof DomainError) {
      status = statusForDomainError(err);
      body = { code: err.code, message: err.message, ...(err.details?.length ? { details: err.details } : {}) };
    } else {
      const e = (err ?? {}) as HttpErrorLike;
      status = typeof e.status === 'number' && e.status >= 400 ? e.status : 500;
      body = {
        code: codeForStatus(status),
        message: status >= 500 ? 'Internal server error' : (e.message ?? 'Request failed'),
        ...(status < 500 && e.errors?.length
          ? { details: e.errors.map((d) => ({ ...(d.path ? { path: d.path } : {}), message: d.message })) }
          : {}),
      };
    }

    if (status >= 500) logger.error({ err }, 'Request failed');
    res.status(status).json(body);
  };
