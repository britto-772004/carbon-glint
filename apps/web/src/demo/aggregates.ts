/** Pure aggregation over emission facts (no I/O) — heatmap, KPI summary, BU roll-up. Mirrors the API so the demo matches the real app. */

export interface EmissionFact {
  activityId: string;
  activityDefinitionId: string;
  activityDefinitionName: string;
  scope: 1 | 2 | 3;
  categoryId: string;
  categoryName: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  description: string;
  periodStart: string; // yyyy-mm-dd
  periodEnd: string;
  status: 'matched' | 'needs_review' | 'unmatched' | 'overridden';
  co2eKg: number;
}

export interface EmissionFilters {
  scope?: number;
  categoryId?: string;
  activityDefinitionId?: string;
  /** Set of org unit ids (a BU plus its descendants). */
  orgUnitIds?: Set<string>;
  status?: EmissionFact['status'];
  from?: string;
  to?: string;
}

export type Bucket = 'month' | 'quarter' | 'year';
export type GroupBy = 'scope' | 'category' | 'activityDefinition' | 'activity' | 'orgUnit';

const DAY = 86_400_000;
const toDate = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

export function applyFilters(facts: EmissionFact[], f: EmissionFilters): EmissionFact[] {
  return facts.filter(
    (x) =>
      (!f.scope || x.scope === f.scope) &&
      (!f.categoryId || x.categoryId === f.categoryId) &&
      (!f.activityDefinitionId || x.activityDefinitionId === f.activityDefinitionId) &&
      (!f.orgUnitIds || (x.orgUnitId !== null && f.orgUnitIds.has(x.orgUnitId))) &&
      (!f.status || x.status === f.status) &&
      (!f.from || x.periodEnd >= f.from) &&
      (!f.to || x.periodStart <= f.to),
  );
}

/** Splits a period across calendar months by days (inclusive): returns [yyyy-mm, share] pairs summing to 1. */
export function monthShares(periodStart: string, periodEnd: string): Array<[string, number]> {
  const start = toDate(periodStart);
  const end = Math.max(start, toDate(periodEnd));
  const totalDays = (end - start) / DAY + 1;
  const out: Array<[string, number]> = [];
  let cursor = start;
  while (cursor <= end) {
    const d = new Date(cursor);
    const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
    const segEnd = Math.min(monthEnd, end);
    out.push([
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      ((segEnd - cursor) / DAY + 1) / totalDays,
    ]);
    cursor = segEnd + DAY;
  }
  return out;
}

const bucketOf = (month: string, bucket: Bucket) =>
  bucket === 'month'
    ? month
    : bucket === 'year'
      ? month.slice(0, 4)
      : `${month.slice(0, 4)}-Q${Math.ceil(+month.slice(5, 7) / 3)}`;

function columnRange(facts: EmissionFact[], bucket: Bucket, from?: string, to?: string): string[] {
  if (facts.length === 0 && !(from && to)) return [];
  const first = from ?? facts.reduce((m, f) => (f.periodStart < m ? f.periodStart : m), facts[0]!.periodStart);
  const last = to ?? facts.reduce((m, f) => (f.periodEnd > m ? f.periodEnd : m), facts[0]!.periodEnd);
  const cols: string[] = [];
  for (const [month] of monthShares(first, last)) {
    const b = bucketOf(month, bucket);
    if (cols.at(-1) !== b) cols.push(b);
  }
  return cols;
}

const groupKey = (f: EmissionFact, by: GroupBy): [string, string] => {
  switch (by) {
    case 'scope':
      return [String(f.scope), `Scope ${f.scope}`];
    case 'category':
      return [f.categoryId, f.categoryName];
    case 'activityDefinition':
      return [f.activityDefinitionId, f.activityDefinitionName];
    case 'activity':
      return [f.activityId, f.description];
    case 'orgUnit':
      return [f.orgUnitId ?? 'none', f.orgUnitName ?? 'Unassigned'];
  }
};

export interface HeatmapResult {
  groupBy: GroupBy;
  columns: string[];
  rows: Array<{ key: string; label: string; total: number; cells: number[] }>;
  columnTotals: number[];
  total: number;
}

/** Lasagna plot: one row per group, one column per time bucket; multi-month periods are pro-rated by days. */
export function heatmap(
  facts: EmissionFact[],
  by: GroupBy,
  bucket: Bucket,
  range: { from?: string; to?: string } = {},
): HeatmapResult {
  const columns = columnRange(facts, bucket, range.from, range.to);
  const colIndex = new Map(columns.map((c, i) => [c, i]));
  const rows = new Map<string, { key: string; label: string; total: number; cells: number[] }>();
  for (const f of facts) {
    const [key, label] = groupKey(f, by);
    let row = rows.get(key);
    if (!row) {
      row = { key, label, total: 0, cells: columns.map(() => 0) };
      rows.set(key, row);
    }
    for (const [month, share] of monthShares(f.periodStart, f.periodEnd)) {
      const i = colIndex.get(bucketOf(month, bucket));
      if (i === undefined) continue; // outside requested range
      const v = f.co2eKg * share;
      row.cells[i]! += v;
      row.total += v;
    }
  }
  const sorted = [...rows.values()].sort((a, b) =>
    by === 'scope' ? Number(a.key) - Number(b.key) : b.total - a.total,
  );
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const out = sorted.map((r) => ({ ...r, total: round(r.total), cells: r.cells.map(round) }));
  const columnTotals = columns.map((_, i) => round(out.reduce((s, r) => s + r.cells[i]!, 0)));
  return { groupBy: by, columns, rows: out, columnTotals, total: round(out.reduce((s, r) => s + r.total, 0)) };
}

export interface ScopeTotals {
  '1': number;
  '2': number;
  '3': number;
  total: number;
}
const zero = (): ScopeTotals => ({ '1': 0, '2': 0, '3': 0, total: 0 });
const add = (t: ScopeTotals, scope: 1 | 2 | 3, v: number) => {
  t[String(scope) as '1' | '2' | '3'] += v;
  t.total += v;
};

export function summary(facts: EmissionFact[], orgUnitCount: number) {
  const co2eKg = zero();
  for (const f of facts) add(co2eKg, f.scope, f.co2eKg);
  return {
    co2eKg,
    activityCount: facts.length,
    needsReview: facts.filter((f) => f.status === 'needs_review').length,
    unmatched: facts.filter((f) => f.status === 'unmatched').length,
    overridden: facts.filter((f) => f.status === 'overridden').length,
    orgUnitsWithData: new Set(facts.map((f) => f.orgUnitId).filter(Boolean)).size,
    orgUnitCount,
  };
}

export interface OrgUnitLite {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
}

/** Own emissions per unit plus totals rolled up through every descendant. */
export function orgTree(facts: EmissionFact[], units: OrgUnitLite[]) {
  const own = new Map(units.map((u) => [u.id, zero()]));
  for (const f of facts) if (f.orgUnitId && own.has(f.orgUnitId)) add(own.get(f.orgUnitId)!, f.scope, f.co2eKg);
  const children = new Map<string, string[]>();
  for (const u of units) if (u.parentId) children.set(u.parentId, [...(children.get(u.parentId) ?? []), u.id]);
  const memo = new Map<string, ScopeTotals>();
  const rollup = (id: string, seen = new Set<string>()): ScopeTotals => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return zero();
    seen.add(id);
    const t = { ...own.get(id)! };
    for (const c of children.get(id) ?? []) {
      const r = rollup(c, seen);
      t['1'] += r['1'];
      t['2'] += r['2'];
      t['3'] += r['3'];
      t.total += r.total;
    }
    memo.set(id, t);
    return t;
  };
  return units.map((u) => ({
    orgUnitId: u.id,
    parentId: u.parentId,
    name: u.name,
    code: u.code,
    own: own.get(u.id)!,
    rollup: rollup(u.id),
  }));
}
