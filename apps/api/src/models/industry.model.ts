import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const industries = pgTable('industries', {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  name: text().notNull(),
});

export type IndustryModel = typeof industries.$inferSelect;
