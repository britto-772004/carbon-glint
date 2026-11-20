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
}

export type JobName = keyof JobPayloads;

/** What services use to schedule background work (no BullMQ types leak into services). */
export interface JobQueue {
  enqueue<K extends JobName>(name: K, payload: JobPayloads[K], opts?: { delayMs?: number }): Promise<void>;
}
