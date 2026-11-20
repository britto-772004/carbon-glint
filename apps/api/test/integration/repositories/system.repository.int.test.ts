import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createSystemRepository } from '../../../src/repositories/system.repository.js';
import { createTestStores, resetDatabase, resetRedis } from '../db.js';

/** Repository tests: real SQL / Redis. One file per repository. */
describe('SystemRepository (Postgres + Redis)', () => {
  const stores = createTestStores();
  const repo = createSystemRepository(stores);

  beforeEach(async () => {
    await resetDatabase(stores.database);
    await resetRedis(stores.redis);
  });
  afterAll(() => stores.close());

  it('pings Postgres', async () => {
    await expect(repo.pingDatabase()).resolves.toBe(true);
  });

  it('pings Redis', async () => {
    await expect(repo.pingRedis()).resolves.toBe(true);
  });
});
