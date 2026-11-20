import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { authTokens, type AuthTokenModel } from '../models/index.js';

type Purpose = AuthTokenModel['purpose'];

export interface AuthTokenRepository {
  create(data: { userId: string; purpose: Purpose; tokenHash: string; expiresAt: Date }): Promise<AuthTokenModel>;
  /** Unused, unexpired token with this hash. */
  findValid(purpose: Purpose, tokenHash: string, now?: Date): Promise<AuthTokenModel | null>;
  markUsed(id: string): Promise<void>;
  deleteForUser(userId: string, purpose: Purpose): Promise<void>;
}

export const createAuthTokenRepository = (db: DbExecutor): AuthTokenRepository => ({
  async create(data) {
    const [row] = await db.insert(authTokens).values(data).returning();
    return row!;
  },
  async findValid(purpose, tokenHash, now = new Date()) {
    const [row] = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.purpose, purpose),
          eq(authTokens.tokenHash, tokenHash),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  async markUsed(id) {
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, id));
  },
  async deleteForUser(userId, purpose) {
    await db.delete(authTokens).where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose)));
  },
});
