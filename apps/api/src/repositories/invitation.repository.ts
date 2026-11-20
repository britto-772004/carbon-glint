import { and, desc, eq, isNull } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { invitations, tenants, type InvitationModel, type TenantModel } from '../models/index.js';

export interface InvitationRepository {
  create(data: {
    tenantId: string;
    email: string;
    tokenHash: string;
    invitedBy: string | null;
    expiresAt: Date;
  }): Promise<InvitationModel>;
  findById(tenantId: string, id: string): Promise<InvitationModel | null>;
  /** Open (not accepted, not revoked) invitation by token hash, with its tenant. Expiry is checked by the service. */
  findOpenByTokenHash(tokenHash: string): Promise<{ invitation: InvitationModel; tenant: TenantModel } | null>;
  findOpenByEmail(tenantId: string, email: string): Promise<InvitationModel | null>;
  listByTenant(tenantId: string): Promise<InvitationModel[]>;
  update(
    id: string,
    data: Partial<Pick<InvitationModel, 'tokenHash' | 'expiresAt' | 'acceptedAt' | 'revokedAt'>>,
  ): Promise<InvitationModel | null>;
}

const open = () => and(isNull(invitations.acceptedAt), isNull(invitations.revokedAt));

export const createInvitationRepository = (db: DbExecutor): InvitationRepository => ({
  async create(data) {
    const [row] = await db.insert(invitations).values(data).returning();
    return row!;
  },
  async findById(tenantId, id) {
    const [row] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenantId), eq(invitations.id, id)))
      .limit(1);
    return row ?? null;
  },
  async findOpenByTokenHash(tokenHash) {
    const [row] = await db
      .select({ invitation: invitations, tenant: tenants })
      .from(invitations)
      .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
      .where(and(eq(invitations.tokenHash, tokenHash), open()))
      .limit(1);
    return row ?? null;
  },
  async findOpenByEmail(tenantId, email) {
    const [row] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenantId), eq(invitations.email, email), open()))
      .limit(1);
    return row ?? null;
  },
  listByTenant: (tenantId) =>
    db.select().from(invitations).where(eq(invitations.tenantId, tenantId)).orderBy(desc(invitations.createdAt)),
  async update(id, data) {
    const [row] = await db.update(invitations).set(data).where(eq(invitations.id, id)).returning();
    return row ?? null;
  },
});
