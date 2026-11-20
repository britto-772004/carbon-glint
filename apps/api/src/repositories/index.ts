import { createSystemRepository, type DataStores, type SystemRepository } from './system.repository.js';

export type { DataStores };

export interface Repositories {
  system: SystemRepository;
}

export const createRepositories = (stores: DataStores): Repositories => ({
  system: createSystemRepository(stores),
});
