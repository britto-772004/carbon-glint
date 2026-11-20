import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { ghgCategories, industryCategories, type GhgCategoryModel, type NewGhgCategoryModel } from '../models/index.js';

export interface CategoryWithRank {
  category: GhgCategoryModel;
  rank: number | null;
}

export interface GhgCategoryRepository {
  /** System + tenant categories, with the industry recommendation rank (null = not recommended). */
  listForTenant(tenantId: string, industryId: string | null, scope?: number): Promise<CategoryWithRank[]>;
  findVisible(tenantId: string, id: string): Promise<GhgCategoryModel | null>;
  findByCode(tenantId: string | null, code: string): Promise<GhgCategoryModel | null>;
  create(data: NewGhgCategoryModel): Promise<GhgCategoryModel>;
}

const visibleTo = (tenantId: string) => or(isNull(ghgCategories.tenantId), eq(ghgCategories.tenantId, tenantId));

export const createGhgCategoryRepository = (db: DbExecutor): GhgCategoryRepository => ({
  async listForTenant(tenantId, industryId, scope) {
    const rows = await db
      .select({ category: ghgCategories, rank: industryCategories.rank })
      .from(ghgCategories)
      .leftJoin(
        industryCategories,
        and(
          eq(industryCategories.categoryId, ghgCategories.id),
          industryId ? eq(industryCategories.industryId, industryId) : isNull(industryCategories.industryId),
        ),
      )
      .where(and(visibleTo(tenantId), scope ? eq(ghgCategories.scope, scope) : undefined))
      .orderBy(asc(ghgCategories.scope), asc(ghgCategories.sortOrder), asc(ghgCategories.name));
    return rows.map((r) => ({ category: r.category, rank: r.rank ?? null }));
  },
  async findVisible(tenantId, id) {
    const [row] = await db
      .select()
      .from(ghgCategories)
      .where(and(eq(ghgCategories.id, id), visibleTo(tenantId)))
      .limit(1);
    return row ?? null;
  },
  async findByCode(tenantId, code) {
    const [row] = await db
      .select()
      .from(ghgCategories)
      .where(
        and(
          eq(ghgCategories.code, code),
          tenantId ? eq(ghgCategories.tenantId, tenantId) : isNull(ghgCategories.tenantId),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  async create(data) {
    const [row] = await db.insert(ghgCategories).values(data).returning();
    return row!;
  },
});
