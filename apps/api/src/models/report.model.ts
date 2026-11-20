import { date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orgUnits } from './org-unit.model.js';
import { tenants } from './tenant.model.js';

export const reportStatus = pgEnum('report_status', ['queued', 'generating', 'ready', 'failed']);

/** A generated ESG report (PDF) for a business unit, period and country format. */
export const reports = pgTable(
  'reports',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orgUnitId: uuid()
      .notNull()
      .references(() => orgUnits.id, { onDelete: 'cascade' }),
    format: text().notNull(),
    periodStart: date({ mode: 'string' }).notNull(),
    periodEnd: date({ mode: 'string' }).notNull(),
    status: reportStatus().notNull().default('queued'),
    fileKey: text(),
    error: text(),
    createdBy: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    generatedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('reports_tenant_idx').on(t.tenantId)],
);

export type ReportModel = typeof reports.$inferSelect;
export type NewReportModel = typeof reports.$inferInsert;
