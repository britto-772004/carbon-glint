import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import type { AuthService } from './auth.service.js';
import type { ServiceDeps } from './index.js';
import { toTenantDto, toTenantSummaryDto, toUserDto } from './mappers.js';
import type { Actor } from './types.js';

export interface PlatformService {
  listTenants(filter: { q?: string; status?: Schemas['TenantStatus'] }): Promise<Schemas['TenantSummary'][]>;
  getTenant(tenantId: string): Promise<Schemas['TenantDetail']>;
  updateTenantStatus(tenantId: string, status: Schemas['TenantStatus']): Promise<Schemas['TenantSummary']>;
  updateUserStatus(actor: Actor, userId: string, status: 'active' | 'disabled'): Promise<Schemas['User']>;
  resendVerification(userId: string): Promise<void>;
}

/** Global super-admin console. Authorization (role = superadmin) is enforced by the spec's security scopes. */
export const createPlatformService = (
  { repositories: repos }: ServiceDeps,
  auth: Pick<AuthService, 'sendVerification'>,
): PlatformService => ({
  async listTenants(filter) {
    return (await repos.tenants.listSummaries(filter)).map(toTenantSummaryDto);
  },

  async getTenant(tenantId) {
    const t = await repos.tenants.findById(tenantId);
    if (!t) throw new NotFoundError('Company not found.');
    const users = await repos.users.listByTenant(tenantId);
    return { tenant: toTenantDto(t.tenant, t.industry), users: users.map(toUserDto) };
  },

  async updateTenantStatus(tenantId, status) {
    const updated = await repos.tenants.update(tenantId, { status });
    if (!updated) throw new NotFoundError('Company not found.');
    if (status === 'disabled') {
      for (const u of await repos.users.listByTenant(tenantId)) await repos.sessions.destroyAllForUser(u.id);
    }
    const summary = (await repos.tenants.listSummaries({})).find((s) => s.tenant.id === tenantId)!;
    return toTenantSummaryDto(summary);
  },

  async updateUserStatus(actor, userId, status) {
    const user = await repos.users.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    if (user.id === actor.userId) {
      throw new BusinessRuleError("You can't change your own status.", { code: 'CANNOT_CHANGE_SELF' });
    }
    if (user.status === 'pending') {
      throw new BusinessRuleError('This user has not verified their email yet.', { code: 'USER_PENDING' });
    }
    const updated = await repos.users.update(user.id, { status });
    if (status === 'disabled') await repos.sessions.destroyAllForUser(user.id);
    return toUserDto(updated!);
  },

  async resendVerification(userId) {
    const user = await repos.users.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    if (user.status !== 'pending')
      throw new ConflictError('This user is already verified.', { code: 'ALREADY_VERIFIED' });
    await auth.sendVerification(user);
  },
});
