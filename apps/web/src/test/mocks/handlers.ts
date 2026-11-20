import { http, HttpResponse } from 'msw';
import type { ApiError, GetHealthResponse } from '@carbon-glint/sdk';
import { apiUrl } from '../constants';
import { buildHealth } from '../fixtures';

/**
 * Default "happy path" API mocks, one per operation in openapi.yaml.
 * Override per test with `server.use(...)`. Response bodies are typed with SDK types.
 */
export const handlers = [http.get(apiUrl('/health'), () => HttpResponse.json<GetHealthResponse>(buildHealth()))];

/** Spec-shaped error response helper for overriding handlers in tests. */
export const apiError = (status: number, body: ApiError) => HttpResponse.json<ApiError>(body, { status });
