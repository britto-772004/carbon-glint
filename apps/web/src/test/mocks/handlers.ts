import { http, HttpResponse } from 'msw';
import type {
  ActivityDefinition,
  ApiError,
  GetHealthResponse,
  GhgCategory,
  Industry,
  Invitation,
  Me,
  OrgUnit,
  User,
} from '@carbon-glint/sdk';
import { apiUrl } from '../constants';
import {
  CATEGORIES,
  INDUSTRIES,
  ORG_UNITS,
  buildActivityDefinition,
  buildHealth,
  buildInvitation,
  buildUser,
} from '../fixtures';
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
  http.get(apiUrl('/ghg-categories'), () => HttpResponse.json<GhgCategory[]>(CATEGORIES)),
  http.get(apiUrl('/activity-definitions'), ({ request }) => {
    const scope = new URL(request.url).searchParams.get('scope');
    const all = [
      buildActivityDefinition(),
      buildActivityDefinition({
        id: 'ad000000-0000-4000-8000-000000000002',
        name: 'Flights',
        scope: 3,
        status: 'published',
        activityCount: 1200,
      }),
    ];
    return HttpResponse.json<ActivityDefinition[]>(scope ? all.filter((d) => String(d.scope) === scope) : all);
  }),
];
