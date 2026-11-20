import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './src/models/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
