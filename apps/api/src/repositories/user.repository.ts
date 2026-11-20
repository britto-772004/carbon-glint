import { and, asc, eq, ne } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { users, type NewUserModel, type UserModel } from '../models/index.js';

export interface UserRepository {
  findById(id: string): Promise<UserModel | null>;
  findByEmail(email: string): Promise<UserModel | null>;
  create(data: NewUserModel): Promise<UserModel>;
  update(id: string, data: Partial<NewUserModel>): Promise<UserModel | null>;
  listByTenant(tenantId: string): Promise<UserModel[]>;
  /** Active, verified users of a tenant (optionally excluding one user). */
  countActive(tenantId: string, excludeUserId?: string): Promise<number>;
}

export const createUserRepository = (db: DbExecutor): UserRepository => ({
  async findById(id) {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },
  async findByEmail(email) {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  },
  async create(data) {
    const [row] = await db.insert(users).values(data).returning();
    return row!;
  },
  async update(id, data) {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  },
  listByTenant: (tenantId) => db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.createdAt)),
  async countActive(tenantId, excludeUserId) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.status, 'active'),
          excludeUserId ? ne(users.id, excludeUserId) : undefined,
        ),
      );
    return rows.length;
  },
});
