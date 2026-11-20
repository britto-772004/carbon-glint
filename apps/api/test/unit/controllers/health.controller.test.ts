import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../src/errors/domain-errors.js';
import { createTestApp } from '../../helpers/app.js';
import { fakeRepositories } from '../../helpers/fakes.js';

/** Controller tests: HTTP in → status code + spec-valid body out (full stack over fake repositories). */
describe('GET /api/health', () => {
  it('200 with a health report', async () => {
    const res = await createTestApp().api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'up' } });
  });

  it('200 degraded when the repository reports the DB down', async () => {
    const { api } = createTestApp({
      repositories: fakeRepositories({ system: { pingDatabase: vi.fn(async () => false) } }),
    });
    const res = await api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'degraded' });
  });

  it('maps a DomainError from the service to its status code + Error body', async () => {
    const { api } = createTestApp({
      services: {
        health: {
          getHealth: async () => {
            throw new NotFoundError('nothing here');
          },
        },
      },
    });
    const res = await api.get('/api/health').expect(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'nothing here' });
  });

  it('hides unexpected errors behind a 500', async () => {
    const { api } = createTestApp({
      services: {
        health: {
          getHealth: async () => {
            throw new Error('secret stack detail');
          },
        },
      },
    });
    const res = await api.get('/api/health').expect(500);
    expect(res.body).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });
});
