import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import {
  activities,
  activityDefinitions,
  dataSources,
  ghgCategories,
  type ActivityDefinitionModel,
  type GhgCategoryModel,
  type NewActivityDefinitionModel,
} from '../models/index.js';

export interface DefinitionRow {
  definition: ActivityDefinitionModel;
  category: GhgCategoryModel;
  dataSourceCount: number;
  activityCount: number;
}

export interface ActivityDefinitionRepository {
  list(
    tenantId: string,
    filter: { scope?: number; status?: ActivityDefinitionModel['status'] },
  ): Promise<DefinitionRow[]>;
  findById(tenantId: string, id: string): Promise<DefinitionRow | null>;
  create(data: NewActivityDefinitionModel): Promise<ActivityDefinitionModel>;
  update(
    tenantId: string,
    id: string,
    data: Partial<NewActivityDefinitionModel>,
  ): Promise<ActivityDefinitionModel | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

export const createActivityDefinitionRepository = (db: DbExecutor): ActivityDefinitionRepository => {
  const withCounts = async (tenantId: string, where: ReturnType<typeof and>): Promise<DefinitionRow[]> => {
    const rows = await db
      .select({ definition: activityDefinitions, category: ghgCategories })
      .from(activityDefinitions)
      .innerJoin(ghgCategories, eq(ghgCategories.id, activityDefinitions.categoryId))
      .where(where)
      .orderBy(desc(activityDefinitions.createdAt));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.definition.id);
    const [dsCounts, actCounts] = await Promise.all([
      db
        .select({ id: dataSources.activityDefinitionId, n: count() })
        .from(dataSources)
        .where(and(eq(dataSources.tenantId, tenantId), inArray(dataSources.activityDefinitionId, ids)))
        .groupBy(dataSources.activityDefinitionId),
      db
        .select({ id: activities.activityDefinitionId, n: count() })
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), inArray(activities.activityDefinitionId, ids)))
        .groupBy(activities.activityDefinitionId),
    ]);
    const ds = new Map(dsCounts.map((c) => [c.id, Number(c.n)]));
    const ac = new Map(actCounts.map((c) => [c.id, Number(c.n)]));
    return rows.map((r) => ({
      ...r,
      dataSourceCount: ds.get(r.definition.id) ?? 0,
      activityCount: ac.get(r.definition.id) ?? 0,
    }));
  };

  return {
    list: (tenantId, { scope, status }) =>
      withCounts(
        tenantId,
        and(
          eq(activityDefinitions.tenantId, tenantId),
          scope ? eq(activityDefinitions.scope, scope) : undefined,
          status ? eq(activityDefinitions.status, status) : undefined,
        ),
      ),
    async findById(tenantId, id) {
      const [row] = await withCounts(
        tenantId,
        and(eq(activityDefinitions.tenantId, tenantId), eq(activityDefinitions.id, id)),
      );
      return row ?? null;
    },
    async create(data) {
      const [row] = await db.insert(activityDefinitions).values(data).returning();
      return row!;
    },
    async update(tenantId, id, data) {
      const [row] = await db
        .update(activityDefinitions)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(activityDefinitions.tenantId, tenantId), eq(activityDefinitions.id, id)))
        .returning();
      return row ?? null;
    },
    async delete(tenantId, id) {
      const rows = await db
        .delete(activityDefinitions)
        .where(and(eq(activityDefinitions.tenantId, tenantId), eq(activityDefinitions.id, id)))
        .returning({ id: activityDefinitions.id });
      return rows.length > 0;
    },
  };
};
