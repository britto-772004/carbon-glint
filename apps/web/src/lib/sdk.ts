import { client, configureSdk } from '@carbon-glint/sdk';
import { switchingFetch } from '../demo/fetch';

/** Called once at boot. All API access goes through the generated SDK. */
export function initSdk(): void {
  configureSdk({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api' });
  // Demo mode answers from an in-browser store; otherwise this is the normal network fetch.
  client.setConfig({ fetch: switchingFetch });
}
