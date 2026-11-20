import type { Logger } from '../lib/logger.js';
import type { Mailer } from '../lib/mailer.js';
import type { Services } from '../services/index.js';
import type { JobName, JobPayloads } from './types.js';

export interface JobDeps {
  mailer: Mailer;
  logger: Logger;
  services: Services;
}

export type JobHandlers = { [K in JobName]: (payload: JobPayloads[K]) => Promise<void> };

/** Job name → handler. Missing a handler for a JobName is a compile error. */
export const createJobHandlers = ({ mailer, services, logger }: JobDeps): JobHandlers => ({
  'email.send': (message) => mailer.send(message),
  'datasource.import': (payload) => services.dataSources.runImport(payload),
  'calculation.run': async (payload) => {
    const result = await services.calculations.run(payload);
    logger.info({ ...payload, ...result }, 'emissions calculated');
  },
  'report.generate': (payload) => services.reports.generate(payload),
  'factors.sync': async (payload) => {
    const result = await services.factorSync.run(payload.trigger);
    logger.info({ ...payload, ...result }, 'emission factor sync finished');
  },
  'assistant.index': async (payload) => {
    const n = await services.assistant.index(payload.tenantId);
    logger.info({ ...payload, chunks: n }, 'assistant index rebuilt');
  },
});

export async function dispatchJob(handlers: JobHandlers, name: string, payload: unknown): Promise<void> {
  const handler = (handlers as Record<string, ((p: unknown) => Promise<void>) | undefined>)[name];
  if (!handler) throw new Error(`No handler for job "${name}"`);
  await handler(payload);
}
