import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createSystemRepository } from '../../../src/repositories/system.repository.js';
import { createTestDatabase, resetDatabase } from '../db.js';

/** Repository tests: real SQL against real Postgres. One file per repository. */
describe('SystemRepository (Postgres)', () => {
  const database = createTestDatabase();
  const repo = createSystemRepository(database.db);

  beforeEach(() => resetDatabase(database));
  afterAll(() => database.close());

  it('pings the database', async () => {
    await expect(repo.ping()).resolves.toBe(true);
  });
});
