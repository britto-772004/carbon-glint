import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { OPENAPI_SPEC_PATH } from '../../src/app.js';
import { createControllers } from '../../src/controllers/index.js';
import type { Controller } from '../../src/openapi/types.js';
import { createTestApp, createTestServices } from '../helpers/app.js';

const spec = parse(readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
  paths: Record<string, Record<string, { operationId?: string }>>;
};
const specOperationIds = Object.values(spec.paths).flatMap((item) =>
  Object.values(item).flatMap((op) => (op?.operationId ? [op.operationId] : [])),
);

/** Guards the contract itself: spec ↔ handlers ↔ validation behaviour. */
describe('OpenAPI contract', () => {
  it('every operation has an operationId', () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(item)) {
        expect(op.operationId, `${method.toUpperCase()} ${path}`).toBeTruthy();
      }
    }
  });

  it('registers exactly one controller per operationId', () => {
    const { services } = createTestServices();
    expect(Object.keys(createControllers(services)).sort()).toEqual([...specOperationIds].sort());
  });

  it('returns a spec-shaped 404 for undeclared routes', async () => {
    const res = await createTestApp().api.get('/api/does-not-exist').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 405 for undeclared methods', async () => {
    const res = await createTestApp().api.post('/api/health').expect(405);
    expect(res.body).toMatchObject({ code: 'METHOD_NOT_ALLOWED' });
  });

  it('rejects responses that drift from the spec (response validation)', async () => {
    const drifted = ((_req, res) => {
      res.json({ status: 'ok' } as never); // missing required fields
    }) satisfies Controller<'getHealth'>;

    await createTestApp({ controllers: { getHealth: drifted } })
      .api.get('/api/health')
      .expect(500);
  });

  it('serves the raw contract', async () => {
    const res = await createTestApp().api.get('/api/openapi.yaml').expect(200);
    expect(res.text).toContain('operationId: getHealth');
  });
});
