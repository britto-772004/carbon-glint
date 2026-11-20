import { describe, expect, it } from 'vitest';
import { bullConnection } from '../../../src/lib/redis.js';

describe('bullConnection', () => {
  it('parses host, port and db', () => {
    expect(bullConnection('redis://127.0.0.1:6380/3')).toEqual({
      host: '127.0.0.1',
      port: 6380,
      db: 3,
      maxRetriesPerRequest: null,
    });
  });

  it('includes credentials when present and defaults port/db', () => {
    expect(bullConnection('redis://user:p%40ss@cache')).toMatchObject({
      host: 'cache',
      port: 6379,
      db: 0,
      username: 'user',
      password: 'p@ss',
    });
  });
});
