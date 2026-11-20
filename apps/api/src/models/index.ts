/**
 * MODELS — Drizzle table definitions + their inferred row types. Nothing else.
 *
 * One file per aggregate (e.g. `project.model.ts`), re-exported here:
 *
 *   export const projects = pgTable('projects', { id: uuid().primaryKey().defaultRandom(), ... });
 *   export type ProjectModel = typeof projects.$inferSelect;
 *   export type NewProjectModel = typeof projects.$inferInsert;
 *
 * After changing a model: `pnpm db:generate` → review SQL in ./drizzle → commit.
 */
export {};
