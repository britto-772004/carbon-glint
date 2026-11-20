import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { activities, activityDefinitions } from './activity.model.js';
import { ghgCategories } from './ghg-category.model.js';
import { orgUnits } from './org-unit.model.js';
import { tenants } from './tenant.model.js';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

/** A published emission factor database version (e.g. DEFRA_2026). Reference data — shared by all tenants. */
export const efSources = pgTable('ef_sources', {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  publisher: text().notNull(),
  name: text().notNull(),
  version: text().notNull(),
  year: integer().notNull(),
  licence: text().notNull(),
  url: text().notNull(),
  factorCount: integer().notNull().default(0),
  importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** One emission factor: kg CO2e (and per-gas kg CO2e) per unit of activity. Immutable once imported. */
export const emissionFactors = pgTable(
  'emission_factors',
  {
    id: uuid().primaryKey().defaultRandom(),
    sourceId: uuid()
      .notNull()
      .references(() => efSources.id, { onDelete: 'cascade' }),
    externalId: text().notNull(),
    name: text().notNull(),
    category: text().notNull().default(''),
    scopeHint: smallint(),
    region: text().notNull().default('GLOBAL'),
    year: integer().notNull(),
    /** Catalogue unit code (lib/units.ts); null when the published unit has no catalogue equivalent. */
    unit: text(),
    unitLabel: text().notNull(),
    co2ePerUnit: numeric({ precision: 24, scale: 10, mode: 'number' }).notNull(),
    co2PerUnit: numeric({ precision: 24, scale: 10, mode: 'number' }),
    ch4PerUnit: numeric({ precision: 24, scale: 10, mode: 'number' }),
    n2oPerUnit: numeric({ precision: 24, scale: 10, mode: 'number' }),
    citationUrl: text().notNull(),
    search: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce("name", '') || ' ' || coalesce("category", ''))`,
    ),
  },
  (t) => [
    unique('emission_factors_source_external_unique').on(t.sourceId, t.externalId),
    index('emission_factors_search_idx').using('gin', t.search),
    index('emission_factors_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`),
    index('emission_factors_unit_idx').on(t.unit),
  ],
);

export const calculationMethod = pgEnum('calculation_method', ['ai', 'search', 'override', 'none']);
export const calculationStatus = pgEnum('calculation_status', ['matched', 'needs_review', 'unmatched', 'overridden']);

/** The current emissions result for one activity (one row per activity; recalculation upserts). */
export const calculations = pgTable(
  'calculations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    activityId: uuid()
      .notNull()
      .unique()
      .references(() => activities.id, { onDelete: 'cascade' }),
    activityDefinitionId: uuid()
      .notNull()
      .references(() => activityDefinitions.id, { onDelete: 'cascade' }),
    orgUnitId: uuid().references(() => orgUnits.id, { onDelete: 'set null' }),
    scope: smallint().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => ghgCategories.id),
    factorId: uuid().references(() => emissionFactors.id, { onDelete: 'set null' }),
    method: calculationMethod().notNull(),
    status: calculationStatus().notNull(),
    confidence: real(),
    normalizedQuantity: numeric({ precision: 24, scale: 8, mode: 'number' }),
    conversionFactor: numeric({ precision: 24, scale: 12, mode: 'number' }),
    co2eKg: numeric({ precision: 24, scale: 6, mode: 'number' }).notNull().default(0),
    trace: text().notNull().default('{}'), // JSON (kept as text: written once, read whole)
    calculatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('calculations_tenant_idx').on(t.tenantId),
    index('calculations_ad_idx').on(t.activityDefinitionId),
    index('calculations_org_unit_idx').on(t.orgUnitId),
    index('calculations_status_idx').on(t.tenantId, t.status),
  ],
);

export type EfSourceModel = typeof efSources.$inferSelect;
export type EmissionFactorModel = typeof emissionFactors.$inferSelect;
export type NewEmissionFactorModel = typeof emissionFactors.$inferInsert;
export type CalculationModel = typeof calculations.$inferSelect;
export type NewCalculationModel = typeof calculations.$inferInsert;
