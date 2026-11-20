import { sql } from 'drizzle-orm';
import { createDatabase, type DatabaseHandle } from '../../src/db/client.js';
import { createRedis, type Redis } from '../../src/lib/redis.js';
import type { DataStores } from '../../src/repositories/index.js';

/** Redis DB 15 so integration tests never touch dev data in DB 0. */
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379/15';

/** Local docker Postgres by default; CI provides its own. Never point this at Neon. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://carbon:carbon@localhost:5432/carbon_glint_test';

/** Safety rail: integration tests truncate tables, so the DB name must end in `_test`. */
export function assertTestDatabase(url: URL): string {
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against "${name}" — database name must end with _test`);
  }
  return name;
}

export function createTestDatabase(): DatabaseHandle {
  assertTestDatabase(new URL(TEST_DATABASE_URL));
  return createDatabase(TEST_DATABASE_URL);
}

/** Reference data seeded by migrations — never truncated. */
export const REFERENCE_TABLES = ['industries'];

/** Empties every tenant-data table (keeps schema, migrations and reference data). Call in beforeEach. */
export async function resetDatabase({ db }: DatabaseHandle): Promise<void> {
  await db.execute(sql`
    do $$
    declare r record;
    begin
      for r in select tablename from pg_tables
               where schemaname = 'public' and tablename <> all (${sql.raw(`array['${REFERENCE_TABLES.join("','")}']`)}) loop
        execute 'truncate table ' || quote_ident(r.tablename) || ' restart identity cascade';
      end loop;
    end $$;
  `);
}

export interface TestStores extends DataStores {
  database: DatabaseHandle;
  redis: Redis;
  close(): Promise<void>;
}

/** Real Postgres (`*_test`) + real Redis (DB 15) for repository and end-to-end tests. */
export function createTestStores(): TestStores {
  const database = createTestDatabase();
  const redis = createRedis(TEST_REDIS_URL);
  return {
    database,
    db: database.db,
    redis,
    close: async () => {
      await Promise.allSettled([database.close(), redis.quit()]);
    },
  };
}

/** Empties the test Redis DB. Call in beforeEach when a test writes to Redis. */
export const resetRedis = async (redis: Redis) => {
  await redis.flushdb();
};
