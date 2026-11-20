import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../errors/domain-errors.js';
import type { ServiceDeps } from './index.js';
import { ensureHeadquarters } from './org-unit.service.js';
import { toIndustryDto, toTenantDto } from './mappers.js';
import type { Actor } from './types.js';

export interface TenantService {
  listIndustries(): Promise<Schemas['Industry'][]>;
  getTenant(actor: Actor): Promise<Schemas['Tenant']>;
  completeOnboarding(actor: Actor, input: Schemas['OnboardingRequest']): Promise<Schemas['Tenant']>;
}

/** The tenant an admin belongs to (super admins have none). */
export const requireTenantId = (actor: Actor): string => {
  if (!actor.tenantId) throw new ForbiddenError('This action is only available inside a company account.');
  return actor.tenantId;
};

export const createTenantService = ({ repositories: repos }: ServiceDeps): TenantService => ({
  async listIndustries() {
    return (await repos.industries.list()).map(toIndustryDto);
  },

  async getTenant(actor) {
    const t = await repos.tenants.findById(requireTenantId(actor));
    if (!t) throw new NotFoundError('Company not found.');
    return toTenantDto(t.tenant, t.industry);
  },

  async completeOnboarding(actor, input) {
    const tenantId = requireTenantId(actor);
    return repos.transaction(async (tx) => {
      const current = await tx.tenants.findById(tenantId);
      if (!current) throw new NotFoundError('Company not found.');
      if (current.tenant.onboardedAt) {
        throw new ConflictError('Onboarding is already complete.', { code: 'ALREADY_ONBOARDED' });
      }
      const industry = await tx.industries.findById(input.industryId);
      if (!industry) throw new BusinessRuleError('Unknown industry.', { code: 'UNKNOWN_INDUSTRY' });

      const updated = await tx.tenants.update(tenantId, {
        name: input.companyName.trim(),
        industryId: industry.id,
        employeeBand: input.employeeBand,
        businessUnitCount: input.businessUnitCount,
        website: input.website,
        linkedinUrl: input.linkedinUrl,
        onboardedAt: new Date(),
      });
      await ensureHeadquarters(tx, tenantId, updated!.name);
      return toTenantDto(updated!, industry);
    });
  },
});
