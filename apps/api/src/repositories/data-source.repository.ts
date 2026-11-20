import { and, asc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { dataSources, type DataSourceModel, type NewDataSourceModel } from '../models/index.js';

export interface DataSourceRepository {
  listByDefinition(tenantId: string, activityDefinitionId: string): Promise<DataSourceModel[]>;
  findById(tenantId: string, id: string): Promise<DataSourceModel | null>;
  /** Worker access by id only (the job payload carries the tenant id for safety). */
  findForJob(id: string): Promise<DataSourceModel | null>;
  create(data: NewDataSourceModel): Promise<DataSourceModel>;
  update(id: string, data: Partial<NewDataSourceModel>): Promise<DataSourceModel | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

export const createDataSourceRepository = (db: DbExecutor): DataSourceRepository => ({
  listByDefinition: (tenantId, adId) =>
    db
      .select()
      .from(dataSources)
      .where(and(eq(dataSources.tenantId, tenantId), eq(dataSources.activityDefinitionId, adId)))
      .orderBy(asc(dataSources.createdAt)),
  async findById(tenantId, id) {
    const [row] = await db
      .select()
      .from(dataSources)
      .where(and(eq(dataSources.tenantId, tenantId), eq(dataSources.id, id)))
      .limit(1);
    return row ?? null;
  },
  async findForJob(id) {
    const [row] = await db.select().from(dataSources).where(eq(dataSources.id, id)).limit(1);
    return row ?? null;
  },
  async create(data) {
    const [row] = await db.insert(dataSources).values(data).returning();
    return row!;
  },
  async update(id, data) {
    const [row] = await db
      .update(dataSources)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dataSources.id, id))
      .returning();
    return row ?? null;
  },
  async delete(tenantId, id) {
    const rows = await db
      .delete(dataSources)
      .where(and(eq(dataSources.tenantId, tenantId), eq(dataSources.id, id)))
      .returning({ id: dataSources.id });
    return rows.length > 0;
  },
});
