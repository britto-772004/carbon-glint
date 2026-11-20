import { and, asc, count, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { activities, type ActivityModel, type NewActivityModel } from '../models/index.js';

export interface ActivityRepository {
  /** Replaces all activities of a data source with `rows` (batched inserts). */
  replaceForDataSource(dataSourceId: string, rows: NewActivityModel[]): Promise<number>;
  listByDefinition(
    tenantId: string,
    adId: string,
    page: { limit: number; offset: number },
  ): Promise<{ items: ActivityModel[]; total: number }>;
  /** All activities of a definition (for calculation). */
  allByDefinition(tenantId: string, adId: string): Promise<ActivityModel[]>;
  countByOrgUnit(tenantId: string, orgUnitId: string): Promise<number>;
}

const BATCH = 1000;

export const createActivityRepository = (db: DbExecutor): ActivityRepository => ({
  async replaceForDataSource(dataSourceId, rows) {
    await db.delete(activities).where(eq(activities.dataSourceId, dataSourceId));
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(activities).values(rows.slice(i, i + BATCH));
    }
    return rows.length;
  },
  async listByDefinition(tenantId, adId, { limit, offset }) {
    const where = and(eq(activities.tenantId, tenantId), eq(activities.activityDefinitionId, adId));
    const [items, [total]] = await Promise.all([
      db
        .select()
        .from(activities)
        .where(where)
        .orderBy(asc(activities.dataSourceId), asc(activities.rowNumber))
        .limit(limit)
        .offset(offset),
      db.select({ n: count() }).from(activities).where(where),
    ]);
    return { items, total: Number(total?.n ?? 0) };
  },
  allByDefinition: (tenantId, adId) =>
    db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, tenantId), eq(activities.activityDefinitionId, adId)))
      .orderBy(asc(activities.rowNumber)),
  async countByOrgUnit(tenantId, orgUnitId) {
    const [row] = await db
      .select({ n: count() })
      .from(activities)
      .where(and(eq(activities.tenantId, tenantId), eq(activities.orgUnitId, orgUnitId)));
    return Number(row?.n ?? 0);
  },
});
