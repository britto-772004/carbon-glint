import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/repositories/index.js';
import { createTestStores, resetDatabase } from '../db.js';

describe('OrgUnitRepository (Postgres)', () => {
  const stores = createTestStores();
  const repos = createRepositories(stores);
  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase(stores.database);
    tenantId = (await repos.tenants.create({ name: 'Acme', emailDomain: 'acme.com' })).id;
  });
  afterAll(() => stores.close());

  it('enforces unique code per tenant (not globally) and restricts deleting parents', async () => {
    const hq = await repos.orgUnits.create({ tenantId, name: 'HQ', code: 'HQ', type: 'hq' });
    await expect(repos.orgUnits.create({ tenantId, name: 'Dup', code: 'HQ' })).rejects.toThrow();
    const other = (await repos.tenants.create({ name: 'Globex', emailDomain: 'globex.com' })).id;
    await repos.orgUnits.create({ tenantId: other, name: 'HQ', code: 'HQ' });

    const child = await repos.orgUnits.create({ tenantId, parentId: hq.id, name: 'Pune', code: 'PUN' });
    expect(await repos.orgUnits.countChildren(tenantId, hq.id)).toBe(1);
    await expect(repos.orgUnits.delete(tenantId, hq.id)).rejects.toThrow(); // FK restrict
    expect(await repos.orgUnits.delete(tenantId, child.id)).toBe(true);
    expect(await repos.orgUnits.delete(other, hq.id)).toBe(false); // other tenant can't delete
  });

  it('scopes reads and updates by tenant', async () => {
    const hq = await repos.orgUnits.create({ tenantId, name: 'HQ', code: 'HQ' });
    const other = (await repos.tenants.create({ name: 'Globex', emailDomain: 'globex.com' })).id;
    expect(await repos.orgUnits.findById(other, hq.id)).toBeNull();
    expect(await repos.orgUnits.update(other, hq.id, { name: 'x' })).toBeNull();
    expect((await repos.orgUnits.update(tenantId, hq.id, { city: 'Pune' }))?.city).toBe('Pune');
    expect(await repos.orgUnits.findByCode(tenantId, 'HQ')).not.toBeNull();
  });
});
