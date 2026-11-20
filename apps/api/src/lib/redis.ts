import { Redis } from 'ioredis';

/** Shared Redis connection (sessions, rate limits, cache). BullMQ opens its own connections from the URL. */
export function createRedis(url: string): Redis {
  return new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: false });
}

/** BullMQ connection options parsed from a redis:// URL. */
export function bullConnection(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null, // required by BullMQ workers
  };
}

export type { Redis };
