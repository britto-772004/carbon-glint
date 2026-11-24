import type { EmissionRow, EmissionTrace, OverrideRecord, OverrideRequest } from '@carbon-glint/sdk';
import type { EmissionFact } from './aggregates';
import { compatibleUnits, conversion, FACTORS, factorById, factorByKey, type DemoFactor } from './factors';
import type { DemoActivity, DemoCalc, DemoState } from './types';

export const FALLBACK_RATIONALE =
  'Best match for the activity description, unit and region, chosen by relevance ranking of the published factors.';

export const nextId = (s: DemoState, prefix: string) => `${prefix}-${String(++s.seq).padStart(4, '0')}`;

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
const STOP = new Set(['the', 'and', 'for', 'of', 'a', 'in', 'to', 'at', 'from', 'with', 'per', 'new']);
const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w));

const haystack = (f: DemoFactor) => new Set(tokens(`${f.name} ${f.category} ${f.tags}`));

export interface Ranked {
  factor: DemoFactor;
  score: number;
}

/** Keyword relevance over the demo library, restricted to unit-compatible factors. */
export function rankFactors(query: string, unit?: string | null, scope?: number | null): Ranked[] {
  const q = tokens(query);
  const units = unit ? compatibleUnits(unit) : null;
  return FACTORS.filter((f) => !units || (f.unit !== null && units.includes(f.unit)))
    .map((factor) => {
      const hay = haystack(factor);
      const hits = q.filter((w) => hay.has(w)).length;
      const base = q.length ? hits / q.length : 0;
      return { factor, score: base + (scope && factor.scopeHint === scope ? 0.08 : 0) };
    })
    .filter((r) => r.score > 0.08)
    .sort((a, b) => b.score - a.score);
}

export const defOf = (s: DemoState, id: string) => s.definitions.find((d) => d.id === id)!;
const categoryOf = (s: DemoState, id: string) => s.categories.find((c) => c.id === id)!;
const unitName = (s: DemoState, id: string | null) => s.orgUnits.find((u) => u.id === id)?.name ?? null;

const scopeWord = (scope: number) =>
  scope === 1 ? 'direct combustion' : scope === 2 ? 'location-based grid' : 'value-chain';

/** Calculate (or recalculate) one activity: pick a factor, convert units, compute kg CO2e. */
export function calculate(s: DemoState, a: DemoActivity): DemoCalc {
  const def = defOf(s, a.definitionId);
  const now = new Date().toISOString();
  const query = `${a.description} ${a.location ?? ''} ${categoryOf(s, def.category.id).name}`.trim();
  let factor: DemoFactor | null;
  let confidence: number;
  let method: DemoCalc['method'] = 'ai';
  let rationale: string;

  if (a.factorKey !== undefined) {
    factor = a.factorKey ? factorByKey(a.factorKey) : null;
    const h = hash(a.id);
    confidence = a.review ? 0.38 + (h % 21) / 100 : 0.82 + (h % 16) / 100;
    if (a.review) method = 'search';
  } else {
    const ranked = rankFactors(`${a.description} ${a.location ?? ''}`, a.unit, def.scope);
    factor = ranked[0]?.factor ?? null;
    const margin = (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0);
    confidence = Math.min(0.95, 0.45 + (ranked[0]?.score ?? 0) * 0.45 + margin * 0.3);
    if (confidence < 0.6) method = 'search';
  }

  const conv = factor?.unit ? conversion(a.unit, factor.unit) : null;
  if (!factor || conv === null) {
    return {
      activityId: a.id,
      factorId: null,
      method: 'none',
      status: 'unmatched',
      confidence: 0,
      conversion: null,
      co2eKg: 0,
      rationale: 'No unit-compatible emission factor found.',
      query,
      alternatives: [],
      calculatedAt: now,
    };
  }
  if (method === 'ai') {
    rationale = `Selected the ${factor.year} ${scopeWord(def.scope)} factor for ${factor.name.toLowerCase()} measured in ${factor.unitLabel}.`;
  } else {
    rationale = FALLBACK_RATIONALE;
    confidence = Math.min(confidence, 0.59);
  }
  const alternatives = rankFactors(a.description, a.unit, def.scope)
    .filter((r) => r.factor.id !== factor.id)
    .slice(0, 4)
    .map((r) => ({
      id: r.factor.id,
      name: r.factor.category,
      source: r.factor.sourceCode,
      co2ePerUnit: r.factor.co2ePerUnit,
      unit: r.factor.unit,
      score: Number(Math.min(0.99, r.score).toFixed(3)),
    }));
  return {
    activityId: a.id,
    factorId: factor.id,
    method,
    status: confidence < 0.6 ? 'needs_review' : 'matched',
    confidence: Number(confidence.toFixed(2)),
    conversion: conv,
    co2eKg: a.measure * conv * factor.co2ePerUnit,
    rationale,
    query,
    alternatives,
    calculatedAt: now,
  };
}

export const rowDto = (s: DemoState, a: DemoActivity): EmissionRow => {
  const c = s.calcs.get(a.id)!;
  const def = defOf(s, a.definitionId);
  const f = c.factorId ? factorById(c.factorId) : undefined;
  return {
    activityId: a.id,
    activityDefinitionId: a.definitionId,
    activityDefinitionName: def.name,
    scope: def.scope,
    categoryId: def.category.id,
    categoryName: def.category.name,
    orgUnitId: a.orgUnitId,
    orgUnitName: unitName(s, a.orgUnitId),
    description: a.description,
    measure: a.measure,
    unit: a.unit,
    periodStart: a.periodStart,
    periodEnd: a.periodEnd,
    factor: f
      ? {
          id: f.id,
          name: f.category,
          sourceCode: f.sourceCode,
          unit: f.unit,
          co2ePerUnit: f.co2ePerUnit,
          region: f.region,
        }
      : null,
    method: c.method,
    status: c.status,
    confidence: c.confidence,
    co2eKg: Math.round(c.co2eKg * 1e6) / 1e6,
  };
};

/** Rows that have a calculation (published definitions only). */
export const calculatedActivities = (s: DemoState) => s.activities.filter((a) => s.calcs.has(a.id));

export const factsOf = (s: DemoState): EmissionFact[] =>
  calculatedActivities(s).map((a) => {
    const r = rowDto(s, a);
    return {
      activityId: r.activityId,
      activityDefinitionId: r.activityDefinitionId,
      activityDefinitionName: r.activityDefinitionName,
      scope: r.scope as 1 | 2 | 3,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      orgUnitId: r.orgUnitId,
      orgUnitName: r.orgUnitName,
      description: r.description,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      co2eKg: r.co2eKg,
    };
  });

export const calculateDefinition = (s: DemoState, definitionId: string, resetOverrides = false) => {
  for (const a of s.activities.filter((x) => x.definitionId === definitionId)) {
    const existing = s.calcs.get(a.id);
    if (existing?.status === 'overridden' && !resetOverrides) continue;
    if (resetOverrides) s.overrides.delete(a.id);
    s.calcs.set(a.id, calculate(s, a));
  }
};

/** The trace shown in the GHG traceability drawer (same shape the real API stores). */
export function traceFor(s: DemoState, a: DemoActivity): EmissionTrace {
  const c = s.calcs.get(a.id)!;
  const def = defOf(s, a.definitionId);
  const f = c.factorId ? factorById(c.factorId) : undefined;
  const custom = c.customFactor;
  const trace: Record<string, unknown> = {
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
    classification: { scope: def.scope, categoryCode: def.category.code, categoryName: def.category.name },
    match: {
      method: c.method,
      confidence: c.confidence,
      rationale: c.rationale,
      query: c.query,
      alternatives: c.alternatives,
    },
    factor: f
      ? {
          id: f.id,
          sourceCode: f.sourceCode,
          sourceName: f.sourceName,
          publisher: 'UK DESNZ / DEFRA',
          licence: 'Open Government Licence v3.0',
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
      f?.unit && c.conversion !== null
        ? { from: a.unit, to: f.unit, factor: c.conversion, normalizedQuantity: a.measure * c.conversion }
        : custom
          ? {
              from: a.unit,
              to: custom.unit,
              factor: c.conversion ?? 1,
              normalizedQuantity: a.measure * (c.conversion ?? 1),
            }
          : null,
    gwp: 'CO2e as published by the source (source GWP basis)',
    result: {
      co2eKg: c.co2eKg,
      formula:
        c.status === 'overridden' && !f && !custom
          ? `Entered manually: ${c.co2eKg} kg CO2e`
          : f && c.conversion !== null
            ? `${a.measure} ${a.unit} × ${c.conversion} = ${a.measure * c.conversion} ${f.unit} × ${f.co2ePerUnit} kg CO2e/${f.unit}`
            : custom
              ? `${a.measure} ${a.unit} × ${c.conversion ?? 1} × ${custom.value} kg CO2e/${custom.unit}`
              : 'No factor applied',
    },
    calculatedAt: c.calculatedAt,
  };
  if (c.override) trace.override = c.override;
  return { row: rowDto(s, a), trace, overrides: s.overrides.get(a.id) ?? [] };
}

export class DemoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function applyOverride(s: DemoState, a: DemoActivity, input: OverrideRequest, by = 'demo-user-1'): void {
  const current = s.calcs.get(a.id);
  if (!current) throw new DemoError(404, 'NOT_FOUND', 'No calculation for this activity yet.');
  const previous = current.co2eKg;
  let co2eKg: number;
  let factorId: string | null = null;
  let conv: number | null = null;
  let customFactor: DemoCalc['customFactor'];
  if (input.type === 'factor') {
    const f = input.factorId ? factorById(input.factorId) : undefined;
    if (!f) throw new DemoError(422, 'UNKNOWN_FACTOR', 'Unknown emission factor.');
    conv = f.unit ? conversion(a.unit, f.unit) : null;
    if (conv === null)
      throw new DemoError(422, 'UNIT_INCOMPATIBLE', `This factor is per ${f.unitLabel}; the activity is in ${a.unit}.`);
    co2eKg = a.measure * conv * f.co2ePerUnit;
    factorId = f.id;
  } else if (input.type === 'custom_factor') {
    if (input.value === undefined || !input.unit)
      throw new DemoError(422, 'CUSTOM_FACTOR_INCOMPLETE', 'A custom factor needs a value and a unit.');
    conv = conversion(a.unit, input.unit);
    if (conv === null) throw new DemoError(422, 'UNIT_INCOMPATIBLE', `Can't convert ${a.unit} to ${input.unit}.`);
    co2eKg = a.measure * conv * input.value;
    customFactor = { value: input.value, unit: input.unit };
  } else {
    if (input.value === undefined) throw new DemoError(422, 'VALUE_REQUIRED', 'Enter the result in kg CO2e.');
    co2eKg = input.value;
  }
  const now = new Date().toISOString();
  s.calcs.set(a.id, {
    ...current,
    factorId,
    method: 'override',
    status: 'overridden',
    confidence: 1,
    conversion: conv,
    co2eKg,
    customFactor,
    override: { type: input.type, reason: input.reason, at: now, previousCo2eKg: previous },
    calculatedAt: now,
  });
  const record: OverrideRecord = {
    id: nextId(s, 'demo-ovr'),
    type: input.type,
    factorId,
    value: input.value ?? null,
    unit: input.unit ?? null,
    citation: input.citation ?? null,
    reason: input.reason,
    previousCo2eKg: previous,
    newCo2eKg: co2eKg,
    createdBy: by,
    createdAt: now,
    revertedAt: null,
  };
  s.overrides.set(a.id, [...(s.overrides.get(a.id) ?? []), record]);
}

export function revertOverride(s: DemoState, a: DemoActivity): void {
  const now = new Date().toISOString();
  s.overrides.set(
    a.id,
    (s.overrides.get(a.id) ?? []).map((o) => (o.revertedAt ? o : { ...o, revertedAt: now })),
  );
  s.calcs.set(a.id, calculate(s, a));
}
