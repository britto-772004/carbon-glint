import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.js';
import { onboardedAdmin } from '../../helpers/scenario.js';

type Unit = { id: string; parentId: string | null; code: string; name: string; type: string };

describe('org units HTTP API', () => {
  const setup = async () => {
    const t = createTestApp();
    const { agent } = await onboardedAdmin(t);
    const [hq] = (await agent.get('/api/org-units').expect(200)).body as Unit[];
    return { t, agent, hq: hq! };
  };

  it('onboarding created the HQ root', async () => {
    const { hq } = await setup();
    expect(hq).toMatchObject({ code: 'HQ', type: 'hq', parentId: null, name: 'Acme HQ' });
  });

  it('creates children with location data', async () => {
    const { agent, hq } = await setup();
    const res = await agent
      .post('/api/org-units')
      .send({ parentId: hq.id, name: 'Pune Plant', code: 'PUN-01', type: 'plant', country: 'IN', city: 'Pune' })
      .expect(201);
    expect(res.body).toMatchObject({ parentId: hq.id, country: 'IN', city: 'Pune', active: true });
    expect((await agent.get('/api/org-units').expect(200)).body).toHaveLength(2);
  });

  it('409 for duplicate codes; 400 for bad codes/countries', async () => {
    const { agent } = await setup();
    expect(
      (await agent.post('/api/org-units').send({ name: 'X', code: 'HQ', type: 'office' }).expect(409)).body.code,
    ).toBe('CODE_TAKEN');
    await agent.post('/api/org-units').send({ name: 'X', code: 'has space', type: 'office' }).expect(400);
    await agent.post('/api/org-units').send({ name: 'X', code: 'X1', type: 'office', country: 'India' }).expect(400);
  });

  it('re-parents a subtree but rejects cycles', async () => {
    const { agent, hq } = await setup();
    const a = (await agent.post('/api/org-units').send({ parentId: hq.id, name: 'A', code: 'A', type: 'branch' })).body;
    const a1 = (await agent.post('/api/org-units').send({ parentId: a.id, name: 'A1', code: 'A1', type: 'office' }))
      .body;
    const b = (await agent.post('/api/org-units').send({ parentId: hq.id, name: 'B', code: 'B', type: 'branch' })).body;

    await agent.patch(`/api/org-units/${a.id}`).send({ parentId: b.id }).expect(200);
    const cycle = await agent.patch(`/api/org-units/${b.id}`).send({ parentId: a1.id }).expect(422);
    expect(cycle.body.code).toBe('ORG_UNIT_CYCLE');
    await agent.patch(`/api/org-units/${a.id}`).send({ parentId: a.id }).expect(422);
  });

  it('cannot delete a unit with children; deletes leaves', async () => {
    const { agent, hq } = await setup();
    const leaf = (await agent.post('/api/org-units').send({ parentId: hq.id, name: 'L', code: 'L', type: 'store' }))
      .body;
    expect((await agent.delete(`/api/org-units/${hq.id}`).expect(409)).body.code).toBe('ORG_UNIT_HAS_CHILDREN');
    await agent.delete(`/api/org-units/${leaf.id}`).expect(204);
    await agent.delete(`/api/org-units/${leaf.id}`).expect(404);
  });

  it('is tenant-isolated', async () => {
    const t = createTestApp();
    const acme = await onboardedAdmin(t, 'asha@acme.com');
    const globex = await onboardedAdmin(t, 'hank@globex.com');
    const [acmeHq] = (await acme.agent.get('/api/org-units')).body as Unit[];
    expect((await globex.agent.get('/api/org-units')).body).toHaveLength(1);
    await globex.agent.patch(`/api/org-units/${acmeHq!.id}`).send({ name: 'pwned' }).expect(404);
    await globex.agent
      .post('/api/org-units')
      .send({ parentId: acmeHq!.id, name: 'X', code: 'X', type: 'office' })
      .expect(422);
  });
});
