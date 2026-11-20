/**
 * @carbon-glint/sdk — generated from packages/api-spec/openapi.yaml.
 * Everything under ./generated is produced by `pnpm generate`; do not edit it by hand.
 */
import { client } from './generated/client.gen.js';

export * from './generated/index.js';
/** TanStack Query option factories, e.g. `useQuery(getHealthOptions())`. */
export * from './generated/@tanstack/react-query.gen.js';
export type { Error as ApiError } from './generated/types.gen.js';
export { client };

export interface SdkConfig {
  /** Base URL of the API, e.g. `/api` (same origin) or `https://api.example.com/api`. */
  baseUrl: string;
  /** Optional async token provider; the result is sent as a Bearer token. */
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
}

/** Configure the shared SDK client once at app start-up. */
export function configureSdk({ baseUrl, getAccessToken }: SdkConfig): void {
  client.setConfig({ baseUrl });

  if (getAccessToken) {
    client.interceptors.request.use(async (request) => {
      const token = await getAccessToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    });
  }
}
