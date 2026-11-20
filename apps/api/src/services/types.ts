/** The authenticated caller, resolved from the session cookie by the security handler. */
export interface Actor {
  userId: string;
  role: 'superadmin' | 'admin';
  tenantId: string | null;
  /** Hash of the current session token (to sign out / keep this session). */
  sessionHash: string;
}

/** Request facts services may need (rate limiting, audit). */
export interface RequestContext {
  ip: string;
}
