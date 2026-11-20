import type { Schemas } from '@carbon-glint/api-spec';
import { findDefraFlatFileUrl, parseDefraFlatFile } from '../ef/defra.js';
import type { ParsedDataset } from '../ef/types.js';
import { TooManyRequestsError } from '../errors/domain-errors.js';
import type { ServiceDeps } from './index.js';

const HOUR_MS = 3_600_000;

/** A public factor publisher the sync knows how to check. `null` = that edition isn't published (yet). */
export interface FactorProvider {
  name: string;
  /** Editions to look for, newest first. */
  years(now: Date): number[];
  sourceCode(year: number): string;
  fetchDataset(year: number): Promise<ParsedDataset | null>;
}

export const defraProvider: FactorProvider = {
  name: 'UK DEFRA / DESNZ',
  // The current edition is usually published mid-year, so also look at the previous one.
  years: (now) => [now.getFullYear(), now.getFullYear() - 1],
  sourceCode: (year) => `DEFRA_${year}`,
  async fetchDataset(year) {
    let url: string;
    try {
      url = await findDefraFlatFileUrl(year);
    } catch {
      return null; // not published (yet)
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Download of ${url} failed with ${res.status}`);
    return parseDefraFlatFile(Buffer.from(await res.arrayBuffer()), { url });
  },
};

export interface FactorSyncService {
  status(): Promise<Schemas['EmissionFactorSyncStatus']>;
  /** Manual "Sync now": enqueues the same job the schedule runs (rate-limited). */
  requestSync(): Promise<void>;
  /** Worker entrypoint. Records the outcome; a failed run is recorded, not retried in a loop. */
  run(trigger: 'schedule' | 'manual'): Promise<{ status: 'ok' | 'failed'; imported: string[] }>;
}

/**
 * Keeps the factor library current. Existing datasets are immutable (calculations reference their
 * rows), so a sync only ever ADDS newly published editions; it never replaces one in place.
 */
export const createFactorSyncService = (
  { repositories: repos, jobs, config }: ServiceDeps,
  providers: FactorProvider[] = [defraProvider],
): FactorSyncService => ({
  async status() {
    const last = await repos.emissionFactors.lastSyncRun();
    const intervalHours = config.EF_SYNC_INTERVAL_HOURS;
    const base = last?.startedAt ?? new Date();
    return {
      intervalHours,
      nextRunAt: intervalHours > 0 ? new Date(base.getTime() + intervalHours * HOUR_MS).toISOString() : null,
      lastRun: last
        ? {
            trigger: last.trigger === 'manual' ? 'manual' : 'schedule',
            status: last.status === 'ok' ? 'ok' : 'failed',
            startedAt: last.startedAt.toISOString(),
            finishedAt: last.finishedAt ? last.finishedAt.toISOString() : null,
            imported: last.imported,
            message: last.message,
          }
        : null,
    };
  },

  async requestSync() {
    const hit = await repos.rateLimits.hit('factors-sync', 3, 600);
    if (!hit.allowed)
      throw new TooManyRequestsError('A sync was just requested. Please wait a few minutes.', {
        code: 'SYNC_RATE_LIMIT',
      });
    await jobs.enqueue('factors.sync', { trigger: 'manual' });
  },

  async run(trigger) {
    const startedAt = new Date();
    const imported: string[] = [];
    const notes: string[] = [];
    let status: 'ok' | 'failed' = 'ok';
    try {
      const have = new Set((await repos.emissionFactors.listSources()).map((s) => s.code));
      for (const provider of providers) {
        for (const year of provider.years(startedAt)) {
          const code = provider.sourceCode(year);
          if (have.has(code)) continue;
          const dataset = await provider.fetchDataset(year);
          if (!dataset) {
            notes.push(`${code}: not published yet`);
            continue;
          }
          const count = await repos.emissionFactors.importDataset(dataset);
          imported.push(dataset.source.code);
          notes.push(`${dataset.source.code}: imported ${count.toLocaleString('en')} factors`);
        }
      }
      if (notes.length === 0) notes.push('All known databases are up to date.');
    } catch (err) {
      status = 'failed';
      notes.push(err instanceof Error ? err.message.slice(0, 300) : 'Unknown error');
    }
    await repos.emissionFactors.recordSyncRun({
      trigger,
      status,
      startedAt,
      finishedAt: new Date(),
      imported,
      message: notes.join(' · ').slice(0, 1000),
    });
    return { status, imported };
  },
});
