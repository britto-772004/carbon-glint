import type { Schemas } from '@carbon-glint/api-spec';
import { ConflictError } from '../errors/domain-errors.js';
import type { ServiceDeps } from './index.js';
import { toGhgCategoryDto } from './mappers.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

export interface TaxonomyService {
  listCategories(actor: Actor, scope?: number): Promise<Schemas['GhgCategory'][]>;
  createCategory(actor: Actor, input: Schemas['CreateGhgCategoryRequest']): Promise<Schemas['GhgCategory']>;
}

const slug = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);

export const createTaxonomyService = ({ repositories: repos }: ServiceDeps): TaxonomyService => ({
  async listCategories(actor, scope) {
    const tenantId = requireTenantId(actor);
    const tenant = await repos.tenants.findById(tenantId);
    const rows = await repos.ghgCategories.listForTenant(tenantId, tenant?.tenant.industryId ?? null, scope);
    // Within a scope: recommended (by rank) → other system categories → custom ones.
    return rows
      .sort(
        (a, b) =>
          a.category.scope - b.category.scope ||
          (a.rank ?? 1e6) - (b.rank ?? 1e6) ||
          Number(a.category.tenantId !== null) - Number(b.category.tenantId !== null) ||
          a.category.sortOrder - b.category.sortOrder ||
          a.category.name.localeCompare(b.category.name),
      )
      .map((r) => toGhgCategoryDto(r.category, r.rank));
  },

  async createCategory(actor, input) {
    const tenantId = requireTenantId(actor);
    const code = `S${input.scope}_CUSTOM_${slug(input.name)}`;
    if (await repos.ghgCategories.findByCode(tenantId, code)) {
      throw new ConflictError(`A Scope ${input.scope} category called "${input.name}" already exists.`, {
        code: 'CATEGORY_EXISTS',
      });
    }
    const row = await repos.ghgCategories.create({
      tenantId,
      scope: input.scope,
      code,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      sortOrder: 1000,
    });
    return toGhgCategoryDto(row, null);
  },
});
