import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.model.js';

export const orgUnitType = pgEnum('org_unit_type', [
  'hq',
  'branch',
  'plant',
  'office',
  'warehouse',
  'campus',
  'store',
  'other',
]);

/** Business units (branches, plants, campuses…) as a parent/child tree per tenant. */
export const orgUnits = pgTable(
  'org_units',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    parentId: uuid().references((): AnyPgColumn => orgUnits.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    code: text().notNull(),
    type: orgUnitType().notNull().default('branch'),
    country: text(), // ISO 3166-1 alpha-2
    city: text(),
    address: text(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('org_units_tenant_code_unique').on(t.tenantId, t.code),
    index('org_units_tenant_idx').on(t.tenantId),
    index('org_units_parent_idx').on(t.parentId),
  ],
);

export type OrgUnitModel = typeof orgUnits.$inferSelect;
export type NewOrgUnitModel = typeof orgUnits.$inferInsert;
