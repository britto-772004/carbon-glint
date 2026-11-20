import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';

/** Applies Drizzle SQL migrations from ../drizzle. Run by the deploy script before switching releases. */
const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

const config = loadConfig();
if (!existsSync(`${MIGRATIONS_DIR}/meta/_journal.json`)) {
  console.log('No migrations to apply.');
  process.exit(0);
}

const database = createDatabase(config.DATABASE_URL);
try {
  await migrate(database.db, { migrationsFolder: MIGRATIONS_DIR });
  console.log('Migrations applied.');
} finally {
  await database.close();
}
