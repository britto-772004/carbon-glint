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
    const run = (services as Partial<Services> & { calculations?: { run(p: typeof payload): Promise<void> } })
      .calculations;
    if (run) await run.run(payload);
    else logger.info(payload, 'calculation engine not available yet');
  },
});

export async function dispatchJob(handlers: JobHandlers, name: string, payload: unknown): Promise<void> {
  const handler = (handlers as Record<string, ((p: unknown) => Promise<void>) | undefined>)[name];
  if (!handler) throw new Error(`No handler for job "${name}"`);
  await handler(payload);
}
