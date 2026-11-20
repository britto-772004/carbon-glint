import { sql } from 'drizzle-orm';
import { boolean, check, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.model.js';

export const userRole = pgEnum('user_role', ['superadmin', 'admin']);
export const userStatus = pgEnum('user_status', ['pending', 'active', 'disabled']);

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Null only for the global super admin. */
    tenantId: uuid().references(() => tenants.id, { onDelete: 'cascade' }),
    email: text().notNull().unique(),
    name: text().notNull(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default('admin'),
    status: userStatus().notNull().default('pending'),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    passwordIsTemporary: boolean().notNull().default(false),
    lastLoginAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('users_tenant_idx').on(t.tenantId),
    check('users_superadmin_has_no_tenant', sql`(${t.role} = 'superadmin') = (${t.tenantId} is null)`),
  ],
);

export type UserModel = typeof users.$inferSelect;
export type NewUserModel = typeof users.$inferInsert;
