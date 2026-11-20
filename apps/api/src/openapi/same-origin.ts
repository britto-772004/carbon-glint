import type { RequestHandler } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects cross-site state-changing requests. Browsers always send `Origin` on cross-origin POST/PUT/PATCH/DELETE;
 * we accept it only if it matches the request's own host or the configured APP_URL. Requests without `Origin`
 * (curl, server-to-server, same-origin GET) pass — the SameSite=Lax cookie already blocks cross-site use.
 */
export const sameOriginGuard =
  (appUrl: string): RequestHandler =>
  (req, res, next) => {
    const origin = req.get('origin');
    if (SAFE.has(req.method) || !origin) return next();
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid origin' });
    }
    const allowed = new Set([req.get('host'), req.get('x-forwarded-host'), new URL(appUrl).host].filter(Boolean));
    if (allowed.has(originHost)) return next();
    res.status(403).json({ code: 'FORBIDDEN', message: 'Cross-origin request blocked' });
  };
