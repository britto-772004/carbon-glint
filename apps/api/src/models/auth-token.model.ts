import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './user.model.js';

export const authTokenPurpose = pgEnum('auth_token_purpose', ['verify_email']);

/** One-time tokens (only the SHA-256 hash is stored). */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: authTokenPurpose().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId)],
);

export type AuthTokenModel = typeof authTokens.$inferSelect;
