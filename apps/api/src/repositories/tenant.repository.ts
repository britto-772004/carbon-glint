import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import {
  industries,
  tenants,
  users,
  type IndustryModel,
  type NewTenantModel,
  type TenantModel,
} from '../models/index.js';

export interface TenantWithIndustry {
  tenant: TenantModel;
  industry: IndustryModel | null;
}

export interface TenantSummaryRow extends TenantWithIndustry {
  userCount: number;
}

export interface TenantRepository {
  findById(id: string): Promise<TenantWithIndustry | null>;
  findByDomain(domain: string): Promise<TenantModel | null>;
  create(data: NewTenantModel): Promise<TenantModel>;
  update(id: string, data: Partial<NewTenantModel>): Promise<TenantModel | null>;
  listSummaries(filter: { q?: string; status?: TenantModel['status'] }): Promise<TenantSummaryRow[]>;
}

export const createTenantRepository = (db: DbExecutor): TenantRepository => ({
  async findById(id) {
    const [row] = await db
      .select({ tenant: tenants, industry: industries })
      .from(tenants)
      .leftJoin(industries, eq(industries.id, tenants.industryId))
      .where(eq(tenants.id, id))
      .limit(1);
    return row ?? null;
  },

  async findByDomain(domain) {
    const [row] = await db.select().from(tenants).where(eq(tenants.emailDomain, domain)).limit(1);
    return row ?? null;
  },

  async create(data) {
    const [row] = await db.insert(tenants).values(data).returning();
    return row!;
  },

  async update(id, data) {
    const [row] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return row ?? null;
  },

  async listSummaries({ q, status }) {
    const where: SQL[] = [];
    if (q) where.push(or(ilike(tenants.name, `%${q}%`), ilike(tenants.emailDomain, `%${q}%`))!);
    if (status) where.push(eq(tenants.status, status));
    const rows = await db
      .select({ tenant: tenants, industry: industries, userCount: count(users.id) })
      .from(tenants)
      .leftJoin(industries, eq(industries.id, tenants.industryId))
      .leftJoin(users, eq(users.tenantId, tenants.id))
      .where(where.length ? and(...where) : undefined)
      .groupBy(tenants.id, industries.id)
      .orderBy(desc(tenants.createdAt));
    return rows.map((r) => ({ ...r, userCount: Number(r.userCount) }));
  },
});
