import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import type {
  AuthTokenModel,
  IndustryModel,
  InvitationModel,
  NewTenantModel,
  NewUserModel,
  TenantModel,
  UserModel,
} from '../../src/models/index.js';
import type { Repositories } from '../../src/repositories/index.js';
import type { SessionRecord } from '../../src/repositories/session.repository.js';

/**
 * In-memory implementations of every repository — same contracts as the Postgres/Redis versions,
 * so service and controller tests run fast without infrastructure. Exposes `store` for seeding/assertions.
 */
export interface MemoryStore {
  industries: IndustryModel[];
  tenants: TenantModel[];
  users: UserModel[];
  authTokens: AuthTokenModel[];
  invitations: InvitationModel[];
  sessions: Map<string, { record: SessionRecord; expiresAt: number }>;
  rateCounters: Map<string, { count: number; resetAt: number }>;
}

export const SEED_INDUSTRIES: IndustryModel[] = [
  { id: '11111111-1111-4111-8111-111111111111', code: 'it_software', name: 'IT & software services' },
  { id: '22222222-2222-4222-8222-222222222222', code: 'manufacturing', name: 'Manufacturing' },
];

export function createMemoryStore(): MemoryStore {
  return {
    industries: structuredClone(SEED_INDUSTRIES),
    tenants: [],
    users: [],
    authTokens: [],
    invitations: [],
    sessions: new Map(),
    rateCounters: new Map(),
  };
}

const now = () => new Date();

export function createMemoryRepositories(store: MemoryStore = createMemoryStore()): Repositories & {
  store: MemoryStore;
} {
  const repos: Repositories & { store: MemoryStore } = {
    store,
    system: { pingDatabase: vi.fn(async () => true), pingRedis: vi.fn(async () => true) },

    industries: {
      list: async () => [...store.industries].sort((a, b) => a.name.localeCompare(b.name)),
      findById: async (id) => store.industries.find((i) => i.id === id) ?? null,
    },

    tenants: {
      async findById(id) {
        const tenant = store.tenants.find((t) => t.id === id);
        if (!tenant) return null;
        return { tenant, industry: store.industries.find((i) => i.id === tenant.industryId) ?? null };
      },
      findByDomain: async (domain) => store.tenants.find((t) => t.emailDomain === domain) ?? null,
      async create(data: NewTenantModel) {
        if (store.tenants.some((t) => t.emailDomain === data.emailDomain)) throw new Error('unique violation');
        const row: TenantModel = {
          id: randomUUID(),
          status: 'active',
          industryId: null,
          employeeBand: null,
          businessUnitCount: null,
          website: null,
          linkedinUrl: null,
          onboardedAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as TenantModel;
        store.tenants.push(row);
        return row;
      },
      async update(id, data) {
        const row = store.tenants.find((t) => t.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      async listSummaries({ q, status }) {
        return store.tenants
          .filter((t) => !status || t.status === status)
          .filter((t) => !q || `${t.name} ${t.emailDomain}`.toLowerCase().includes(q.toLowerCase()))
          .map((tenant) => ({
            tenant,
            industry: store.industries.find((i) => i.id === tenant.industryId) ?? null,
            userCount: store.users.filter((u) => u.tenantId === tenant.id).length,
          }));
      },
    },

    users: {
      findById: async (id) => store.users.find((u) => u.id === id) ?? null,
      findByEmail: async (email) => store.users.find((u) => u.email === email) ?? null,
      async create(data: NewUserModel) {
        if (store.users.some((u) => u.email === data.email)) throw new Error('unique violation');
        const row: UserModel = {
          id: randomUUID(),
          tenantId: null,
          role: 'admin',
          status: 'pending',
          emailVerifiedAt: null,
          passwordIsTemporary: false,
          lastLoginAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as UserModel;
        store.users.push(row);
        return row;
      },
      async update(id, data) {
        const row = store.users.find((u) => u.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      listByTenant: async (tenantId) => store.users.filter((u) => u.tenantId === tenantId),
      countActive: async (tenantId, excludeUserId) =>
        store.users.filter((u) => u.tenantId === tenantId && u.status === 'active' && u.id !== excludeUserId).length,
    },

    authTokens: {
      async create(data) {
        const row: AuthTokenModel = { id: randomUUID(), usedAt: null, createdAt: now(), ...data };
        store.authTokens.push(row);
        return row;
      },
      findValid: async (purpose, tokenHash, at = now()) =>
        store.authTokens.find(
          (t) => t.purpose === purpose && t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > at,
        ) ?? null,
      async markUsed(id) {
        const t = store.authTokens.find((x) => x.id === id);
        if (t) t.usedAt = now();
      },
      async deleteForUser(userId, purpose) {
        store.authTokens = store.authTokens.filter((t) => !(t.userId === userId && t.purpose === purpose));
      },
    },

    invitations: {
      async create(data) {
        const row: InvitationModel = { id: randomUUID(), acceptedAt: null, revokedAt: null, createdAt: now(), ...data };
        store.invitations.push(row);
        return row;
      },
      findById: async (tenantId, id) => store.invitations.find((i) => i.tenantId === tenantId && i.id === id) ?? null,
      async findOpenByTokenHash(tokenHash) {
        const invitation = store.invitations.find((i) => i.tokenHash === tokenHash && !i.acceptedAt && !i.revokedAt);
        const tenant = invitation && store.tenants.find((t) => t.id === invitation.tenantId);
        return invitation && tenant ? { invitation, tenant } : null;
      },
      findOpenByEmail: async (tenantId, email) =>
        store.invitations.find((i) => i.tenantId === tenantId && i.email === email && !i.acceptedAt && !i.revokedAt) ??
        null,
      listByTenant: async (tenantId) => store.invitations.filter((i) => i.tenantId === tenantId).reverse(),
      async update(id, data) {
        const row = store.invitations.find((i) => i.id === id);
        if (!row) return null;
        Object.assign(row, data);
        return row;
      },
    },

    sessions: {
      async create(tokenHash, record, idleSeconds) {
        store.sessions.set(tokenHash, { record, expiresAt: Date.now() + idleSeconds * 1000 });
      },
      async touch(tokenHash, idleSeconds, absoluteSeconds, at = Date.now()) {
        const s = store.sessions.get(tokenHash);
        if (!s || s.expiresAt < at || at - s.record.createdAt > absoluteSeconds * 1000) {
          store.sessions.delete(tokenHash);
          return null;
        }
        s.expiresAt = at + idleSeconds * 1000;
        return s.record;
      },
      async destroy(tokenHash) {
        store.sessions.delete(tokenHash);
      },
      async destroyAllForUser(userId, except) {
        for (const [h, s] of store.sessions) if (s.record.userId === userId && h !== except) store.sessions.delete(h);
      },
    },

    rateLimits: {
      async hit(bucket, limit, windowSeconds) {
        const t = Date.now();
        let c = store.rateCounters.get(bucket);
        if (!c || c.resetAt <= t) {
          c = { count: 0, resetAt: t + windowSeconds * 1000 };
          store.rateCounters.set(bucket, c);
        }
        c.count += 1;
        return { allowed: c.count <= limit, retryAfterSeconds: Math.ceil((c.resetAt - t) / 1000) };
      },
      async reset(bucket) {
        store.rateCounters.delete(bucket);
      },
    },

    // No real atomicity in memory; good enough for unit tests (Postgres transactions are covered by integration tests).
    transaction: (fn) => fn(repos),
  };
  return repos;
}
