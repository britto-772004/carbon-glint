import { hashPassword } from '../../src/lib/password.js';
import type { MemoryStore } from './memory-repositories.js';
import { tokenFromEmail } from './fakes.js';
import type { createTestApp } from './app.js';

type TestApp = ReturnType<typeof createTestApp>;
export const PASSWORD = 'correct-horse-9';

/** Signs up + verifies an admin through the real HTTP API; returns a cookie-carrying agent. */
export async function signedInAdmin(t: TestApp, email = 'asha@acme.com', name = 'Asha Rao') {
  const agent = t.agent();
  await agent.post('/api/auth/signup').send({ name, email, password: PASSWORD }).expect(202);
  const mail = t.jobs
    .sent('email.send')
    .filter((m) => m.to === email)
    .at(-1)!;
  const res = await agent
    .post('/api/auth/verify-email')
    .send({ token: tokenFromEmail(mail.text) })
    .expect(200);
  return { agent, me: res.body as { user: { id: string }; tenant: { id: string } } };
}

/** Inserts the global super admin directly (as the seed script would) and signs in. */
export async function signedInSuperAdmin(t: TestApp, store: MemoryStore): Promise<ReturnType<TestApp['agent']>> {
  store.users.push({
    id: '99999999-9999-4999-8999-999999999999',
    tenantId: null,
    email: 'ops@carbonglint.app',
    name: 'Ops',
    passwordHash: await hashPassword(PASSWORD),
    role: 'superadmin',
    status: 'active',
    emailVerifiedAt: new Date(),
    passwordIsTemporary: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const agent = t.agent();
  await agent.post('/api/auth/login').send({ email: 'ops@carbonglint.app', password: PASSWORD }).expect(200);
  return agent;
}

/** Signed-in admin whose company has finished onboarding (so an HQ org unit exists). */
export async function onboardedAdmin(t: TestApp, email = 'asha@acme.com') {
  const s = await signedInAdmin(t, email);
  const industries = (await t.api.get('/api/industries').expect(200)).body as Array<{ id: string }>;
  await s.agent
    .put('/api/tenant/onboarding')
    .send({
      companyName: 'Acme',
      industryId: industries[0]!.id,
      employeeBand: '51-250',
      businessUnitCount: 3,
      website: 'https://acme.com',
      linkedinUrl: 'https://www.linkedin.com/company/acme',
    })
    .expect(200);
  return s;
}
