import type { CookieOptions, Response } from 'express';
import { UnauthorizedError } from '../errors/domain-errors.js';
import { SESSION_ABSOLUTE_SECONDS } from '../services/session.js';
import type { Actor, RequestContext } from '../services/types.js';

export const SESSION_COOKIE = 'cg_session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the cookieAuth security handler for protected operations. */
      auth?: Actor;
    }
  }
}

export interface ControllerOptions {
  /** Mark the session cookie Secure (true when the public URL is https). */
  secureCookies: boolean;
}

/** The signed-in actor; only call from operations that declare `security: cookieAuth`. */
export const actorOf = (req: { auth?: Actor }): Actor => {
  if (!req.auth) throw new UnauthorizedError('Not signed in.');
  return req.auth;
};

export const contextOf = (req: { ip?: string | undefined }): RequestContext => ({ ip: req.ip ?? 'unknown' });

const cookieOptions = (opts: ControllerOptions): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: opts.secureCookies,
  path: '/',
});

export const setSessionCookie = (res: Response, token: string, opts: ControllerOptions) =>
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(opts), maxAge: SESSION_ABSOLUTE_SECONDS * 1000 });

export const clearSessionCookie = (res: Response, opts: ControllerOptions) =>
  res.clearCookie(SESSION_COOKIE, cookieOptions(opts));
