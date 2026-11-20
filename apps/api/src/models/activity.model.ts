import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { ghgCategories } from './ghg-category.model.js';
import { orgUnits } from './org-unit.model.js';
import { tenants } from './tenant.model.js';
import { users } from './user.model.js';

export const activityDefinitionStatus = pgEnum('activity_definition_status', ['draft', 'published', 'archived']);
export const dataSourceStatus = pgEnum('data_source_status', ['uploaded', 'importing', 'imported', 'failed']);
export const mappingMode = pgEnum('mapping_mode', ['ai', 'manual']);

/** A named, classified emission source (scope + GHG category) fed by one or more data sources. */
export const activityDefinitions = pgTable(
  'activity_definitions',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    scope: smallint().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => ghgCategories.id),
    defaultOrgUnitId: uuid().references(() => orgUnits.id, { onDelete: 'set null' }),
    periodStart: date({ mode: 'string' }).notNull(),
    periodEnd: date({ mode: 'string' }).notNull(),
    status: activityDefinitionStatus().notNull().default('draft'),
    publishedAt: timestamp({ withTimezone: true }),
    createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_definitions_tenant_idx').on(t.tenantId)],
);

export interface ColumnMapping {
  description: string | null;
  measure: string | null;
  unit: string | null;
  location: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  spend: string | null;
  currency: string | null;
}

export interface RowError {
  row: number;
  field: string;
  message: string;
}

/** An uploaded CSV/XLSX sheet and how its columns map to GHG activity fields. */
export const dataSources = pgTable(
  'data_sources',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    activityDefinitionId: uuid()
      .notNull()
      .references(() => activityDefinitions.id, { onDelete: 'cascade' }),
    fileKey: text().notNull(),
    fileName: text().notNull(),
    fileType: text().$type<'csv' | 'xlsx'>().notNull(),
    fileSize: integer().notNull(),
    sheets: jsonb().$type<string[]>().notNull().default([]),
    sheetName: text(),
    headerRow: integer().notNull().default(1),
    columns: jsonb().$type<string[]>().notNull().default([]),
    preview: jsonb().$type<string[][]>().notNull().default([]),
    rowCount: integer().notNull().default(0),
    mapping: jsonb().$type<ColumnMapping>(),
    mappingMode: mappingMode(),
    status: dataSourceStatus().notNull().default('uploaded'),
    importedCount: integer().notNull().default(0),
    errorCount: integer().notNull().default(0),
    errors: jsonb().$type<RowError[]>().notNull().default([]),
    importedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('data_sources_ad_idx').on(t.activityDefinitionId)],
);

/** One row of activity data. */
export const activities = pgTable(
  'activities',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    activityDefinitionId: uuid()
      .notNull()
      .references(() => activityDefinitions.id, { onDelete: 'cascade' }),
    dataSourceId: uuid()
      .notNull()
      .references(() => dataSources.id, { onDelete: 'cascade' }),
    rowNumber: integer().notNull(),
    description: text().notNull(),
    location: text(),
    measure: numeric({ precision: 20, scale: 6, mode: 'number' }).notNull(),
    unit: text().notNull(),
    orgUnitId: uuid().references(() => orgUnits.id, { onDelete: 'set null' }),
    periodStart: date({ mode: 'string' }).notNull(),
    periodEnd: date({ mode: 'string' }).notNull(),
    spend: numeric({ precision: 20, scale: 4, mode: 'number' }),
    currency: text(),
    extra: jsonb().$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activities_tenant_idx').on(t.tenantId),
    index('activities_ad_idx').on(t.activityDefinitionId),
    index('activities_ds_idx').on(t.dataSourceId),
    index('activities_org_unit_idx').on(t.orgUnitId),
  ],
);

export type ActivityDefinitionModel = typeof activityDefinitions.$inferSelect;
export type NewActivityDefinitionModel = typeof activityDefinitions.$inferInsert;
export type DataSourceModel = typeof dataSources.$inferSelect;
export type NewDataSourceModel = typeof dataSources.$inferInsert;
export type ActivityModel = typeof activities.$inferSelect;
export type NewActivityModel = typeof activities.$inferInsert;
