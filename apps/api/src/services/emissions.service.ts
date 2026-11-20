import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, NotFoundError } from '../errors/domain-errors.js';
import { conversionFactor, findUnit, normalizeUnit } from '../lib/units.js';
import type { EfSourceModel, EmissionFactorModel } from '../models/index.js';
import type { EmissionFactRow } from '../repositories/calculation.repository.js';
import type { CalculationService, CalculationTrace } from './calculation.service.js';
import {
  applyFilters,
  heatmap,
  orgTree,
  summary,
  type Bucket,
  type EmissionFilters,
  type GroupBy,
} from './emission-aggregates.js';
import { compatibleUnits } from './factor-matching.js';
import type { ServiceDeps } from './index.js';
import { subtreeIds } from './org-unit.service.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

export interface EmissionQuery {
  scope?: number;
  categoryId?: string;
  activityDefinitionId?: string;
  orgUnitId?: string;
  status?: Schemas['CalculationStatus'];
  from?: string;
  to?: string;
}

export interface EmissionsService {
  listSources(): Promise<Schemas['EmissionFactorSource'][]>;
  searchFactors(q: { q: string; unit?: string; scope?: number; limit?: number }): Promise<Schemas['FactorSearchHit'][]>;
  getFactor(id: string): Promise<Schemas['EmissionFactor']>;
  list(actor: Actor, q: EmissionQuery, page: { limit: number; offset: number }): Promise<Schemas['EmissionPage']>;
  summary(actor: Actor, q: EmissionQuery): Promise<Schemas['EmissionSummary']>;
  heatmap(actor: Actor, q: EmissionQuery, groupBy: GroupBy, bucket: Bucket): Promise<Schemas['Heatmap']>;
  orgTree(actor: Actor, q: EmissionQuery): Promise<Schemas['OrgEmissionNode'][]>;
  trace(actor: Actor, activityId: string): Promise<Schemas['EmissionTrace']>;
  override(actor: Actor, activityId: string, input: Schemas['OverrideRequest']): Promise<Schemas['EmissionRow']>;
  revert(actor: Actor, activityId: string): Promise<Schemas['EmissionRow']>;
  bulkOverride(actor: Actor, input: Schemas['BulkOverrideRequest']): Promise<Schemas['EmissionRow'][]>;
}

const toFactorDto = (f: EmissionFactorModel, s: EfSourceModel): Schemas['EmissionFactor'] => ({
  id: f.id,
  sourceCode: s.code,
  sourceName: s.name,
  externalId: f.externalId,
  name: f.name,
  category: f.category,
  scopeHint: f.scopeHint,
  region: f.region,
  year: f.year,
  unit: f.unit,
  unitLabel: f.unitLabel,
  co2ePerUnit: f.co2ePerUnit,
  co2PerUnit: f.co2PerUnit,
  ch4PerUnit: f.ch4PerUnit,
  n2oPerUnit: f.n2oPerUnit,
  citationUrl: f.citationUrl,
});

const toRowDto = (r: EmissionFactRow): Schemas['EmissionRow'] => ({
  activityId: r.activityId,
  activityDefinitionId: r.activityDefinitionId,
  activityDefinitionName: r.activityDefinitionName,
  scope: r.scope,
  categoryId: r.categoryId,
  categoryName: r.categoryName,
  orgUnitId: r.orgUnitId,
  orgUnitName: r.orgUnitName,
  description: r.description,
  measure: r.measure,
  unit: r.unit,
  periodStart: r.periodStart,
  periodEnd: r.periodEnd,
  factor: r.factor,
  method: r.method,
  status: r.status,
  confidence: r.confidence,
  co2eKg: Math.round(r.co2eKg * 1e6) / 1e6,
});

export const createEmissionsService = (
  { repositories: repos }: ServiceDeps,
  calculations: Pick<CalculationService, 'recalculateActivity'>,
): EmissionsService => {
  const filtersFor = async (tenantId: string, q: EmissionQuery): Promise<EmissionFilters> => ({
    ...q,
    orgUnitIds: q.orgUnitId ? subtreeIds(await repos.orgUnits.listByTenant(tenantId), q.orgUnitId) : undefined,
  });
  const facts = async (tenantId: string, q: EmissionQuery) =>
    applyFilters(await repos.calculations.listFacts(tenantId), await filtersFor(tenantId, q)) as EmissionFactRow[];
  const rowFor = async (tenantId: string, activityId: string) => {
    const [row] = await repos.calculations.listFacts(tenantId, activityId);
    if (!row) throw new NotFoundError('No calculation for this activity yet.');
    return row;
  };

  const applyOverride = async (
    actor: Actor,
    tenantId: string,
    activityId: string,
    input: Schemas['OverrideRequest'],
  ): Promise<Schemas['EmissionRow']> => {
    const activity = await repos.activities.findById(tenantId, activityId);
    const current = await repos.calculations.findByActivity(tenantId, activityId);
    if (!activity || !current) throw new NotFoundError('No calculation for this activity yet.');

    let co2eKg: number;
    let factorId: string | null = null;
    let conv: number | null = null;
    let factorTrace: CalculationTrace['factor'] = null;
    if (input.type === 'factor') {
      if (!input.factorId) throw new BusinessRuleError('Choose a library factor.', { code: 'FACTOR_REQUIRED' });
      const found = await repos.emissionFactors.findById(input.factorId);
      if (!found) throw new BusinessRuleError('Unknown emission factor.', { code: 'UNKNOWN_FACTOR' });
      conv = found.factor.unit ? conversionFactor(activity.unit, found.factor.unit) : null;
      if (conv === null) {
        throw new BusinessRuleError(
          `This factor is per ${found.factor.unitLabel}; the activity is in ${activity.unit}.`,
          { code: 'UNIT_INCOMPATIBLE' },
        );
      }
      co2eKg = activity.measure * conv * found.factor.co2ePerUnit;
      factorId = found.factor.id;
      const f = found.factor;
      factorTrace = {
        id: f.id,
        sourceCode: found.source.code,
        sourceName: found.source.name,
        publisher: found.source.publisher,
        licence: found.source.licence,
        externalId: f.externalId,
        name: f.name,
        category: f.category,
        region: f.region,
        year: f.year,
        unit: f.unit,
        co2ePerUnit: f.co2ePerUnit,
        gases: { co2: f.co2PerUnit, ch4: f.ch4PerUnit, n2o: f.n2oPerUnit },
        citationUrl: f.citationUrl,
      };
    } else if (input.type === 'custom_factor') {
      const unit = input.unit ? (findUnit(input.unit) ?? normalizeUnit(input.unit)) : null;
      if (input.value === undefined || !unit) {
        throw new BusinessRuleError('A custom factor needs a value and a unit.', { code: 'CUSTOM_FACTOR_INCOMPLETE' });
      }
      conv = conversionFactor(activity.unit, unit.code);
      if (conv === null)
        throw new BusinessRuleError(`Can't convert ${activity.unit} to ${unit.code}.`, { code: 'UNIT_INCOMPATIBLE' });
      co2eKg = activity.measure * conv * input.value;
    } else {
      if (input.value === undefined)
        throw new BusinessRuleError('Enter the result in kg CO2e.', { code: 'VALUE_REQUIRED' });
      co2eKg = input.value;
    }

    const now = new Date().toISOString();
    const trace = JSON.parse(current.trace || '{}') as CalculationTrace;
    trace.override = {
      type: input.type,
      reason: input.reason,
      by: actor.userId,
      at: now,
      previousCo2eKg: current.co2eKg,
    };
    if (factorTrace) trace.factor = factorTrace;
    if (input.type === 'custom_factor') {
      trace.factor = null;
      trace.conversion = {
        from: activity.unit,
        to: input.unit!,
        factor: conv!,
        normalizedQuantity: activity.measure * conv!,
      };
    }
    trace.result = {
      co2eKg,
      formula:
        input.type === 'custom_result'
          ? `Entered manually: ${co2eKg} kg CO2e`
          : `${activity.measure} ${activity.unit} × ${conv} × ${input.type === 'factor' ? factorTrace!.co2ePerUnit : input.value} kg CO2e/unit`,
    };

    await repos.calculations.upsert({
      tenantId,
      activityId,
      activityDefinitionId: current.activityDefinitionId,
      orgUnitId: current.orgUnitId,
      scope: current.scope,
      categoryId: current.categoryId,
      factorId,
      method: 'override',
      status: 'overridden',
      confidence: 1,
      normalizedQuantity: conv !== null ? activity.measure * conv : null,
      conversionFactor: conv,
      co2eKg,
      trace: JSON.stringify(trace),
    });
    await repos.calculations.createOverride({
      tenantId,
      activityId,
      type: input.type,
      factorId,
      value: input.value ?? null,
      unit: input.unit ?? null,
      citation: input.citation ?? null,
      reason: input.reason,
      previousCo2eKg: current.co2eKg,
      newCo2eKg: co2eKg,
      createdBy: actor.userId,
    });
    return toRowDto(await rowFor(tenantId, activityId));
  };

  return {
    async listSources() {
      return (await repos.emissionFactors.listSources()).map((s) => ({ ...s, importedAt: s.importedAt.toISOString() }));
    },

    async searchFactors({ q, unit, scope, limit }) {
      const hits = await repos.emissionFactors.search({
        query: q,
        units: unit ? compatibleUnits(unit) : undefined,
        scopeHint: scope,
        limit,
      });
      return hits.map((h) => ({ factor: toFactorDto(h.factor, h.source), score: Number(h.score.toFixed(4)) }));
    },

    async getFactor(id) {
      const found = await repos.emissionFactors.findById(id);
      if (!found) throw new NotFoundError('Emission factor not found.');
      return toFactorDto(found.factor, found.source);
    },

    async list(actor, q, { limit, offset }) {
      const rows = (await facts(requireTenantId(actor), q)).sort(
        (a, b) => a.activityDefinitionName.localeCompare(b.activityDefinitionName) || b.co2eKg - a.co2eKg,
      );
      return {
        items: rows.slice(offset, offset + limit).map(toRowDto),
        total: rows.length,
        totalCo2eKg: Math.round(rows.reduce((s, r) => s + r.co2eKg, 0) * 1000) / 1000,
      };
    },

    async summary(actor, q) {
      const tenantId = requireTenantId(actor);
      return summary(await facts(tenantId, q), (await repos.orgUnits.listByTenant(tenantId)).length);
    },

    async heatmap(actor, q, groupBy, bucket) {
      return heatmap(await facts(requireTenantId(actor), q), groupBy, bucket, { from: q.from, to: q.to });
    },

    async orgTree(actor, q) {
      const tenantId = requireTenantId(actor);
      const units = await repos.orgUnits.listByTenant(tenantId);
      return orgTree(await facts(tenantId, { ...q, orgUnitId: undefined }), units);
    },

    async trace(actor, activityId) {
      const tenantId = requireTenantId(actor);
      const row = await rowFor(tenantId, activityId);
      const calc = await repos.calculations.findByActivity(tenantId, activityId);
      const overrides = await repos.calculations.listOverrides(tenantId, activityId);
      return {
        row: toRowDto(row),
        trace: JSON.parse(calc?.trace || '{}') as Record<string, unknown>,
        overrides: overrides.map((o) => ({
          id: o.id,
          type: o.type,
          factorId: o.factorId,
          value: o.value,
          unit: o.unit,
          citation: o.citation,
          reason: o.reason,
          previousCo2eKg: o.previousCo2eKg,
          newCo2eKg: o.newCo2eKg,
          createdBy: o.createdBy,
          createdAt: o.createdAt.toISOString(),
          revertedAt: o.revertedAt ? o.revertedAt.toISOString() : null,
        })),
      };
    },

    override: (actor, activityId, input) => applyOverride(actor, requireTenantId(actor), activityId, input),

    async revert(actor, activityId) {
      const tenantId = requireTenantId(actor);
      await rowFor(tenantId, activityId);
      await repos.calculations.revertOverrides(tenantId, activityId);
      await calculations.recalculateActivity(tenantId, activityId);
      return toRowDto(await rowFor(tenantId, activityId));
    },

    async bulkOverride(actor, input) {
      const tenantId = requireTenantId(actor);
      const out: Schemas['EmissionRow'][] = [];
      for (const id of input.activityIds) {
        out.push(
          await applyOverride(actor, tenantId, id, { type: 'factor', factorId: input.factorId, reason: input.reason }),
        );
      }
      return out;
    },
  };
};
