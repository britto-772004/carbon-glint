import { and, desc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { reports, type NewReportModel, type ReportModel } from '../models/index.js';

export interface ReportRepository {
  list(tenantId: string): Promise<ReportModel[]>;
  findById(tenantId: string, id: string): Promise<ReportModel | null>;
  findForJob(id: string): Promise<ReportModel | null>;
  create(data: NewReportModel): Promise<ReportModel>;
  update(id: string, data: Partial<NewReportModel>): Promise<ReportModel | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

export const createReportRepository = (db: DbExecutor): ReportRepository => ({
  list: (tenantId) => db.select().from(reports).where(eq(reports.tenantId, tenantId)).orderBy(desc(reports.createdAt)),
  async findById(tenantId, id) {
    const [r] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.tenantId, tenantId), eq(reports.id, id)))
      .limit(1);
    return r ?? null;
  },
  async findForJob(id) {
    const [r] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return r ?? null;
  },
  async create(data) {
    const [r] = await db.insert(reports).values(data).returning();
    return r!;
  },
  async update(id, data) {
    const [r] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return r ?? null;
  },
  async delete(tenantId, id) {
    const rows = await db
      .delete(reports)
      .where(and(eq(reports.tenantId, tenantId), eq(reports.id, id)))
      .returning({ id: reports.id });
    return rows.length > 0;
  },
});
