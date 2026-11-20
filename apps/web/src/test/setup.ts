import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { configureSdk } from '@carbon-glint/sdk';
import { server } from './mocks/server';
import { resetSession } from './mocks/session';
import { TEST_API_BASE_URL } from './constants';

// ECharts needs a real canvas; tests use the accessible table views instead.
vi.mock('echarts-for-react/lib/core', () => ({
  default: (props: { style?: object }) => createElement('div', { 'data-testid': 'echarts', style: props.style }),
}));

vi.mock('../lib/echarts', () => ({ echarts: {} }));

// jsdom lacks these; React Flow needs them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
globalThis.DOMMatrixReadOnly ??= class {
  m22 = 1;
  constructor() {}
} as unknown as typeof DOMMatrixReadOnly;

// Async UI can be slow when the API and web suites run in parallel (CI / pnpm -r).
configure({ asyncUtilTimeout: 10_000 });

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
