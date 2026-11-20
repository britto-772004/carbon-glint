import type { Database, DbExecutor } from '../db/client.js';
import type { Redis } from '../lib/redis.js';
import { createAuthTokenRepository, type AuthTokenRepository } from './auth-token.repository.js';
import { createIndustryRepository, type IndustryRepository } from './industry.repository.js';
import { createInvitationRepository, type InvitationRepository } from './invitation.repository.js';
import { createRateLimitRepository, type RateLimitRepository } from './rate-limit.repository.js';
import { createSessionRepository, type SessionRepository } from './session.repository.js';
import { createSystemRepository, type SystemRepository } from './system.repository.js';
import { createTenantRepository, type TenantRepository } from './tenant.repository.js';
import { createUserRepository, type UserRepository } from './user.repository.js';

export interface DataStores {
  db: Database;
  redis: Redis;
}

export interface Repositories {
  system: SystemRepository;
  industries: IndustryRepository;
  tenants: TenantRepository;
  users: UserRepository;
  authTokens: AuthTokenRepository;
  invitations: InvitationRepository;
  sessions: SessionRepository;
  rateLimits: RateLimitRepository;
  /** Run `fn` in one database transaction; the repositories passed to it all use that transaction. */
  transaction<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
}

const build = (db: DbExecutor, stores: DataStores): Repositories => ({
  system: createSystemRepository(stores),
  industries: createIndustryRepository(db),
  tenants: createTenantRepository(db),
  users: createUserRepository(db),
  authTokens: createAuthTokenRepository(db),
  invitations: createInvitationRepository(db),
  sessions: createSessionRepository(stores.redis),
  rateLimits: createRateLimitRepository(stores.redis),
  transaction: (fn) => stores.db.transaction((tx) => fn(build(tx, stores))),
});

export const createRepositories = (stores: DataStores): Repositories => build(stores.db, stores);
