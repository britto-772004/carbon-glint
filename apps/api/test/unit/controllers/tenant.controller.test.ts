import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.js';
import { SEED_INDUSTRIES } from '../../helpers/memory-repositories.js';
import { signedInAdmin } from '../../helpers/scenario.js';

const onboarding = {
  companyName: 'Acme Industries',
  industryId: SEED_INDUSTRIES[0]!.id,
  employeeBand: '51-250',
  businessUnitCount: 4,
  website: 'https://acme.com',
  linkedinUrl: 'https://www.linkedin.com/company/acme/',
};

describe('tenant + onboarding HTTP API', () => {
  it('lists industries publicly', async () => {
    const res = await createTestApp().api.get('/api/industries').expect(200);
    expect(res.body.map((i: { code: string }) => i.code)).toEqual(['it_software', 'manufacturing']);
  });

  it('completes onboarding once, then 409', async () => {
    const t = createTestApp();
    const { agent } = await signedInAdmin(t);
    const res = await agent.put('/api/tenant/onboarding').send(onboarding).expect(200);
    expect(res.body).toMatchObject({ name: 'Acme Industries', onboarded: true, industry: { code: 'it_software' } });
    expect((await agent.get('/api/me').expect(200)).body.tenant.onboarded).toBe(true);
    const again = await agent.put('/api/tenant/onboarding').send(onboarding).expect(409);
    expect(again.body.code).toBe('ALREADY_ONBOARDED');
  });

  it.each([
    ['linkedinUrl', 'https://example.com/acme'],
    ['website', 'ftp://acme.com'],
    ['businessUnitCount', 0],
    ['employeeBand', '10-20'],
  ])('400 for invalid %s', async (field, value) => {
    const t = createTestApp();
    const { agent } = await signedInAdmin(t);
    await agent
      .put('/api/tenant/onboarding')
      .send({ ...onboarding, [field]: value })
      .expect(400);
  });

  it('422 for an unknown industry', async () => {
    const t = createTestApp();
    const { agent } = await signedInAdmin(t);
    const res = await agent
      .put('/api/tenant/onboarding')
      .send({ ...onboarding, industryId: '00000000-0000-4000-8000-000000000000' })
      .expect(422);
    expect(res.body.code).toBe('UNKNOWN_INDUSTRY');
  });
});
