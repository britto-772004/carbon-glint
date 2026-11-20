import { sql } from 'drizzle-orm';
import { createDatabase, type DatabaseHandle } from '../../src/db/client.js';

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

/** Empties every table (keeps schema + migration history). Call in beforeEach for isolation. */
export async function resetDatabase({ db }: DatabaseHandle): Promise<void> {
  await db.execute(sql`
    do $$
    declare r record;
    begin
      for r in select tablename from pg_tables where schemaname = 'public' loop
        execute 'truncate table ' || quote_ident(r.tablename) || ' restart identity cascade';
      end loop;
    end $$;
  `);
}
