import { buildActivityTemplateCsv } from '../../src/lib/activity-template.js';
import { createTestApp } from './app.js';
import { TEST_DATASET } from './ef-fixtures.js';
import { fakeAi } from './fakes.js';
import { SEED_CATEGORIES } from './memory-repositories.js';
import { onboardedAdmin } from './scenario.js';

export const TEMPLATE_MAPPING = {
  description: 'Activity Description',
  measure: 'Measure',
  unit: 'Unit',
  location: 'Location',
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  spend: 'Spend',
  currency: 'Currency',
};

/** Runs queued jobs synchronously (what the worker does). */
export const drainJobs = async (t: ReturnType<typeof createTestApp>) => {
  while (t.jobs.enqueued.length) {
    const job = t.jobs.enqueued.shift()!;
    if (job.name === 'datasource.import') await t.services.dataSources.runImport(job.payload as never);
    if (job.name === 'calculation.run') await t.services.calculations.run(job.payload as never);
    if (job.name === 'report.generate') await t.services.reports.generate(job.payload as never);
  }
};

/** Onboarded tenant with HQ/PUN/DXB, the template uploaded, imported, published and calculated. */
export async function publishedScenario(ai = fakeAi()) {
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
  await agent
    .post(`/api/data-sources/${ds.id}/import`)
    .send({ mapping: TEMPLATE_MAPPING, mappingMode: 'manual' })
    .expect(202);
  await drainJobs(t);
  await agent.post(`/api/activity-definitions/${ad.id}/publish`).expect(200);
  await drainJobs(t);
  return { t, agent, ad, hqId: hq!.id };
}
