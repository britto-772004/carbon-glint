import { asc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { industries, type IndustryModel } from '../models/index.js';

export interface IndustryRepository {
  list(): Promise<IndustryModel[]>;
  findById(id: string): Promise<IndustryModel | null>;
}

export const createIndustryRepository = (db: DbExecutor): IndustryRepository => ({
  list: () => db.select().from(industries).orderBy(asc(industries.name)),
  async findById(id) {
    const [row] = await db.select().from(industries).where(eq(industries.id, id)).limit(1);
    return row ?? null;
  },
});
