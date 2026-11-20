import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as models from '../models/index.js';

export type Database = NodePgDatabase<typeof models>;

export interface DatabaseHandle {
  db: Database;
  close(): Promise<void>;
}

/** Works for local Postgres and Neon (use the pooled Neon URL with `sslmode=require`). */
export function createDatabase(connectionString: string): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return { db: drizzle(pool, { schema: models }), close: () => pool.end() };
}
