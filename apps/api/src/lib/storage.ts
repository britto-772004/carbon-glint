import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

/** Where uploads and generated reports live. Local disk on the VM; swappable for object storage later. */
export interface FileStorage {
  put(key: string, data: Buffer | Uint8Array | string): Promise<void>;
  read(key: string): Readable;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
}

export function createLocalFileStorage(rootDir: string): FileStorage {
  const root = path.resolve(rootDir);

  /** Resolve a key inside root; rejects traversal like "../etc/passwd" or absolute paths. */
  const resolveKey = (key: string): string => {
    const full = path.resolve(root, key);
    if (!key || path.isAbsolute(key) || (full !== root && !full.startsWith(root + path.sep))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  };

  return {
    async put(key, data) {
      const full = resolveKey(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    read(key) {
      return createReadStream(resolveKey(key));
    },
    async exists(key) {
      try {
        return (await stat(resolveKey(key))).isFile();
      } catch {
        return false;
      }
    },
    async remove(key) {
      await rm(resolveKey(key), { force: true });
    },
  };
}
