import type { Database } from '../db/client.js';
import { createSystemRepository, type SystemRepository } from './system.repository.js';

export interface Repositories {
  system: SystemRepository;
}

export const createRepositories = (db: Database): Repositories => ({
  system: createSystemRepository(db),
});
