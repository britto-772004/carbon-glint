import { describe, expect, it } from 'vitest';
import { createJobHandlers, dispatchJob } from '../../../src/jobs/handlers.js';
import { createLogger } from '../../../src/lib/logger.js';
import { testConfig } from '../../helpers/app.js';
import { fakeMailer } from '../../helpers/fakes.js';
import type { Services } from '../../../src/services/index.js';

const message = { to: 'a@acme.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

describe('job handlers', () => {
  it('email.send delivers through the mailer', async () => {
    const mailer = fakeMailer();
    const handlers = createJobHandlers({ mailer, logger: createLogger(testConfig()), services: {} as Services });
    await dispatchJob(handlers, 'email.send', message);
    expect(mailer.sent).toEqual([message]);
  });

  it('rejects unknown job names', async () => {
    const handlers = createJobHandlers({
      mailer: fakeMailer(),
      logger: createLogger(testConfig()),
      services: {} as Services,
    });
    await expect(dispatchJob(handlers, 'nope', {})).rejects.toThrow('No handler for job "nope"');
  });
});
