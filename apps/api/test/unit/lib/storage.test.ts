import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalFileStorage, type FileStorage } from '../../../src/lib/storage.js';

describe('LocalFileStorage', () => {
  let dir: string;
  let storage: FileStorage;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'cg-storage-'));
    storage = createLocalFileStorage(dir);
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('writes, reads, checks and removes nested keys', async () => {
    await storage.put('tenant-1/uploads/a.csv', 'col\n1');
    expect(await storage.exists('tenant-1/uploads/a.csv')).toBe(true);
    expect(await text(storage.read('tenant-1/uploads/a.csv'))).toBe('col\n1');
    await storage.remove('tenant-1/uploads/a.csv');
    expect(await storage.exists('tenant-1/uploads/a.csv')).toBe(false);
  });

  it.each(['../escape.txt', 'a/../../escape.txt', '/etc/passwd', ''])('rejects unsafe key %j', async (key) => {
    await expect(storage.put(key, 'x')).rejects.toThrow('Invalid storage key');
  });
});
