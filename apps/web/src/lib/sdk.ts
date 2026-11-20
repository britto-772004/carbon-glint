import { configureSdk } from '@carbon-glint/sdk';

/** Called once at boot. All API access goes through the generated SDK. */
export function initSdk(): void {
  configureSdk({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api' });
}
