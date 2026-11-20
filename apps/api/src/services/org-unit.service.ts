import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import type { OrgUnitModel } from '../models/index.js';
import type { Repositories } from '../repositories/index.js';
import type { ServiceDeps } from './index.js';
import { toOrgUnitDto } from './mappers.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

type OrgUnit = Schemas['OrgUnit'];

export interface OrgUnitService {
  list(actor: Actor): Promise<OrgUnit[]>;
  create(actor: Actor, input: Schemas['CreateOrgUnitRequest']): Promise<OrgUnit>;
  update(actor: Actor, id: string, input: Schemas['UpdateOrgUnitRequest']): Promise<OrgUnit>;
  remove(actor: Actor, id: string): Promise<void>;
}

/** All descendant ids of `rootId` (inclusive) — used for cycle checks and BU roll-ups. */
export function subtreeIds(units: Pick<OrgUnitModel, 'id' | 'parentId'>[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const u of units) {
    if (u.parentId) children.set(u.parentId, [...(children.get(u.parentId) ?? []), u.id]);
  }
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** Creates the root HQ unit for a newly onboarded tenant (idempotent). */
export async function ensureHeadquarters(repos: Repositories, tenantId: string, companyName: string) {
  if ((await repos.orgUnits.listByTenant(tenantId)).length > 0) return;
  await repos.orgUnits.create({ tenantId, name: `${companyName} HQ`, code: 'HQ', type: 'hq' });
}

export const createOrgUnitService = ({ repositories: repos }: ServiceDeps): OrgUnitService => {
  const assertCodeFree = async (tenantId: string, code: string, exceptId?: string) => {
    const existing = await repos.orgUnits.findByCode(tenantId, code);
    if (existing && existing.id !== exceptId) {
      throw new ConflictError(`Code "${code}" is already used by ${existing.name}.`, { code: 'CODE_TAKEN' });
    }
  };
  const assertParent = async (tenantId: string, parentId: string | null | undefined) => {
    if (!parentId) return;
    if (!(await repos.orgUnits.findById(tenantId, parentId))) {
      throw new BusinessRuleError('Parent business unit not found.', { code: 'PARENT_NOT_FOUND' });
    }
  };

  return {
    async list(actor) {
      return (await repos.orgUnits.listByTenant(requireTenantId(actor))).map(toOrgUnitDto);
    },

    async create(actor, input) {
      const tenantId = requireTenantId(actor);
      const code = input.code.trim();
      await assertParent(tenantId, input.parentId);
      await assertCodeFree(tenantId, code);
      const row = await repos.orgUnits.create({
        tenantId,
        parentId: input.parentId ?? null,
        name: input.name.trim(),
        code,
        type: input.type,
        country: input.country ?? null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
      });
      return toOrgUnitDto(row);
    },

    async update(actor, id, input) {
      const tenantId = requireTenantId(actor);
      const current = await repos.orgUnits.findById(tenantId, id);
      if (!current) throw new NotFoundError('Business unit not found.');

      if (input.parentId !== undefined && input.parentId !== current.parentId) {
        await assertParent(tenantId, input.parentId);
        if (input.parentId && subtreeIds(await repos.orgUnits.listByTenant(tenantId), id).has(input.parentId)) {
          throw new BusinessRuleError("A unit can't be moved under itself or one of its own sub-units.", {
            code: 'ORG_UNIT_CYCLE',
          });
        }
      }
      if (input.code !== undefined) await assertCodeFree(tenantId, input.code.trim(), id);

      const updated = await repos.orgUnits.update(tenantId, id, {
        ...input,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim() } : {}),
        ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      });
      return toOrgUnitDto(updated!);
    },

    async remove(actor, id) {
      const tenantId = requireTenantId(actor);
      if (!(await repos.orgUnits.findById(tenantId, id))) throw new NotFoundError('Business unit not found.');
      if ((await repos.orgUnits.countChildren(tenantId, id)) > 0) {
        throw new ConflictError('Move or delete its sub-units first.', { code: 'ORG_UNIT_HAS_CHILDREN' });
      }
      if ((await repos.activities.countByOrgUnit(tenantId, id)) > 0) {
        throw new ConflictError('Activities are recorded against this unit.', { code: 'ORG_UNIT_IN_USE' });
      }
      await repos.orgUnits.delete(tenantId, id);
    },
  };
};
