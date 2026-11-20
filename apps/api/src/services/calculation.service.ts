import { conversionFactor } from '../lib/units.js';
import type { ActivityModel, NewCalculationModel } from '../models/index.js';
import { countryNameOf } from '../lib/countries.js';
import { chooseFactor, compatibleUnits, matchQuery, rerank, type MatchChoice } from './factor-matching.js';
import type { ServiceDeps } from './index.js';

export const REVIEW_THRESHOLD = 0.6;

export interface CalculationTrace {
  input: {
    activityId: string;
    dataSourceId: string;
    rowNumber: number;
    description: string;
    measure: number;
    unit: string;
    location: string | null;
    orgUnitId: string | null;
    periodStart: string;
    periodEnd: string;
  };
  classification: { scope: number; categoryCode: string; categoryName: string };
  match: {
    method: MatchChoice['method'] | 'override';
    confidence: number;
    rationale: string;
    query: string;
    alternatives: Array<{
      id: string;
      name: string;
      source: string;
      co2ePerUnit: number;
      unit: string | null;
      score: number;
    }>;
  };
  factor: null | {
    id: string;
    sourceCode: string;
    sourceName: string;
    publisher: string;
    licence: string;
    externalId: string;
    name: string;
    category: string;
    region: string;
    year: number;
    unit: string | null;
    co2ePerUnit: number;
    gases: { co2: number | null; ch4: number | null; n2o: number | null };
    citationUrl: string;
  };
  conversion: null | { from: string; to: string; factor: number; normalizedQuantity: number };
  gwp: string;
  result: { co2eKg: number; formula: string };
  override?: { type: string; reason: string; by: string; at: string; previousCo2eKg: number | null };
  calculatedAt: string;
}

export interface CalculationService {
  /** Worker entrypoint (`calculation.run`): match factors and calculate CO2e for every activity of a definition. */
  run(job: {
    tenantId: string;
    activityDefinitionId: string;
  }): Promise<{ calculated: number; needsReview: number; unmatched: number }>;
  /** Recalculate one activity from scratch (ignoring overrides), e.g. after reverting an override. */
  recalculateActivity(tenantId: string, activityId: string): Promise<void>;
}

export const createCalculationService = ({ repositories: repos, ai }: ServiceDeps): CalculationService => {
  const calculate = async (
    tenantId: string,
    activityDefinitionId: string,
    only?: ActivityModel,
  ): Promise<{ rows: NewCalculationModel[]; needsReview: number; unmatched: number } | null> => {
    const ad = await repos.activityDefinitions.findById(tenantId, activityDefinitionId);
    if (!ad) return null;
    const [activities, orgUnits, existing] = await Promise.all([
      only ? Promise.resolve([only]) : repos.activities.allByDefinition(tenantId, activityDefinitionId),
      repos.orgUnits.listByTenant(tenantId),
      only ? Promise.resolve([]) : repos.calculations.listByDefinition(tenantId, activityDefinitionId),
    ]);
    const overridden = new Set(existing.filter((c) => c.status === 'overridden').map((c) => c.activityId));
    const countryOf = new Map(orgUnits.map((u) => [u.id, countryNameOf(u.country)]));
    const cache = new Map<string, Promise<MatchChoice & { query: string }>>();

    const rows: NewCalculationModel[] = [];
    let needsReview = 0;
    let unmatched = 0;

    for (const a of activities) {
      if (overridden.has(a.id)) continue;
      const countryName = a.orgUnitId ? (countryOf.get(a.orgUnitId) ?? null) : null;
      const input = { activity: a, countryName, scope: ad.definition.scope, category: ad.category };
      const key = [a.description.toLowerCase(), a.unit, a.location ?? '', countryName ?? ''].join('|');
      if (!cache.has(key)) {
        cache.set(
          key,
          (async () => {
            const query = matchQuery(input);
            const hits = await repos.emissionFactors.search({ query, units: compatibleUnits(a.unit), limit: 25 });
            return { ...(await chooseFactor(ai, input, rerank(hits, input))), query };
          })(),
        );
      }
      const choice = await cache.get(key)!;
      const f = choice.hit?.factor ?? null;
      const conv = f?.unit ? conversionFactor(a.unit, f.unit) : null;
      const normalized = conv !== null ? a.measure * conv : null;
      const co2eKg = f && normalized !== null ? normalized * f.co2ePerUnit : 0;
      const status =
        !f || conv === null ? 'unmatched' : choice.confidence < REVIEW_THRESHOLD ? 'needs_review' : 'matched';
      if (status === 'unmatched') unmatched += 1;
      if (status === 'needs_review') needsReview += 1;

      const trace: CalculationTrace = {
        input: {
          activityId: a.id,
          dataSourceId: a.dataSourceId,
          rowNumber: a.rowNumber,
          description: a.description,
          measure: a.measure,
          unit: a.unit,
          location: a.location,
          orgUnitId: a.orgUnitId,
          periodStart: a.periodStart,
          periodEnd: a.periodEnd,
        },
        classification: { scope: ad.definition.scope, categoryCode: ad.category.code, categoryName: ad.category.name },
        match: {
          method: choice.method,
          confidence: choice.confidence,
          rationale: choice.rationale,
          query: choice.query,
          alternatives: choice.alternatives.map((h) => ({
            id: h.factor.id,
            name: h.factor.name,
            source: h.source.code,
            co2ePerUnit: h.factor.co2ePerUnit,
            unit: h.factor.unit,
            score: Number(h.score.toFixed(3)),
          })),
        },
        factor:
          f && choice.hit
            ? {
                id: f.id,
                sourceCode: choice.hit.source.code,
                sourceName: choice.hit.source.name,
                publisher: choice.hit.source.publisher,
                licence: choice.hit.source.licence,
                externalId: f.externalId,
                name: f.name,
                category: f.category,
                region: f.region,
                year: f.year,
                unit: f.unit,
                co2ePerUnit: f.co2ePerUnit,
                gases: { co2: f.co2PerUnit, ch4: f.ch4PerUnit, n2o: f.n2oPerUnit },
                citationUrl: f.citationUrl,
              }
            : null,
        conversion:
          f?.unit && conv !== null ? { from: a.unit, to: f.unit, factor: conv, normalizedQuantity: normalized! } : null,
        gwp: 'CO2e as published by the source (source GWP basis)',
        result: {
          co2eKg,
          formula:
            f && conv !== null
              ? `${a.measure} ${a.unit} × ${conv} = ${normalized} ${f.unit} × ${f.co2ePerUnit} kg CO2e/${f.unit}`
              : 'No factor applied',
        },
        calculatedAt: new Date().toISOString(),
      };

      rows.push({
        tenantId,
        activityId: a.id,
        activityDefinitionId,
        orgUnitId: a.orgUnitId,
        scope: ad.definition.scope,
        categoryId: ad.category.id,
        factorId: f?.id ?? null,
        method: choice.method,
        status,
        confidence: choice.confidence,
        normalizedQuantity: normalized,
        conversionFactor: conv,
        co2eKg,
        trace: JSON.stringify(trace),
      });
    }

    return { rows, needsReview, unmatched };
  };

  return {
    async run({ tenantId, activityDefinitionId }) {
      const out = await calculate(tenantId, activityDefinitionId);
      if (!out) return { calculated: 0, needsReview: 0, unmatched: 0 };
      await repos.transaction((tx) => tx.calculations.replaceForDefinition(tenantId, activityDefinitionId, out.rows));
      return { calculated: out.rows.length, needsReview: out.needsReview, unmatched: out.unmatched };
    },
    async recalculateActivity(tenantId, activityId) {
      const activity = await repos.activities.findById(tenantId, activityId);
      if (!activity) return;
      const out = await calculate(tenantId, activity.activityDefinitionId, activity);
      if (out?.rows[0]) await repos.calculations.upsert(out.rows[0]);
    },
  };
};
