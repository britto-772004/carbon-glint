import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { configureSdk } from '@carbon-glint/sdk';
import { server } from './mocks/server';
import { resetSession } from './mocks/session';
import { TEST_API_BASE_URL } from './constants';

// The real generated SDK runs in tests; MSW intercepts at the network layer.
configureSdk({ baseUrl: TEST_API_BASE_URL });

// Any request without a mock fails the test that made it (MSW's 'error' mode only logs).
const unhandled: string[] = [];

beforeAll(() =>
  server.listen({
    onUnhandledFrame: async ({ frame, defaults }) => {
      unhandled.push(await frame.getUnhandledMessage());
      defaults.error();
    },
  }),
);

afterEach(() => {
  server.resetHandlers();
  resetSession();
  cleanup();
  if (unhandled.length > 0) {
    const messages = unhandled.splice(0).join('\n\n');
    throw new Error(`Unmocked API request(s) — add an MSW handler:\n\n${messages}`);
  }
});

afterAll(() => server.close());
