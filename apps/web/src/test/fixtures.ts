import type { Health } from '@carbon-glint/sdk';

/**
 * Fixture builders typed with SDK types — if the spec changes, fixtures fail to compile.
 * Pattern: one `buildX(overrides)` per schema, valid by default.
 */
export const buildHealth = (overrides: Partial<Health> = {}): Health => ({
  status: 'ok',
  version: '0.1.0',
  uptimeSeconds: 42,
  checks: { database: 'up', redis: 'up' },
  ...overrides,
});
