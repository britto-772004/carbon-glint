import { and, eq, inArray, ne } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { calculations, type CalculationModel, type NewCalculationModel } from '../models/index.js';

export interface CalculationRepository {
  listByDefinition(tenantId: string, adId: string): Promise<CalculationModel[]>;
  findByActivity(tenantId: string, activityId: string): Promise<CalculationModel | null>;
  /** Replace all non-overridden calculations of a definition (overrides are preserved). */
  replaceForDefinition(tenantId: string, adId: string, rows: NewCalculationModel[]): Promise<void>;
  upsert(row: NewCalculationModel): Promise<CalculationModel>;
  listByTenant(tenantId: string, filter?: { activityDefinitionIds?: string[] }): Promise<CalculationModel[]>;
}

const BATCH = 500;

export const createCalculationRepository = (db: DbExecutor): CalculationRepository => ({
  listByDefinition: (tenantId, adId) =>
    db
      .select()
      .from(calculations)
      .where(and(eq(calculations.tenantId, tenantId), eq(calculations.activityDefinitionId, adId))),
  async findByActivity(tenantId, activityId) {
    const [row] = await db
      .select()
      .from(calculations)
      .where(and(eq(calculations.tenantId, tenantId), eq(calculations.activityId, activityId)))
      .limit(1);
    return row ?? null;
  },
  async replaceForDefinition(tenantId, adId, rows) {
    await db
      .delete(calculations)
      .where(
        and(
          eq(calculations.tenantId, tenantId),
          eq(calculations.activityDefinitionId, adId),
          ne(calculations.status, 'overridden'),
        ),
      );
    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(calculations)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing({ target: calculations.activityId });
    }
  },
  async upsert(row) {
    const [saved] = await db
      .insert(calculations)
      .values(row)
      .onConflictDoUpdate({ target: calculations.activityId, set: { ...row, calculatedAt: new Date() } })
      .returning();
    return saved!;
  },
  listByTenant: (tenantId, filter) =>
    db
      .select()
      .from(calculations)
      .where(
        and(
          eq(calculations.tenantId, tenantId),
          filter?.activityDefinitionIds?.length
            ? inArray(calculations.activityDefinitionId, filter.activityDefinitionIds)
            : undefined,
        ),
      ),
});
