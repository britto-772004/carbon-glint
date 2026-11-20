import { and, asc, count, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { orgUnits, type NewOrgUnitModel, type OrgUnitModel } from '../models/index.js';

export interface OrgUnitRepository {
  listByTenant(tenantId: string): Promise<OrgUnitModel[]>;
  findById(tenantId: string, id: string): Promise<OrgUnitModel | null>;
  findByCode(tenantId: string, code: string): Promise<OrgUnitModel | null>;
  create(data: NewOrgUnitModel): Promise<OrgUnitModel>;
  update(tenantId: string, id: string, data: Partial<NewOrgUnitModel>): Promise<OrgUnitModel | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  countChildren(tenantId: string, id: string): Promise<number>;
}

export const createOrgUnitRepository = (db: DbExecutor): OrgUnitRepository => ({
  listByTenant: (tenantId) =>
    db.select().from(orgUnits).where(eq(orgUnits.tenantId, tenantId)).orderBy(asc(orgUnits.createdAt)),
  async findById(tenantId, id) {
    const [row] = await db
      .select()
      .from(orgUnits)
      .where(and(eq(orgUnits.tenantId, tenantId), eq(orgUnits.id, id)))
      .limit(1);
    return row ?? null;
  },
  async findByCode(tenantId, code) {
    const [row] = await db
      .select()
      .from(orgUnits)
      .where(and(eq(orgUnits.tenantId, tenantId), eq(orgUnits.code, code)))
      .limit(1);
    return row ?? null;
  },
  async create(data) {
    const [row] = await db.insert(orgUnits).values(data).returning();
    return row!;
  },
  async update(tenantId, id, data) {
    const [row] = await db
      .update(orgUnits)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(orgUnits.tenantId, tenantId), eq(orgUnits.id, id)))
      .returning();
    return row ?? null;
  },
  async delete(tenantId, id) {
    const rows = await db
      .delete(orgUnits)
      .where(and(eq(orgUnits.tenantId, tenantId), eq(orgUnits.id, id)))
      .returning({ id: orgUnits.id });
    return rows.length > 0;
  },
  async countChildren(tenantId, id) {
    const [row] = await db
      .select({ n: count() })
      .from(orgUnits)
      .where(and(eq(orgUnits.tenantId, tenantId), eq(orgUnits.parentId, id)));
    return Number(row?.n ?? 0);
  },
});
