import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/lib/logger.js';

const makeApp = (dbUp = true) => {
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    APP_VERSION: '9.9.9',
  });
  const deps: AppDeps = {
    config,
    logger: createLogger(config),
    database: { db: {} as AppDeps['database']['db'], ping: async () => dbUp, close: async () => {} },
    ai: { generateText: async () => '' },
  };
  return createApp(deps);
};

describe('API routed from openapi.yaml', () => {
  it('GET /api/health returns a spec-valid health report', async () => {
    const res = await request(makeApp()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', version: '9.9.9', checks: { database: 'up' } });
  });

  it('reports degraded when the database is down', async () => {
    const res = await request(makeApp(false)).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
  });

  it('returns a spec-shaped 404 for routes not declared in the spec', async () => {
    const res = await request(makeApp()).get('/api/does-not-exist').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 405 for undeclared methods on declared paths', async () => {
    const res = await request(makeApp()).post('/api/health').expect(405);
    expect(res.body).toMatchObject({ code: 'METHOD_NOT_ALLOWED' });
  });

  it('serves the raw contract', async () => {
    const res = await request(makeApp()).get('/api/openapi.yaml').expect(200);
    expect(res.text).toContain('operationId: getHealth');
  });
});
