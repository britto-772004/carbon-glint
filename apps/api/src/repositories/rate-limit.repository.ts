import type { Redis } from '../lib/redis.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitRepository {
  /** Fixed-window counter: counts this hit and reports whether it is within `limit` per `windowSeconds`. */
  hit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(bucket: string): Promise<void>;
}

export const createRateLimitRepository = (redis: Redis): RateLimitRepository => ({
  async hit(bucket, limit, windowSeconds) {
    const k = `rl:${bucket}`;
    const [[, countRaw], [, ttlRaw]] = (await redis.multi().incr(k).ttl(k).exec()) as [[null, number], [null, number]];
    let ttl = ttlRaw;
    if (ttl < 0) {
      await redis.expire(k, windowSeconds);
      ttl = windowSeconds;
    }
    return { allowed: countRaw <= limit, retryAfterSeconds: ttl };
  },
  async reset(bucket) {
    await redis.del(`rl:${bucket}`);
  },
});
