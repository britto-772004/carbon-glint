import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../../src/config.js';
import type { ParsedDataset } from '../../../src/ef/types.js';
import { createFactorSyncService, type FactorProvider } from '../../../src/services/factor-sync.service.js';
import type { ServiceDeps } from '../../../src/services/index.js';
import { fakeAi, fakeJobQueue, fakeRepositories, memoryFiles } from '../../helpers/fakes.js';

const dataset = (code: string, year: number): ParsedDataset => ({
  source: {
    code,
    publisher: 'DEFRA',
    name: `Factors ${year}`,
    version: String(year),
    year,
    licence: 'OGL',
    url: 'https://example.test',
  },
  factors: [],
});

const setup = (provider: Partial<FactorProvider> = {}, env: Record<string, string> = {}) => {
  const repositories = fakeRepositories();
  const jobs = fakeJobQueue();
  const deps = {
    repositories,
    jobs,
    ai: fakeAi(),
    files: memoryFiles(),
    config: loadConfig({ DATABASE_URL: 'postgres://u:p@localhost/db', ...env }),
  } as unknown as ServiceDeps;
  const fetchDataset = vi.fn(async (year: number) => dataset(`TEST_${year}`, year));
  const service = createFactorSyncService(deps, [
    {
      name: 'Test',
      years: () => [2027, 2026],
      sourceCode: (y) => `TEST_${y}`,
      fetchDataset,
      ...provider,
    },
  ]);
  return { service, repositories, jobs, fetchDataset };
};

describe('factor sync', () => {
  it('reports no runs yet, with the next check one interval from now', async () => {
    const { service } = setup();
    const s = await service.status();
    expect(s).toMatchObject({ intervalHours: 168, lastRun: null });
    expect(new Date(s.nextRunAt!).getTime()).toBeGreaterThan(Date.now() + 160 * 3_600_000);
  });

  it('imports newly published editions and records the run', async () => {
    const { service, repositories } = setup();
    const out = await service.run('schedule');
    expect(out).toEqual({ status: 'ok', imported: ['TEST_2027', 'TEST_2026'] });
    expect((await repositories.emissionFactors.listSources()).map((s) => s.code).sort()).toEqual([
      'TEST_2026',
      'TEST_2027',
    ]);
    const s = await service.status();
    expect(s.lastRun).toMatchObject({ trigger: 'schedule', status: 'ok', imported: ['TEST_2027', 'TEST_2026'] });
    expect(s.lastRun?.finishedAt).not.toBeNull();
  });

  it('never re-imports an edition that is already loaded', async () => {
    const { service, fetchDataset } = setup();
    await service.run('schedule');
    fetchDataset.mockClear();
    const out = await service.run('manual');
    expect(out.imported).toEqual([]);
    expect(fetchDataset).not.toHaveBeenCalled();
    expect((await service.status()).lastRun).toMatchObject({
      trigger: 'manual',
      status: 'ok',
      message: 'All known databases are up to date.',
    });
  });

  it('treats a not-yet-published edition as fine, not as a failure', async () => {
    const { service } = setup({ fetchDataset: async (y) => (y === 2026 ? dataset('TEST_2026', 2026) : null) });
    const out = await service.run('schedule');
    expect(out).toEqual({ status: 'ok', imported: ['TEST_2026'] });
    expect((await service.status()).lastRun?.message).toContain('TEST_2027: not published yet');
  });

  it('records a failure with its reason instead of throwing', async () => {
    const { service } = setup({
      fetchDataset: async () => {
        throw new Error('network down');
      },
    });
    expect(await service.run('schedule')).toEqual({ status: 'failed', imported: [] });
    expect((await service.status()).lastRun).toMatchObject({ status: 'failed', message: 'network down' });
  });

  it('Sync now enqueues a manual job and is rate-limited', async () => {
    const { service, jobs } = setup();
    for (let i = 0; i < 3; i++) await service.requestSync();
    expect(jobs.sent('factors.sync')).toEqual([{ trigger: 'manual' }, { trigger: 'manual' }, { trigger: 'manual' }]);
    await expect(service.requestSync()).rejects.toMatchObject({ code: 'SYNC_RATE_LIMIT' });
  });

  it('reports no next run when automatic sync is disabled', async () => {
    const { service } = setup({}, { EF_SYNC_INTERVAL_HOURS: '0' });
    expect(await service.status()).toMatchObject({ intervalHours: 0, nextRunAt: null });
  });
});
