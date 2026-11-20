import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('loadConfig', () => {
  it('applies defaults for local development', () => {
    const c = loadConfig(base);
    expect(c).toMatchObject({ PORT: 8080, REDIS_URL: 'redis://127.0.0.1:6379', SMTP_PORT: 587, CORS_ORIGINS: [] });
    expect(c.SMTP_HOST).toBeUndefined();
  });

  it('treats empty values as unset', () => {
    const c = loadConfig({ ...base, SMTP_HOST: '', GEMINI_API_KEY: '', SMTP_PORT: '' });
    expect(c.SMTP_HOST).toBeUndefined();
    expect(c.GEMINI_API_KEY).toBeUndefined();
    expect(c.SMTP_PORT).toBe(587);
  });

  it('fails fast on invalid configuration', () => {
    expect(() => loadConfig({ DATABASE_URL: 'not-a-url' })).toThrow('Invalid environment configuration');
  });
});
