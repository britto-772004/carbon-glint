import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/repositories/index.js';
import { createTestStores, resetDatabase, resetRedis } from '../db.js';

/** Tenant / user / token / invitation / session / rate-limit repositories against real Postgres + Redis. */
describe('identity repositories (Postgres + Redis)', () => {
  const stores = createTestStores();
  const repos = createRepositories(stores);

  beforeEach(async () => {
    await resetDatabase(stores.database);
    await resetRedis(stores.redis);
  });
  afterAll(() => stores.close());

  const seedTenantUser = async (domain = 'acme.com') => {
    const tenant = await repos.tenants.create({ name: 'Acme', emailDomain: domain });
    const user = await repos.users.create({
      tenantId: tenant.id,
      email: `asha@${domain}`,
      name: 'Asha',
      passwordHash: 'x',
    });
    return { tenant, user };
  };

  it('industries are seeded by migration and survive resets', async () => {
    const list = await repos.industries.list();
    expect(list.length).toBeGreaterThanOrEqual(18);
    expect(list.map((i) => i.code)).toContain('higher_education');
  });

  it('tenants: unique domain, update, summaries with user counts and search', async () => {
    const { tenant } = await seedTenantUser();
    await expect(repos.tenants.create({ name: 'Dup', emailDomain: 'acme.com' })).rejects.toThrow();
    const industry = (await repos.industries.list())[0]!;
    await repos.tenants.update(tenant.id, { industryId: industry.id, onboardedAt: new Date() });
    expect((await repos.tenants.findById(tenant.id))?.industry?.id).toBe(industry.id);

    await seedTenantUser('globex.com');
    const all = await repos.tenants.listSummaries({});
    expect(all.map((r) => r.userCount)).toEqual([1, 1]);
    expect(await repos.tenants.listSummaries({ q: 'GLOB' })).toHaveLength(1);
    expect(await repos.tenants.listSummaries({ status: 'disabled' })).toHaveLength(0);
  });

  it('users: DB check keeps super admins tenant-less and admins in a tenant', async () => {
    await expect(
      repos.users.create({ email: 'x@y.io', name: 'X', passwordHash: 'x', role: 'admin', tenantId: null }),
    ).rejects.toThrow();
    const { tenant } = await seedTenantUser();
    await expect(
      repos.users.create({ email: 'o@y.io', name: 'O', passwordHash: 'x', role: 'superadmin', tenantId: tenant.id }),
    ).rejects.toThrow();
    await repos.users.create({ email: 'ops@y.io', name: 'Ops', passwordHash: 'x', role: 'superadmin' });
  });

  it('users: countActive excludes pending/disabled and the excluded id', async () => {
    const { tenant, user } = await seedTenantUser();
    expect(await repos.users.countActive(tenant.id)).toBe(0);
    await repos.users.update(user.id, { status: 'active' });
    expect(await repos.users.countActive(tenant.id)).toBe(1);
    expect(await repos.users.countActive(tenant.id, user.id)).toBe(0);
  });

  it('auth tokens: only unused, unexpired tokens are valid', async () => {
    const { user } = await seedTenantUser();
    const tok = await repos.authTokens.create({
      userId: user.id,
      purpose: 'verify_email',
      tokenHash: 'h1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await repos.authTokens.findValid('verify_email', 'h1')).not.toBeNull();
    expect(await repos.authTokens.findValid('verify_email', 'h1', new Date(Date.now() + 120_000))).toBeNull();
    await repos.authTokens.markUsed(tok.id);
    expect(await repos.authTokens.findValid('verify_email', 'h1')).toBeNull();
  });

  it('invitations: open lookup by token/email, revoke', async () => {
    const { tenant, user } = await seedTenantUser();
    const inv = await repos.invitations.create({
      tenantId: tenant.id,
      email: 'ben@acme.com',
      tokenHash: 'inv1',
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect((await repos.invitations.findOpenByTokenHash('inv1'))?.tenant.id).toBe(tenant.id);
    expect(await repos.invitations.findOpenByEmail(tenant.id, 'ben@acme.com')).not.toBeNull();
    await repos.invitations.update(inv.id, { revokedAt: new Date() });
    expect(await repos.invitations.findOpenByTokenHash('inv1')).toBeNull();
    expect(await repos.invitations.listByTenant(tenant.id)).toHaveLength(1);
  });

  it('transactions roll back every repository write on error', async () => {
    await expect(
      repos.transaction(async (tx) => {
        await tx.tenants.create({ name: 'Rollback', emailDomain: 'rollback.io' });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await repos.tenants.findByDomain('rollback.io')).toBeNull();
  });

  it('sessions: sliding idle TTL, absolute lifetime, revoke all except one', async () => {
    const rec = { userId: 'u1', role: 'admin' as const, tenantId: 't1', createdAt: Date.now() };
    await repos.sessions.create('s1', rec, 60);
    await repos.sessions.create('s2', rec, 60);
    expect(await repos.sessions.touch('s1', 60, 3600)).toMatchObject({ userId: 'u1' });
    expect(await stores.redis.ttl('sess:s1')).toBeGreaterThan(50);
    expect(await repos.sessions.touch('s1', 60, 3600, Date.now() + 3601_000)).toBeNull(); // past absolute
    await repos.sessions.destroyAllForUser('u1', 's2');
    expect(await repos.sessions.touch('s2', 60, 3600)).not.toBeNull();
  });

  it('rate limits: fixed window counter with retry-after', async () => {
    for (let i = 0; i < 3; i++) expect((await repos.rateLimits.hit('b', 3, 60)).allowed).toBe(true);
    const blocked = await repos.rateLimits.hit('b', 3, 60);
    expect(blocked).toMatchObject({ allowed: false });
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    await repos.rateLimits.reset('b');
    expect((await repos.rateLimits.hit('b', 3, 60)).allowed).toBe(true);
  });
});
