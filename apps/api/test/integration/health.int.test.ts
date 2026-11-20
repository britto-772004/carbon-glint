import { afterAll, describe, expect, it } from 'vitest';
import { createRepositories } from '../../src/repositories/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestDatabase } from './db.js';

/** End-to-end: HTTP → controller → service → repository → real Postgres. */
describe('GET /api/health (real Postgres)', () => {
  const database = createTestDatabase();
  const { api } = createTestApp({ repositories: createRepositories(database.db) });

  afterAll(() => database.close());

  it('reports the database as up', async () => {
    const res = await api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'up' } });
  });
});
