import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { TEST_DATABASE_URL, assertTestDatabase } from './db.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Creates the throwaway test database if needed and applies all Drizzle migrations once per run. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = assertTestDatabase(url);

  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
  await admin.connect();
  const { rowCount } = await admin.query('select 1 from pg_database where datname = $1', [dbName]);
  if (!rowCount) await admin.query(`create database "${dbName}"`);
  await admin.end();

  if (existsSync(`${MIGRATIONS_DIR}/meta/_journal.json`)) {
    const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
    await pool.end();
  }
}
