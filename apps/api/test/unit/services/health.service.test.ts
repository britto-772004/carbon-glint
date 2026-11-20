import { describe, expect, it, vi } from 'vitest';
import { createTestServices, testConfig } from '../../helpers/app.js';
import { fakeRepositories } from '../../helpers/fakes.js';

/** Service tests: business logic over fake repositories. No HTTP, no DB. */
describe('HealthService', () => {
  it('reports ok when the database responds', async () => {
    const { services, repositories } = createTestServices({ config: testConfig({ APP_VERSION: '1.2.3' }) });
    await expect(services.health.getHealth()).resolves.toMatchObject({
      status: 'ok',
      version: '1.2.3',
      checks: { database: 'up' },
    });
    expect(repositories.system.ping).toHaveBeenCalledOnce();
  });

  it('reports degraded when the database does not respond', async () => {
    const { services } = createTestServices({
      repositories: fakeRepositories({ system: { ping: vi.fn(async () => false) } }),
    });
    await expect(services.health.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: 'down' },
    });
  });
});
