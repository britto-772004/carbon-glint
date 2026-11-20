import { sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';

/** REPOSITORY — data access only. Takes and returns models/primitives; no DTOs, no HTTP, no business rules. */
export interface SystemRepository {
  ping(): Promise<boolean>;
}

export const createSystemRepository = (db: Database): SystemRepository => ({
  async ping() {
    try {
      await db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  },
});
