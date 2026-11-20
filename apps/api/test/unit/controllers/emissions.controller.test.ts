import { describe, expect, it } from 'vitest';
import { buildActivityTemplateCsv, TEMPLATE_ROWS } from '../../../src/lib/activity-template.js';
import { createTestApp } from '../../helpers/app.js';
import { TEST_DATASET } from '../../helpers/ef-fixtures.js';
import { fakeAi } from '../../helpers/fakes.js';
import { SEED_CATEGORIES } from '../../helpers/memory-repositories.js';
import { onboardedAdmin } from '../../helpers/scenario.js';

const MAPPING = {
  description: 'Activity Description',
  measure: 'Measure',
  unit: 'Unit',
  location: 'Location',
  orgUnit: 'Business Unit',
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  spend: 'Spend',
  currency: 'Currency',
};

/** Runs queued jobs synchronously, like the worker. */
const drain = async (t: ReturnType<typeof createTestApp>) => {
  while (t.jobs.enqueued.length) {
    const job = t.jobs.enqueued.shift()!;
    if (job.name === 'datasource.import') await t.services.dataSources.runImport(job.payload as never);
    if (job.name === 'calculation.run') await t.services.calculations.run(job.payload as never);
  }
};

const setup = async (ai = fakeAi()) => {
  const t = createTestApp({ ai });
  await t.repositories.emissionFactors.importDataset(TEST_DATASET);
  const { agent } = await onboardedAdmin(t);
  const [hq] = (await agent.get('/api/org-units')).body as Array<{ id: string }>;
  for (const [code, country] of [
    ['PUN', 'IN'],
    ['DXB', 'AE'],
  ]) {
    await agent
      .post('/api/org-units')
      .send({ parentId: hq!.id, name: code, code, type: 'branch', country })
      .expect(201);
  }
  const ad = (
    await agent.post('/api/activity-definitions').send({
      name: 'Q1 ops',
      scope: 1,
      categoryId: SEED_CATEGORIES[0]!.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    })
  ).body;
  const ds = (
    await agent
      .post(`/api/activity-definitions/${ad.id}/data-sources`)
      .attach('file', Buffer.from(buildActivityTemplateCsv()), 'q1.csv')
  ).body;
  await agent.post(`/api/data-sources/${ds.id}/import`).send({ mapping: MAPPING, mappingMode: 'manual' }).expect(202);
  await drain(t);
  await agent.post(`/api/activity-definitions/${ad.id}/publish`).expect(200);
  await drain(t);
  return { t, agent, ad, hqId: hq!.id };
};

describe('emission factor library API', () => {
  it('lists sources and searches unit-compatible factors', async () => {
    const { agent } = await setup();
    expect((await agent.get('/api/emission-factors/sources').expect(200)).body[0]).toMatchObject({
      code: 'TEST_2026',
      factorCount: 5,
    });
    const hits = (await agent.get('/api/emission-factors/search?q=diesel&unit=gal_us').expect(200)).body;
    expect(hits[0].factor).toMatchObject({ unit: 'L', co2ePerUnit: 2.5, sourceCode: 'TEST_2026' });
    const none = (await agent.get('/api/emission-factors/search?q=diesel&unit=kWh').expect(200)).body;
    expect(none.find((h: { factor: { name: string } }) => h.factor.name.includes('Diesel'))).toBeUndefined();
  });
});

describe('calculation + emissions API', () => {
  it('publishing calculates CO2e = measure × conversion × factor with a full trace', async () => {
    const { agent } = await setup();
    const page = (await agent.get('/api/emissions?limit=50').expect(200)).body;
    expect(page.total).toBe(TEMPLATE_ROWS.length);
    const diesel = page.items.find((r: { description: string }) => r.description.startsWith('Diesel'));
    expect(diesel).toMatchObject({
      measure: 1200,
      unit: 'L',
      co2eKg: 3000,
      method: 'search',
      factor: { co2ePerUnit: 2.5 },
    });

    const trace = (await agent.get(`/api/emissions/${diesel.activityId}/trace`).expect(200)).body;
    expect(trace.trace).toMatchObject({
      input: { measure: 1200, unit: 'L', rowNumber: 3 },
      conversion: { from: 'L', to: 'L', factor: 1 },
      factor: { sourceCode: 'TEST_2026', gases: { co2: 2.45 } },
      result: { co2eKg: 3000 },
      classification: { scope: 1 },
    });
    expect(Array.isArray(trace.trace.match.alternatives)).toBe(true);
  });

  it('uses Gemini to choose among candidates (never inventing a factor)', async () => {
    const ai = fakeAi('', null);
    ai.generateJson.mockImplementation(async (prompt = '') => {
      const ids = [...prompt.matchAll(/^([0-9a-f-]{36}) \|/gm)].map((m) => m[1]);
      return { factorId: ids[0] ?? null, confidence: 0.93, rationale: 'Best fuel match.' };
    });
    Object.assign(ai, { available: true });
    const { agent } = await setup(ai);
    const page = (await agent.get('/api/emissions?limit=50').expect(200)).body;
    const diesel = page.items.find((r: { description: string }) => r.description.startsWith('Diesel'));
    expect(diesel).toMatchObject({ method: 'ai', confidence: 0.93, status: 'matched' });
  });

  it('marks activities without a compatible factor as unmatched', async () => {
    const { agent } = await setup();
    const unmatched = (await agent.get('/api/emissions?status=unmatched&limit=50').expect(200)).body;
    expect(unmatched.items.map((r: { unit: string }) => r.unit)).toContain('room.night'); // no hotel factor in the test set
    expect(unmatched.items.every((r: { co2eKg: number }) => r.co2eKg === 0)).toBe(true);
  });

  it('summary, heatmap (pro-rated months) and BU roll-up agree with the rows', async () => {
    const { agent, hqId } = await setup();
    const rows = (await agent.get('/api/emissions?limit=500').expect(200)).body;
    const summary = (await agent.get('/api/emissions/summary').expect(200)).body;
    expect(summary.co2eKg.total).toBeCloseTo(rows.totalCo2eKg, 3);
    expect(summary.co2eKg['1']).toBeCloseTo(rows.totalCo2eKg, 3); // AD is Scope 1
    expect(summary.orgUnitCount).toBe(3);

    const hm = (await agent.get('/api/emissions/heatmap?groupBy=activityDefinition&bucket=month').expect(200)).body;
    expect(hm.columns).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(hm.total).toBeCloseTo(rows.totalCo2eKg, 2);
    expect(hm.rows[0].label).toBe('Q1 ops');

    const tree = (await agent.get('/api/emissions/org-tree').expect(200)).body;
    const hq = tree.find((n: { orgUnitId: string }) => n.orgUnitId === hqId);
    expect(hq.rollup.total).toBeCloseTo(rows.totalCo2eKg, 3);

    const pun = tree.find((n: { code: string }) => n.code === 'PUN');
    const punOnly = (await agent.get(`/api/emissions/summary?orgUnitId=${pun.orgUnitId}`).expect(200)).body;
    expect(punOnly.co2eKg.total).toBeCloseTo(pun.rollup.total, 3);
  });

  it('overrides with a library factor, a custom factor or a custom result; revert recalculates', async () => {
    const { agent } = await setup();
    const rows = (await agent.get('/api/emissions?limit=50')).body.items as Array<{
      activityId: string;
      description: string;
    }>;
    const diesel = rows.find((r) => r.description.startsWith('Diesel'))!;
    const petrol = (await agent.get('/api/emission-factors/search?q=petrol&unit=L')).body[0].factor;

    const o1 = (
      await agent
        .post(`/api/emissions/${diesel.activityId}/override`)
        .send({ type: 'factor', factorId: petrol.id, reason: 'Supplier confirms petrol gensets' })
        .expect(200)
    ).body;
    expect(o1).toMatchObject({ status: 'overridden', method: 'override', co2eKg: 2520 });

    const o2 = (
      await agent
        .post(`/api/emissions/${diesel.activityId}/override`)
        .send({ type: 'custom_factor', value: 3, unit: 'kL', reason: 'Lab test' })
        .expect(200)
    ).body;
    expect(o2.co2eKg).toBeCloseTo(3.6); // 1200 L = 1.2 kL × 3

    const o3 = (
      await agent
        .post(`/api/emissions/${diesel.activityId}/override`)
        .send({ type: 'custom_result', value: 42, reason: 'Audited' })
        .expect(200)
    ).body;
    expect(o3.co2eKg).toBe(42);

    const bad = await agent
      .post(`/api/emissions/${diesel.activityId}/override`)
      .send({ type: 'custom_factor', value: 1, unit: 'kWh', reason: 'x y z' })
      .expect(422);
    expect(bad.body.code).toBe('UNIT_INCOMPATIBLE');
    await agent
      .post(`/api/emissions/${diesel.activityId}/override`)
      .send({ type: 'factor', reason: 'none given' })
      .expect(422);

    const trace = (await agent.get(`/api/emissions/${diesel.activityId}/trace`)).body;
    expect(trace.overrides).toHaveLength(3);
    expect(trace.trace.override).toMatchObject({ type: 'custom_result', reason: 'Audited' });

    const reverted = (await agent.delete(`/api/emissions/${diesel.activityId}/override`).expect(200)).body;
    expect(reverted).toMatchObject({ status: 'matched', co2eKg: 3000 });
    expect(
      (await agent.get(`/api/emissions/${diesel.activityId}/trace`)).body.overrides.every(
        (o: { revertedAt: string | null }) => o.revertedAt,
      ),
    ).toBe(true);
  });

  it('bulk override applies one factor to many activities', async () => {
    const { agent } = await setup();
    const rows = (await agent.get('/api/emissions?status=matched&limit=50')).body.items as Array<{
      activityId: string;
      unit: string;
    }>;
    const litres = rows.filter((r) => r.unit === 'L').map((r) => r.activityId);
    const petrol = (await agent.get('/api/emission-factors/search?q=petrol&unit=L')).body[0].factor;
    const out = (
      await agent
        .post('/api/emissions/bulk-override')
        .send({ activityIds: litres, factorId: petrol.id, reason: 'Policy' })
        .expect(200)
    ).body;
    expect(out).toHaveLength(litres.length);
    expect(out.every((r: { status: string }) => r.status === 'overridden')).toBe(true);
  });

  it('is tenant-isolated', async () => {
    const { t, agent } = await setup();
    const row = (await agent.get('/api/emissions?limit=1')).body.items[0];
    const other = await onboardedAdmin(t, 'hank@globex.com');
    expect((await other.agent.get('/api/emissions').expect(200)).body.total).toBe(0);
    await other.agent.get(`/api/emissions/${row.activityId}/trace`).expect(404);
    await other.agent
      .post(`/api/emissions/${row.activityId}/override`)
      .send({ type: 'custom_result', value: 1, reason: 'pwn' })
      .expect(404);
  });
});
