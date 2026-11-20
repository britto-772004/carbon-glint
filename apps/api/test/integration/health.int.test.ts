import { afterAll, describe, expect, it } from 'vitest';
import { createRepositories } from '../../src/repositories/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestStores } from './db.js';

/** End-to-end: HTTP → controller → service → repository → real Postgres + Redis. */
describe('GET /api/health (real stores)', () => {
  const stores = createTestStores();
  const { api } = createTestApp({ repositories: createRepositories(stores) });

  afterAll(() => stores.close());

  it('reports every dependency as up', async () => {
    const res = await api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'up', redis: 'up' } });
  });
});
