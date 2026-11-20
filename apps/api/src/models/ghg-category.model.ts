import { index, integer, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { industries } from './industry.model.js';
import { tenants } from './tenant.model.js';

/** GHG Protocol categories under Scopes 1–3. tenant_id NULL = system category; otherwise a tenant's custom one. */
export const ghgCategories = pgTable(
  'ghg_categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid().references(() => tenants.id, { onDelete: 'cascade' }),
    scope: smallint().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text().notNull().default(''),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('ghg_categories_tenant_code_unique').on(t.tenantId, t.code).nullsNotDistinct(),
    index('ghg_categories_scope_idx').on(t.scope),
  ],
);

/** Which system categories are recommended (and in what order) for each industry. */
export const industryCategories = pgTable(
  'industry_categories',
  {
    industryId: uuid()
      .notNull()
      .references(() => industries.id, { onDelete: 'cascade' }),
    categoryId: uuid()
      .notNull()
      .references(() => ghgCategories.id, { onDelete: 'cascade' }),
    rank: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.industryId, t.categoryId] })],
);

export type GhgCategoryModel = typeof ghgCategories.$inferSelect;
export type NewGhgCategoryModel = typeof ghgCategories.$inferInsert;
