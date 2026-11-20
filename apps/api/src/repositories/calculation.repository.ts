import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import {
  activities,
  activityDefinitions,
  calculations,
  efOverrides,
  efSources,
  emissionFactors,
  ghgCategories,
  orgUnits,
  type CalculationModel,
  type EfOverrideModel,
  type NewCalculationModel,
  type NewEfOverrideModel,
} from '../models/index.js';
import type { EmissionFact } from '../services/emission-aggregates.js';

/** A calculation joined with its activity, definition, category, BU and factor — one emissions row. */
export interface EmissionFactRow extends EmissionFact {
  measure: number;
  unit: string;
  method: CalculationModel['method'];
  confidence: number | null;
  factor: {
    id: string;
    name: string;
    sourceCode: string;
    unit: string | null;
    co2ePerUnit: number;
    region: string;
  } | null;
}

export interface CalculationRepository {
  listByDefinition(tenantId: string, adId: string): Promise<CalculationModel[]>;
  findByActivity(tenantId: string, activityId: string): Promise<CalculationModel | null>;
  /** Replace all non-overridden calculations of a definition (overrides are preserved). */
  replaceForDefinition(tenantId: string, adId: string, rows: NewCalculationModel[]): Promise<void>;
  upsert(row: NewCalculationModel): Promise<CalculationModel>;
  listByTenant(tenantId: string, filter?: { activityDefinitionIds?: string[] }): Promise<CalculationModel[]>;
  /** All emission rows of a tenant (optionally one activity). */
  listFacts(tenantId: string, activityId?: string): Promise<EmissionFactRow[]>;
  createOverride(row: NewEfOverrideModel): Promise<EfOverrideModel>;
  listOverrides(tenantId: string, activityId: string): Promise<EfOverrideModel[]>;
  revertOverrides(tenantId: string, activityId: string): Promise<number>;
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
  async listFacts(tenantId, activityId) {
    const rows = await db
      .select({
        c: calculations,
        description: activities.description,
        measure: activities.measure,
        unit: activities.unit,
        periodStart: activities.periodStart,
        periodEnd: activities.periodEnd,
        adName: activityDefinitions.name,
        categoryName: ghgCategories.name,
        orgUnitName: orgUnits.name,
        factorId: emissionFactors.id,
        factorName: emissionFactors.name,
        factorUnit: emissionFactors.unit,
        factorValue: emissionFactors.co2ePerUnit,
        factorRegion: emissionFactors.region,
        sourceCode: efSources.code,
      })
      .from(calculations)
      .innerJoin(activities, eq(activities.id, calculations.activityId))
      .innerJoin(activityDefinitions, eq(activityDefinitions.id, calculations.activityDefinitionId))
      .innerJoin(ghgCategories, eq(ghgCategories.id, calculations.categoryId))
      .leftJoin(orgUnits, eq(orgUnits.id, calculations.orgUnitId))
      .leftJoin(emissionFactors, eq(emissionFactors.id, calculations.factorId))
      .leftJoin(efSources, eq(efSources.id, emissionFactors.sourceId))
      .where(
        and(eq(calculations.tenantId, tenantId), activityId ? eq(calculations.activityId, activityId) : undefined),
      );
    return rows.map((r) => ({
      activityId: r.c.activityId,
      activityDefinitionId: r.c.activityDefinitionId,
      activityDefinitionName: r.adName,
      scope: r.c.scope as 1 | 2 | 3,
      categoryId: r.c.categoryId,
      categoryName: r.categoryName,
      orgUnitId: r.c.orgUnitId,
      orgUnitName: r.orgUnitName,
      description: r.description,
      measure: r.measure,
      unit: r.unit,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.c.status,
      method: r.c.method,
      confidence: r.c.confidence,
      co2eKg: r.c.co2eKg,
      factor: r.factorId
        ? {
            id: r.factorId,
            name: r.factorName!,
            sourceCode: r.sourceCode ?? '',
            unit: r.factorUnit,
            co2ePerUnit: r.factorValue!,
            region: r.factorRegion!,
          }
        : null,
    }));
  },
  async createOverride(row) {
    const [saved] = await db.insert(efOverrides).values(row).returning();
    return saved!;
  },
  listOverrides: (tenantId, activityId) =>
    db
      .select()
      .from(efOverrides)
      .where(and(eq(efOverrides.tenantId, tenantId), eq(efOverrides.activityId, activityId)))
      .orderBy(efOverrides.createdAt),
  async revertOverrides(tenantId, activityId) {
    const rows = await db
      .update(efOverrides)
      .set({ revertedAt: new Date() })
      .where(
        and(eq(efOverrides.tenantId, tenantId), eq(efOverrides.activityId, activityId), isNull(efOverrides.revertedAt)),
      )
      .returning({ id: efOverrides.id });
    return rows.length;
  },
});
