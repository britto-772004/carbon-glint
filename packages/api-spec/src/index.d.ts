/**
 * Type-only exports generated from openapi.yaml (run `pnpm generate`).
 * The backend uses these to type its operation handlers; the frontend uses @carbon-glint/sdk instead.
 */
export type { paths, components, operations } from './generated/schema.js';

import type { components } from './generated/schema.js';
export type Schemas = components['schemas'];
