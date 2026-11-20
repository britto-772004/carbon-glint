import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.int.test.ts'],
          globalSetup: ['test/integration/global-setup.ts'],
          fileParallelism: false, // tests share one database
          testTimeout: 15_000,
        },
      },
    ],
  },
});
