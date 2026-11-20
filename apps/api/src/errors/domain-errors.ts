/**
 * Domain errors thrown by SERVICES. They carry no HTTP knowledge;
 * `error-handler.ts` maps each class to a status code + the spec's `Error` body.
 * Pass `code` to give the client a specific, machine-readable reason (e.g. WORK_EMAIL_REQUIRED).
 */
export interface DomainErrorOptions {
  code?: string;
  details?: Array<{ path?: string; message: string }>;
}

export abstract class DomainError extends Error {
  protected abstract readonly defaultCode: string;
  readonly details?: Array<{ path?: string; message: string }>;
  private readonly codeOverride?: string;

  constructor(message: string, opts: DomainErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    if (opts.code) this.codeOverride = opts.code;
    if (opts.details) this.details = opts.details;
  }

  get code(): string {
    return this.codeOverride ?? this.defaultCode;
  }
}

export class NotFoundError extends DomainError {
  protected readonly defaultCode = 'NOT_FOUND';
}
export class ConflictError extends DomainError {
  protected readonly defaultCode = 'CONFLICT';
}
export class UnauthorizedError extends DomainError {
  protected readonly defaultCode = 'UNAUTHORIZED';
}
export class ForbiddenError extends DomainError {
  protected readonly defaultCode = 'FORBIDDEN';
}
/** A valid request that breaks a business rule (e.g. "work email required"). */
export class BusinessRuleError extends DomainError {
  protected readonly defaultCode = 'BUSINESS_RULE_VIOLATION';
}
export class TooManyRequestsError extends DomainError {
  protected readonly defaultCode = 'RATE_LIMITED';
}
/** An upstream dependency (e.g. Gemini) failed. */
export class UpstreamError extends DomainError {
  protected readonly defaultCode = 'UPSTREAM_ERROR';
}
