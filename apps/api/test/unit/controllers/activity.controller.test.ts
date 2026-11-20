import { describe, expect, it } from 'vitest';
import {
  buildActivityTemplateCsv,
  buildActivityTemplateXlsx,
  TEMPLATE_ROWS,
} from '../../../src/lib/activity-template.js';
import { createTestApp } from '../../helpers/app.js';
import { fakeAi } from '../../helpers/fakes.js';
import { SEED_CATEGORIES } from '../../helpers/memory-repositories.js';
import { onboardedAdmin } from '../../helpers/scenario.js';

const ELECTRICITY = SEED_CATEGORIES[3]!;
const TRAVEL = SEED_CATEGORIES[4]!;
const MAPPING = {
  description: 'Activity Description',
  measure: 'Measure',
  unit: 'Unit',
  location: 'Location',
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  spend: 'Spend',
  currency: 'Currency',
};

/** Runs queued datasource.import jobs synchronously (what the worker would do). */
const drainImports = async (t: ReturnType<typeof createTestApp>) => {
  for (const job of t.jobs.enqueued.splice(0)) {
    if (job.name === 'datasource.import') await t.services.dataSources.runImport(job.payload as never);
  }
};

const setup = async (ai = fakeAi()) => {
  const t = createTestApp({ ai });
  const { agent } = await onboardedAdmin(t);
  const [hq] = (await agent.get('/api/org-units')).body as Array<{ id: string }>;
  // org units referenced by the template
  for (const code of ['PUN', 'DXB']) {
    await agent.post('/api/org-units').send({ parentId: hq!.id, name: code, code, type: 'branch' }).expect(201);
  }
  const ad = (
    await agent
      .post('/api/activity-definitions')
      .send({
        name: 'Q1 operations',
        scope: 2,
        categoryId: ELECTRICITY.id,
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        defaultOrgUnitId: hq!.id,
      })
      .expect(201)
  ).body;
  return { t, agent, ad, hqId: hq!.id };
};

describe('GHG taxonomy', () => {
  it('lists categories with industry recommendations first per scope', async () => {
    const { agent } = await setup();
    const s3 = (await agent.get('/api/ghg-categories?scope=3').expect(200)).body;
    expect(s3.map((c: { code: string; recommended: boolean }) => [c.code, c.recommended])).toEqual([
      ['S3_C6', true],
      ['S3_C7', true],
    ]);
    const all = (await agent.get('/api/ghg-categories').expect(200)).body;
    expect(all[0]).toMatchObject({ scope: 1 });
  });

  it('adds tenant-scoped custom categories (409 on duplicates)', async () => {
    const { t, agent } = await setup();
    const c = (await agent.post('/api/ghg-categories').send({ scope: 3, name: 'Data centre colocation' }).expect(201))
      .body;
    expect(c).toMatchObject({ custom: true, recommended: false, code: 'S3_CUSTOM_DATA_CENTRE_COLOCATION' });
    await agent.post('/api/ghg-categories').send({ scope: 3, name: 'Data centre colocation' }).expect(409);
    const other = await onboardedAdmin(t, 'hank@globex.com');
    const theirs = (await other.agent.get('/api/ghg-categories?scope=3')).body;
    expect(theirs.some((x: { id: string }) => x.id === c.id)).toBe(false);
  });
});

describe('Activity Definitions', () => {
  it('rejects a category from another scope and inverted periods', async () => {
    const { agent } = await setup();
    const base = {
      name: 'X',
      scope: 1,
      categoryId: ELECTRICITY.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    };
    expect((await agent.post('/api/activity-definitions').send(base).expect(422)).body.code).toBe('SCOPE_MISMATCH');
    expect(
      (
        await agent
          .post('/api/activity-definitions')
          .send({ ...base, scope: 2, periodEnd: '2025-01-01' })
          .expect(422)
      ).body.code,
    ).toBe('INVALID_PERIOD');
  });

  it('can’t publish without activities', async () => {
    const { agent, ad } = await setup();
    expect((await agent.post(`/api/activity-definitions/${ad.id}/publish`).expect(422)).body.code).toBe(
      'NO_ACTIVITIES',
    );
  });
});

describe('data source upload → mapping → import', () => {
  it('uploads the XLSX template, picks the Activities sheet and previews rows', async () => {
    const { agent, ad } = await setup();
    const xlsx = await buildActivityTemplateXlsx();
    const ds = (
      await agent
        .post(`/api/activity-definitions/${ad.id}/data-sources`)
        .attach('file', xlsx, 'fuel-q1.xlsx')
        .expect(201)
    ).body;
    expect(ds.sheets).toEqual(['Instructions', 'Activities']);
    // Instructions has a 2-column table too; user switches to Activities
    const switched = (await agent.patch(`/api/data-sources/${ds.id}`).send({ sheetName: 'Activities' }).expect(200))
      .body;
    expect(switched).toMatchObject({ sheetName: 'Activities', headerRow: 1, rowCount: TEMPLATE_ROWS.length });
    expect(switched.columns).toContain('Activity Description');
  });

  it('rejects unsupported files', async () => {
    const { agent, ad } = await setup();
    const res = await agent
      .post(`/api/activity-definitions/${ad.id}/data-sources`)
      .attach('file', Buffer.from('%PDF'), 'bill.pdf')
      .expect(422);
    expect(res.body.code).toBe('UNSUPPORTED_FILE');
  });

  it('suggests a heuristic mapping without Gemini, and an AI mapping with it', async () => {
    const { agent, ad } = await setup();
    const csv = Buffer.from(buildActivityTemplateCsv());
    const ds = (await agent.post(`/api/activity-definitions/${ad.id}/data-sources`).attach('file', csv, 'q1.csv')).body;
    const h = (await agent.post(`/api/data-sources/${ds.id}/suggest-mapping`).expect(200)).body;
    expect(h).toMatchObject({ source: 'heuristic', mapping: MAPPING });

    const ai = fakeAi('', {
      mapping: { ...MAPPING, location: 'Nope' },
      confidence: { description: 0.97 },
      reasoning: 'Headers are explicit.',
    });
    const s2 = await setup(ai);
    const ds2 = (
      await s2.agent.post(`/api/activity-definitions/${s2.ad.id}/data-sources`).attach('file', csv, 'q1.csv')
    ).body;
    const a = (await s2.agent.post(`/api/data-sources/${ds2.id}/suggest-mapping`).expect(200)).body;
    expect(a).toMatchObject({ source: 'ai', reasoning: 'Headers are explicit.' });
    expect(a.mapping.location).toBeNull(); // non-existent column from the model is dropped
    expect(a.confidence.description).toBe(0.97);
    expect(ai.generateJson).toHaveBeenCalledOnce();
  });

  it('imports all template rows, matching business units by code, then publishes', async () => {
    const { t, agent, ad } = await setup();
    const ds = (
      await agent
        .post(`/api/activity-definitions/${ad.id}/data-sources`)
        .attach('file', Buffer.from(buildActivityTemplateCsv()), 'q1.csv')
    ).body;
    const started = (
      await agent
        .post(`/api/data-sources/${ds.id}/import`)
        .send({ mapping: MAPPING, mappingMode: 'manual' })
        .expect(202)
    ).body;
    expect(started.status).toBe('importing');
    await drainImports(t);

    const done = (await agent.get(`/api/data-sources/${ds.id}`).expect(200)).body;
    expect(done).toMatchObject({
      status: 'imported',
      importedCount: TEMPLATE_ROWS.length,
      errorCount: 0,
      mappingMode: 'manual',
    });

    const page = (await agent.get(`/api/activity-definitions/${ad.id}/activities?limit=3`).expect(200)).body;
    expect(page.total).toBe(TEMPLATE_ROWS.length);
    expect(page.items[0]).toMatchObject({
      description: 'Grid electricity – office',
      measure: 18450,
      unit: 'kWh',
      currency: 'INR',
    });

    const published = (await agent.post(`/api/activity-definitions/${ad.id}/publish`).expect(200)).body;
    expect(published).toMatchObject({ status: 'published', activityCount: TEMPLATE_ROWS.length, dataSourceCount: 1 });
    expect(t.jobs.sent('calculation.run')).toEqual([{ tenantId: expect.any(String), activityDefinitionId: ad.id }]);

    // scope/category locked after publish
    const locked = await agent
      .patch(`/api/activity-definitions/${ad.id}`)
      .send({ scope: 3, categoryId: TRAVEL.id })
      .expect(422);
    expect(locked.body.code).toBe('DEFINITION_LOCKED');
    await agent.delete(`/api/activity-definitions/${ad.id}`).expect(409);
  });

  it('aborts on invalid rows unless onlyValidRows, reporting row numbers', async () => {
    const { t, agent, ad } = await setup();
    const csv = 'Item,Qty,UOM\nDiesel,100,L\nPetrol,lots,L\nGas,5,bananas\n';
    const ds = (
      await agent.post(`/api/activity-definitions/${ad.id}/data-sources`).attach('file', Buffer.from(csv), 'x.csv')
    ).body;
    const mapping = {
      ...Object.fromEntries(Object.keys(MAPPING).map((k) => [k, null])),
      description: 'Item',
      measure: 'Qty',
      unit: 'UOM',
    };

    await agent.post(`/api/data-sources/${ds.id}/import`).send({ mapping, mappingMode: 'manual' }).expect(202);
    await drainImports(t);
    const failed = (await agent.get(`/api/data-sources/${ds.id}`)).body;
    expect(failed).toMatchObject({ status: 'failed', importedCount: 0, errorCount: 2 });
    expect(failed.errors.map((e: { row: number; field: string }) => `${e.row}:${e.field}`)).toEqual([
      '3:measure',
      '4:unit',
    ]);

    await agent
      .post(`/api/data-sources/${ds.id}/import`)
      .send({ mapping, mappingMode: 'manual', onlyValidRows: true })
      .expect(202);
    await drainImports(t);
    expect((await agent.get(`/api/data-sources/${ds.id}`)).body).toMatchObject({
      status: 'imported',
      importedCount: 1,
      errorCount: 2,
    });
  });

  it('requires description, measure and unit to be mapped', async () => {
    const { agent, ad } = await setup();
    const ds = (
      await agent
        .post(`/api/activity-definitions/${ad.id}/data-sources`)
        .attach('file', Buffer.from('A,B\n1,2\n'), 'x.csv')
    ).body;
    const mapping = { ...Object.fromEntries(Object.keys(MAPPING).map((k) => [k, null])), description: 'A' };
    const res = await agent
      .post(`/api/data-sources/${ds.id}/import`)
      .send({ mapping, mappingMode: 'manual' })
      .expect(422);
    expect(res.body.code).toBe('MAPPING_INCOMPLETE');
  });

  it('deleting a data source removes its file and activities', async () => {
    const { t, agent, ad } = await setup();
    const ds = (
      await agent
        .post(`/api/activity-definitions/${ad.id}/data-sources`)
        .attach('file', Buffer.from(buildActivityTemplateCsv()), 'q1.csv')
    ).body;
    await agent.post(`/api/data-sources/${ds.id}/import`).send({ mapping: MAPPING, mappingMode: 'manual' });
    await drainImports(t);
    await agent.delete(`/api/data-sources/${ds.id}`).expect(204);
    expect(t.files.data.size).toBe(0);
    expect((await agent.get(`/api/activity-definitions/${ad.id}/activities`)).body.total).toBe(0);
  });

  it('serves the sample template as XLSX and CSV (public)', async () => {
    const { api } = createTestApp();
    const x = await api
      .get('/api/templates/activity-data')
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(x.headers['content-type']).toContain('spreadsheetml');
    expect(x.headers['content-disposition']).toContain('carbon-glint-activity-template.xlsx');
    expect((x.body as Buffer).subarray(0, 2).toString()).toBe('PK'); // zip container
    const c = await api.get('/api/templates/activity-data?format=csv').expect(200);
    expect(c.text.split('\n')[0]).toContain('Activity Description');
  });

  it('is tenant-isolated', async () => {
    const { t, ad } = await setup();
    const other = await onboardedAdmin(t, 'hank@globex.com');
    await other.agent.get(`/api/activity-definitions/${ad.id}`).expect(404);
    await other.agent
      .post(`/api/activity-definitions/${ad.id}/data-sources`)
      .attach('file', Buffer.from('a,b\n1,2'), 'x.csv')
      .expect(404);
  });
});
