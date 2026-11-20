import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.js';
import { fakeRepositories } from '../../helpers/fakes.js';
import { signedInAdmin, signedInSuperAdmin } from '../../helpers/scenario.js';

describe('platform (super admin) HTTP API', () => {
  it('super admin lists and searches tenants with user counts', async () => {
    const repositories = fakeRepositories();
    const t = createTestApp({ repositories });
    await signedInAdmin(t, 'asha@acme.com');
    await signedInAdmin(t, 'hank@globex.com', 'Hank');
    const ops = await signedInSuperAdmin(t, repositories.store);

    const all = (await ops.get('/api/platform/tenants').expect(200)).body;
    expect(all.map((x: { emailDomain: string }) => x.emailDomain).sort()).toEqual(['acme.com', 'globex.com']);
    expect(all[0].userCount).toBe(1);
    const found = (await ops.get('/api/platform/tenants?q=glob').expect(200)).body;
    expect(found).toHaveLength(1);
  });

  it('disabling a tenant signs its users out and blocks sign-in', async () => {
    const repositories = fakeRepositories();
    const t = createTestApp({ repositories });
    const acme = await signedInAdmin(t);
    const ops = await signedInSuperAdmin(t, repositories.store);

    const detail = (await ops.get(`/api/platform/tenants/${acme.me.tenant.id}`).expect(200)).body;
    expect(detail.users).toHaveLength(1);
    await ops.patch(`/api/platform/tenants/${acme.me.tenant.id}`).send({ status: 'disabled' }).expect(200);
    await acme.agent.get('/api/me').expect(401);
  });

  it('403 for company admins; 403 for super admin on tenant-only routes', async () => {
    const repositories = fakeRepositories();
    const t = createTestApp({ repositories });
    const acme = await signedInAdmin(t);
    await acme.agent.get('/api/platform/tenants').expect(403);
    const ops = await signedInSuperAdmin(t, repositories.store);
    await ops.get('/api/users').expect(403);
    await ops.get('/api/me').expect(200);
  });

  it('resend verification only for pending users', async () => {
    const repositories = fakeRepositories();
    const t = createTestApp({ repositories });
    await t.api.post('/api/auth/signup').send({ name: 'P', email: 'p@pending.io', password: 'correct-horse-9' });
    const ops = await signedInSuperAdmin(t, repositories.store);
    const pending = repositories.store.users.find((u) => u.email === 'p@pending.io')!;
    await ops.post(`/api/platform/users/${pending.id}/resend-verification`).expect(202);
    const admin = repositories.store.users.find((u) => u.role === 'superadmin')!;
    await ops.post(`/api/platform/users/${admin.id}/resend-verification`).expect(409);
  });
});
