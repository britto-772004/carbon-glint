import { http, HttpResponse } from 'msw';
import type { ApiError, GetHealthResponse, Industry, Invitation, Me, OrgUnit, User } from '@carbon-glint/sdk';
import { apiUrl } from '../constants';
import { INDUSTRIES, ORG_UNITS, buildHealth, buildInvitation, buildUser } from '../fixtures';
import { session } from './session';

/** Spec-shaped error response helper for overriding handlers in tests. */
export const apiError = (status: number, body: ApiError) => HttpResponse.json<ApiError>(body, { status });

const unauthorized = () => apiError(401, { code: 'UNAUTHORIZED', message: 'unauthorized' });

/**
 * Default "happy path" API mocks. `/me` reflects the in-memory `session` (signed out by default).
 * Override per test with `server.use(...)`. Response bodies are typed with SDK types.
 */
export const handlers = [
  http.get(apiUrl('/health'), () => HttpResponse.json<GetHealthResponse>(buildHealth())),
  http.get<never, never, Me | ApiError>(apiUrl('/me'), () =>
    session.me ? HttpResponse.json<Me>(session.me) : unauthorized(),
  ),
  http.post(apiUrl('/auth/logout'), () => {
    session.me = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(apiUrl('/industries'), () => HttpResponse.json<Industry[]>(INDUSTRIES)),
  http.get(apiUrl('/users'), () => HttpResponse.json<User[]>([buildUser()])),
  http.get(apiUrl('/invitations'), () => HttpResponse.json<Invitation[]>([buildInvitation()])),
  http.get(apiUrl('/org-units'), () => HttpResponse.json<OrgUnit[]>(ORG_UNITS)),
];
