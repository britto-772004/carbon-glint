import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import type { ServiceDeps } from './index.js';
import { toActivityDefinitionDto, toActivityDto, toDataSourceDto } from './mappers.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

type AD = Schemas['ActivityDefinition'];

export interface ActivityDefinitionService {
  list(actor: Actor, filter: { scope?: number; status?: Schemas['ActivityDefinitionStatus'] }): Promise<AD[]>;
  get(actor: Actor, id: string): Promise<Schemas['ActivityDefinitionDetail']>;
  create(actor: Actor, input: Schemas['CreateActivityDefinitionRequest']): Promise<AD>;
  update(actor: Actor, id: string, input: Schemas['UpdateActivityDefinitionRequest']): Promise<AD>;
  remove(actor: Actor, id: string): Promise<void>;
  publish(actor: Actor, id: string): Promise<AD>;
  listActivities(actor: Actor, id: string, page: { limit: number; offset: number }): Promise<Schemas['ActivityPage']>;
}

export const createActivityDefinitionService = ({
  repositories: repos,
  jobs,
  files,
}: ServiceDeps): ActivityDefinitionService => {
  const load = async (tenantId: string, id: string) => {
    const row = await repos.activityDefinitions.findById(tenantId, id);
    if (!row) throw new NotFoundError('Activity Definition not found.');
    return row;
  };

  const assertCategory = async (tenantId: string, categoryId: string, scope: number) => {
    const category = await repos.ghgCategories.findVisible(tenantId, categoryId);
    if (!category) throw new BusinessRuleError('Unknown GHG category.', { code: 'UNKNOWN_CATEGORY' });
    if (category.scope !== scope) {
      throw new BusinessRuleError(`"${category.name}" is a Scope ${category.scope} category.`, {
        code: 'SCOPE_MISMATCH',
      });
    }
  };
  const assertOrgUnit = async (tenantId: string, orgUnitId: string | null | undefined) => {
    if (orgUnitId && !(await repos.orgUnits.findById(tenantId, orgUnitId))) {
      throw new BusinessRuleError('Default business unit not found.', { code: 'UNKNOWN_ORG_UNIT' });
    }
  };
  const assertPeriod = (start: string, end: string) => {
    if (end < start) throw new BusinessRuleError('Period end is before period start.', { code: 'INVALID_PERIOD' });
  };

  return {
    async list(actor, filter) {
      return (await repos.activityDefinitions.list(requireTenantId(actor), filter)).map(toActivityDefinitionDto);
    },

    async get(actor, id) {
      const tenantId = requireTenantId(actor);
      const row = await load(tenantId, id);
      const sources = await repos.dataSources.listByDefinition(tenantId, id);
      return { definition: toActivityDefinitionDto(row), dataSources: sources.map(toDataSourceDto) };
    },

    async create(actor, input) {
      const tenantId = requireTenantId(actor);
      await assertCategory(tenantId, input.categoryId, input.scope);
      await assertOrgUnit(tenantId, input.defaultOrgUnitId);
      assertPeriod(input.periodStart, input.periodEnd);
      const created = await repos.activityDefinitions.create({
        tenantId,
        name: input.name.trim(),
        description: input.description?.trim() ?? '',
        scope: input.scope,
        categoryId: input.categoryId,
        defaultOrgUnitId: input.defaultOrgUnitId ?? null,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        createdBy: actor.userId,
      });
      return toActivityDefinitionDto(await load(tenantId, created.id));
    },

    async update(actor, id, input) {
      const tenantId = requireTenantId(actor);
      const { definition: current } = await load(tenantId, id);
      const classificationChanged =
        (input.scope !== undefined && input.scope !== current.scope) ||
        (input.categoryId !== undefined && input.categoryId !== current.categoryId);
      if (classificationChanged && current.status !== 'draft') {
        throw new BusinessRuleError('Scope and category can only change while the definition is a draft.', {
          code: 'DEFINITION_LOCKED',
        });
      }
      if (classificationChanged) {
        await assertCategory(tenantId, input.categoryId ?? current.categoryId, input.scope ?? current.scope);
      }
      await assertOrgUnit(tenantId, input.defaultOrgUnitId);
      assertPeriod(input.periodStart ?? current.periodStart, input.periodEnd ?? current.periodEnd);
      await repos.activityDefinitions.update(tenantId, id, {
        ...input,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      });
      return toActivityDefinitionDto(await load(tenantId, id));
    },

    async remove(actor, id) {
      const tenantId = requireTenantId(actor);
      const { definition } = await load(tenantId, id);
      if (definition.status !== 'draft') {
        throw new ConflictError('Only draft definitions can be deleted.', { code: 'DEFINITION_PUBLISHED' });
      }
      const sources = await repos.dataSources.listByDefinition(tenantId, id);
      await repos.activityDefinitions.delete(tenantId, id);
      await Promise.all(sources.map((s) => files.remove(s.fileKey)));
    },

    async publish(actor, id) {
      const tenantId = requireTenantId(actor);
      const row = await load(tenantId, id);
      if (row.activityCount === 0) {
        throw new BusinessRuleError('Import at least one data source before publishing.', { code: 'NO_ACTIVITIES' });
      }
      if (row.definition.status !== 'published') {
        await repos.activityDefinitions.update(tenantId, id, { status: 'published', publishedAt: new Date() });
      }
      await jobs.enqueue('calculation.run', { tenantId, activityDefinitionId: id });
      return toActivityDefinitionDto(await load(tenantId, id));
    },

    async listActivities(actor, id, page) {
      const tenantId = requireTenantId(actor);
      await load(tenantId, id);
      const { items, total } = await repos.activities.listByDefinition(tenantId, id, page);
      return { items: items.map(toActivityDto), total };
    },
  };
};
