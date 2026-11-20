import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as models from '../models/index.js';

export type Database = NodePgDatabase<typeof models>;
/** A transaction handle — same query API as Database. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** What repositories run queries on: the pool or an open transaction. */
export type DbExecutor = Database | Transaction;

export interface DatabaseHandle {
  db: Database;
  close(): Promise<void>;
}

/** node-postgres pool sized for the 1 GB VM (Postgres max_connections = 30). */
export function createDatabase(connectionString: string): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return { db: drizzle(pool, { schema: models, casing: 'snake_case' }), close: () => pool.end() };
}
