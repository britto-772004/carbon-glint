import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/repositories/index.js';
import { TEST_DATASET } from '../../helpers/ef-fixtures.js';
import { createTestStores } from '../db.js';

describe('EmissionFactorRepository (Postgres FTS + trigram)', () => {
  const stores = createTestStores();
  const repos = createRepositories(stores);

  beforeAll(async () => {
    await repos.emissionFactors.importDataset(TEST_DATASET);
    await repos.emissionFactors.importDataset(TEST_DATASET); // idempotent re-import
  });
  afterAll(async () => {
    await stores.db.execute(`delete from ef_sources where code = 'TEST_2026'` as never);
    await stores.close();
  });

  it('re-import replaces the dataset', async () => {
    const sources = (await repos.emissionFactors.listSources()).filter((s) => s.code === 'TEST_2026');
    expect(sources).toHaveLength(1);
    expect(sources[0]!.factorCount).toBe(5);
  });

  it('ranks the right fuel first and filters by unit', async () => {
    const hits = await repos.emissionFactors.search({ query: 'Diesel – DG set backup power', units: ['L'] });
    expect(hits[0]!.factor.name).toContain('Diesel');
    expect(hits.every((h) => h.factor.unit === 'L')).toBe(true);
    expect(
      (await repos.emissionFactors.search({ query: 'grid electricity office', units: ['kWh', 'MWh'] }))[0]!.factor
        .externalId,
    ).toBe('f3');
  });

  it('tolerates typos via trigram similarity', async () => {
    const hits = await repos.emissionFactors.search({ query: 'Desel', units: ['L'] });
    expect(hits[0]?.factor.name).toContain('Diesel');
  });
});
