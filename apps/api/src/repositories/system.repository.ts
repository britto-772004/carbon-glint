import { sql } from 'drizzle-orm';
import type { DataStores } from './index.js';

/** REPOSITORY — data access only. Takes and returns models/primitives; no DTOs, no HTTP, no business rules. */
export interface SystemRepository {
  pingDatabase(): Promise<boolean>;
  pingRedis(): Promise<boolean>;
}

export const createSystemRepository = ({ db, redis }: DataStores): SystemRepository => ({
  async pingDatabase() {
    try {
      await db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  },
  async pingRedis() {
    try {
      return (await redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  },
});
