import type { EmailMessage } from '../lib/mailer.js';

/** Every background job: name → payload. Add new jobs here, then a handler in ./handlers.ts. */
export interface JobPayloads {
  'email.send': EmailMessage;
  /** Validate + import a data source's rows (heavy: runs in the worker). */
  'datasource.import': { tenantId: string; dataSourceId: string; onlyValidRows: boolean };
  /** Match emission factors and calculate CO2e for an Activity Definition. */
  'calculation.run': { tenantId: string; activityDefinitionId: string };
  /** Render a report PDF. */
  'report.generate': { tenantId: string; reportId: string };
  /** Rebuild a tenant's assistant knowledge index (embeddings). */
  'assistant.index': { tenantId: string };
  /** Check for newly published emission-factor datasets and import them (existing ones are never overwritten). */
  'factors.sync': { trigger: 'schedule' | 'manual' };
}

export type JobName = keyof JobPayloads;

/** What services use to schedule background work (no BullMQ types leak into services). */
export interface JobQueue {
  enqueue<K extends JobName>(name: K, payload: JobPayloads[K], opts?: { delayMs?: number }): Promise<void>;
  /** Repeat a job every `everyMs` (idempotent: calling again with the same id updates the schedule). */
  schedule<K extends JobName>(id: string, name: K, payload: JobPayloads[K], everyMs: number): Promise<void>;
}
