import { conversionFactor } from '../lib/units.js';
import type { EmissionFactRow } from '../repositories/calculation.repository.js';

export interface ReportData {
  companyName: string;
  orgUnitName: string;
  periodStart: string;
  periodEnd: string;
  formatName: string;
  framework: string;
  generatedAt: string;
  totals: { '1': number; '2': number; '3': number; total: number };
  scope3ByCategory: Array<{ name: string; co2eKg: number }>;
  byCategory: Array<{ scope: number; name: string; co2eKg: number }>;
  byOrgUnit: Array<{ name: string; co2eKg: number }>;
  byMonth: Array<{ month: string; s1: number; s2: number; s3: number }>;
  energyGj: number;
  businessUnitCount: number;
  boundary: Array<{ name: string; depth: number }>;
  sources: Array<{ code: string; count: number }>;
  quality: { activities: number; needsReview: number; unmatched: number; overridden: number; aiMatched: number };
  overrides: Array<{ description: string; co2eKg: number }>;
  topActivities: Array<{ description: string; orgUnit: string; measure: string; factor: string; co2eKg: number }>;
}

/** Aggregates emission rows (already filtered to the BU subtree and period) into report-ready figures. */
export function buildReportData(
  rows: EmissionFactRow[],
  meta: Pick<
    ReportData,
    'companyName' | 'orgUnitName' | 'periodStart' | 'periodEnd' | 'formatName' | 'framework' | 'boundary'
  >,
): ReportData {
  const totals = { '1': 0, '2': 0, '3': 0, total: 0 };
  const cat = new Map<string, { scope: number; name: string; co2eKg: number }>();
  const ou = new Map<string, number>();
  const month = new Map<string, { s1: number; s2: number; s3: number }>();
  const sources = new Map<string, number>();
  let energyGj = 0;
  for (const r of rows) {
    totals[String(r.scope) as '1' | '2' | '3'] += r.co2eKg;
    totals.total += r.co2eKg;
    const c = cat.get(r.categoryId) ?? { scope: r.scope, name: r.categoryName, co2eKg: 0 };
    c.co2eKg += r.co2eKg;
    cat.set(r.categoryId, c);
    const key = r.orgUnitName ?? 'Unassigned';
    ou.set(key, (ou.get(key) ?? 0) + r.co2eKg);
    const m = month.get(r.periodStart.slice(0, 7)) ?? { s1: 0, s2: 0, s3: 0 };
    m[`s${r.scope}` as 's1' | 's2' | 's3'] += r.co2eKg;
    month.set(r.periodStart.slice(0, 7), m);
    if (r.factor) sources.set(r.factor.sourceCode, (sources.get(r.factor.sourceCode) ?? 0) + 1);
    const toGj = conversionFactor(r.unit, 'GJ');
    if (toGj !== null) energyGj += r.measure * toGj;
  }
  const byCategory = [...cat.values()].sort((a, b) => a.scope - b.scope || b.co2eKg - a.co2eKg);
  return {
    ...meta,
    generatedAt: new Date().toISOString(),
    totals,
    byCategory,
    scope3ByCategory: byCategory.filter((c) => c.scope === 3).map(({ name, co2eKg }) => ({ name, co2eKg })),
    byOrgUnit: [...ou].map(([name, co2eKg]) => ({ name, co2eKg })).sort((a, b) => b.co2eKg - a.co2eKg),
    byMonth: [...month].sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({ month: m, ...v })),
    energyGj,
    businessUnitCount: meta.boundary.length,
    sources: [...sources].map(([code, count]) => ({ code, count })),
    quality: {
      activities: rows.length,
      needsReview: rows.filter((r) => r.status === 'needs_review').length,
      unmatched: rows.filter((r) => r.status === 'unmatched').length,
      overridden: rows.filter((r) => r.status === 'overridden').length,
      aiMatched: rows.filter((r) => r.method === 'ai').length,
    },
    overrides: rows
      .filter((r) => r.status === 'overridden')
      .map((r) => ({ description: r.description, co2eKg: r.co2eKg })),
    topActivities: [...rows]
      .sort((a, b) => b.co2eKg - a.co2eKg)
      .slice(0, 30)
      .map((r) => ({
        description: r.description,
        orgUnit: r.orgUnitName ?? '—',
        measure: `${r.measure.toLocaleString('en')} ${r.unit}`,
        factor: r.factor
          ? `${r.factor.co2ePerUnit} kg/${r.factor.unit} (${r.factor.sourceCode})`
          : r.status === 'overridden'
            ? 'Manual override'
            : '—',
        co2eKg: r.co2eKg,
      })),
  };
}
