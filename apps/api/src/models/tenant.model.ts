import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { industries } from './industry.model.js';

export const tenantStatus = pgEnum('tenant_status', ['active', 'disabled']);
export const employeeBand = pgEnum('employee_band', ['1-50', '51-250', '251-1000', '1001-5000', '5000+']);

export const tenants = pgTable('tenants', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  emailDomain: text().notNull().unique(),
  status: tenantStatus().notNull().default('active'),
  industryId: uuid().references(() => industries.id),
  employeeBand: employeeBand(),
  businessUnitCount: integer(),
  website: text(),
  linkedinUrl: text(),
  onboardedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type TenantModel = typeof tenants.$inferSelect;
export type NewTenantModel = typeof tenants.$inferInsert;
