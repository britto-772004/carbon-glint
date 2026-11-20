import type { ErrorRequestHandler } from 'express';
import type { Schemas } from '@carbon-glint/api-spec';
import type { Logger } from './lib/logger.js';

type ApiError = Schemas['Error'];

interface HttpErrorLike {
  status?: number;
  name?: string;
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
    415: 'UNSUPPORTED_MEDIA_TYPE',
  })[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

/** Maps validator and application errors onto the spec's `Error` schema. */
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (err: HttpErrorLike, _req, res, _next) => {
    const status = typeof err.status === 'number' && err.status >= 400 ? err.status : 500;
    if (status >= 500) logger.error({ err }, 'Unhandled error');

    const body: ApiError = {
      code: codeForStatus(status),
      message: status >= 500 ? 'Internal server error' : (err.message ?? 'Request failed'),
      ...(status < 500 && err.errors?.length
        ? { details: err.errors.map((e) => ({ ...(e.path ? { path: e.path } : {}), message: e.message })) }
        : {}),
    };
    res.status(status).json(body);
  };
