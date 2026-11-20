import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/repositories/index.js';
import { createTestStores, resetDatabase } from '../db.js';

describe('taxonomy + activity repositories (Postgres)', () => {
  const stores = createTestStores();
  const repos = createRepositories(stores);
  let tenantId: string;
  let industryId: string;

  beforeEach(async () => {
    await resetDatabase(stores.database);
    industryId = (await repos.industries.list()).find((i) => i.code === 'it_software')!.id;
    tenantId = (await repos.tenants.create({ name: 'Acme', emailDomain: 'acme.com', industryId })).id;
  });
  afterAll(() => stores.close());

  it('seeded taxonomy: 22 system categories with industry ranks', async () => {
    const all = await repos.ghgCategories.listForTenant(tenantId, industryId);
    expect(all.filter((r) => r.category.tenantId === null)).toHaveLength(22);
    const elec = all.find((r) => r.category.code === 'S2_ELECTRICITY')!;
    expect(elec.rank).toBe(0);
    expect(all.find((r) => r.category.code === 'S3_C15')!.rank).toBeNull();
    expect(await repos.ghgCategories.listForTenant(tenantId, industryId, 2)).toHaveLength(3);
  });

  it('custom categories are tenant-scoped; system codes can be reused per tenant', async () => {
    const other = (await repos.tenants.create({ name: 'G', emailDomain: 'g.io' })).id;
    const c = await repos.ghgCategories.create({ tenantId, scope: 3, code: 'S3_CUSTOM_X', name: 'X' });
    await expect(repos.ghgCategories.create({ tenantId, scope: 3, code: 'S3_CUSTOM_X', name: 'X' })).rejects.toThrow();
    await repos.ghgCategories.create({ tenantId: other, scope: 3, code: 'S3_CUSTOM_X', name: 'X' });
    expect(await repos.ghgCategories.findVisible(other, c.id)).toBeNull();
    // system code uniqueness holds for NULL tenant too (NULLS NOT DISTINCT)
    await expect(repos.ghgCategories.create({ scope: 1, code: 'S1_STATIONARY', name: 'dup' })).rejects.toThrow();
  });

  it('definitions with counts; replacing a data source’s activities; cascade delete', async () => {
    const category = (await repos.ghgCategories.findByCode(null, 'S2_ELECTRICITY'))!;
    const ad = await repos.activityDefinitions.create({
      tenantId,
      name: 'Electricity',
      scope: 2,
      categoryId: category.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    });
    const ds = await repos.dataSources.create({
      tenantId,
      activityDefinitionId: ad.id,
      fileKey: 'k',
      fileName: 'f.csv',
      fileType: 'csv',
      fileSize: 10,
    });
    const row = (n: number) => ({
      tenantId,
      activityDefinitionId: ad.id,
      dataSourceId: ds.id,
      rowNumber: n,
      description: `r${n}`,
      measure: 10.5 * n,
      unit: 'kWh',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    await repos.activities.replaceForDataSource(ds.id, [row(2), row(3)]);
    await repos.activities.replaceForDataSource(ds.id, [row(2), row(3), row(4)]);

    const found = (await repos.activityDefinitions.findById(tenantId, ad.id))!;
    expect(found).toMatchObject({ dataSourceCount: 1, activityCount: 3, category: { code: 'S2_ELECTRICITY' } });
    const page = await repos.activities.listByDefinition(tenantId, ad.id, { limit: 2, offset: 0 });
    expect(page.total).toBe(3);
    expect(page.items[1]!.measure).toBe(31.5); // numeric → number

    await repos.activityDefinitions.delete(tenantId, ad.id);
    expect(await repos.dataSources.findById(tenantId, ds.id)).toBeNull();
    expect((await repos.activities.allByDefinition(tenantId, ad.id)).length).toBe(0);
  });
});
