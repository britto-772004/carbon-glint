import type { Redis } from '../lib/redis.js';

export interface SessionRecord {
  userId: string;
  role: 'superadmin' | 'admin';
  tenantId: string | null;
  createdAt: number; // epoch ms
}

export interface SessionRepository {
  /** Store a session under its token hash. `idleSeconds` slides on every read; `absoluteSeconds` caps total life. */
  create(tokenHash: string, record: SessionRecord, idleSeconds: number): Promise<void>;
  /** Reads and refreshes the idle TTL. Returns null when missing or past the absolute lifetime. */
  touch(tokenHash: string, idleSeconds: number, absoluteSeconds: number, now?: number): Promise<SessionRecord | null>;
  destroy(tokenHash: string): Promise<void>;
  /** Revoke every session of a user, optionally keeping one. */
  destroyAllForUser(userId: string, exceptTokenHash?: string): Promise<void>;
}

const key = (h: string) => `sess:${h}`;
const userKey = (id: string) => `sess:user:${id}`;

export const createSessionRepository = (redis: Redis): SessionRepository => ({
  async create(tokenHash, record, idleSeconds) {
    await redis
      .multi()
      .set(key(tokenHash), JSON.stringify(record), 'EX', idleSeconds)
      .sadd(userKey(record.userId), tokenHash)
      .expire(userKey(record.userId), 60 * 60 * 24 * 30)
      .exec();
  },

  async touch(tokenHash, idleSeconds, absoluteSeconds, now = Date.now()) {
    const raw = await redis.get(key(tokenHash));
    if (!raw) return null;
    const record = JSON.parse(raw) as SessionRecord;
    if (now - record.createdAt > absoluteSeconds * 1000) {
      await redis.multi().del(key(tokenHash)).srem(userKey(record.userId), tokenHash).exec();
      return null;
    }
    await redis.expire(key(tokenHash), idleSeconds);
    return record;
  },

  async destroy(tokenHash) {
    const raw = await redis.get(key(tokenHash));
    const tx = redis.multi().del(key(tokenHash));
    if (raw) tx.srem(userKey((JSON.parse(raw) as SessionRecord).userId), tokenHash);
    await tx.exec();
  },

  async destroyAllForUser(userId, exceptTokenHash) {
    const hashes = (await redis.smembers(userKey(userId))).filter((h) => h !== exceptTokenHash);
    if (hashes.length === 0) return;
    await redis
      .multi()
      .del(...hashes.map(key))
      .srem(userKey(userId), ...hashes)
      .exec();
  },
});
