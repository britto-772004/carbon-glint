import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../src/repositories/index.js';
import { createTestApp } from '../helpers/app.js';
import { fakeJobQueue, tokenFromEmail } from '../helpers/fakes.js';
import { createTestStores, resetDatabase, resetRedis } from './db.js';

/** End-to-end over real Postgres + Redis: sign up → verify → onboard → invite → accept. */
describe('auth + onboarding flow (real stores)', () => {
  const stores = createTestStores();
  const jobs = fakeJobQueue();
  const t = createTestApp({ repositories: createRepositories(stores), jobs });

  beforeEach(async () => {
    await resetDatabase(stores.database);
    await resetRedis(stores.redis);
  });
  afterAll(() => stores.close());

  it('runs the whole journey', async () => {
    const asha = t.agent();
    await asha
      .post('/api/auth/signup')
      .send({ name: 'Asha', email: 'asha@acme.com', password: 'correct-horse-9' })
      .expect(202);
    await asha
      .post('/api/auth/verify-email')
      .send({ token: tokenFromEmail(jobs.sent('email.send').at(-1)!.text) })
      .expect(200);

    const industries = (await t.api.get('/api/industries').expect(200)).body;
    const tenant = (
      await asha
        .put('/api/tenant/onboarding')
        .send({
          companyName: 'Acme Corp',
          industryId: industries[0].id,
          employeeBand: '1-50',
          businessUnitCount: 2,
          website: 'https://acme.com',
          linkedinUrl: 'https://linkedin.com/company/acme',
        })
        .expect(200)
    ).body;
    expect(tenant).toMatchObject({ name: 'Acme Corp', onboarded: true });

    await asha.post('/api/invitations').send({ email: 'ben@acme.com' }).expect(201);
    const ben = t.agent();
    await ben
      .post('/api/invitations/accept')
      .send({ token: tokenFromEmail(jobs.sent('email.send').at(-1)!.text), name: 'Ben', password: 'correct-horse-9' })
      .expect(200);
    expect((await ben.get('/api/me').expect(200)).body.tenant.name).toBe('Acme Corp');
    expect((await asha.get('/api/users').expect(200)).body).toHaveLength(2);
  });
});
