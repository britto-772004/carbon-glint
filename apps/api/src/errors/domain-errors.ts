/**
 * Domain errors thrown by SERVICES. They carry no HTTP knowledge;
 * `error-handler.ts` maps each one to a status code + the spec's `Error` body.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(
    message: string,
    readonly details?: Array<{ path?: string; message: string }>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}
/** A valid request that breaks a business rule (e.g. "project limit reached"). */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
}
/** An upstream dependency (e.g. Gemini) failed. */
export class UpstreamError extends DomainError {
  readonly code = 'UPSTREAM_ERROR';
}
