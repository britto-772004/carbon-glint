import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  heatmap,
  monthShares,
  orgTree,
  summary,
  type EmissionFact,
} from '../../../src/services/emission-aggregates.js';

const fact = (o: Partial<EmissionFact>): EmissionFact => ({
  activityId: 'a',
  activityDefinitionId: 'ad1',
  activityDefinitionName: 'Electricity',
  scope: 2,
  categoryId: 'c2',
  categoryName: 'Purchased electricity',
  orgUnitId: 'hq',
  orgUnitName: 'HQ',
  description: 'Grid',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  status: 'matched',
  co2eKg: 100,
  ...o,
});

describe('monthShares', () => {
  it('splits a quarter by days', () => {
    const s = monthShares('2026-01-01', '2026-03-31');
    expect(s.map(([m]) => m)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(s.map(([, v]) => Math.round(v * 90))).toEqual([31, 28, 31]);
    expect(s.reduce((t, [, v]) => t + v, 0)).toBeCloseTo(1);
  });
  it('handles single days and inverted ranges', () => {
    expect(monthShares('2026-02-12', '2026-02-12')).toEqual([['2026-02', 1]]);
    expect(monthShares('2026-02-12', '2026-01-01')).toEqual([['2026-02', 1]]);
  });
});

describe('heatmap', () => {
  const facts = [
    fact({ activityId: 'a1', co2eKg: 900, periodStart: '2026-01-01', periodEnd: '2026-03-31' }),
    fact({
      activityId: 'a2',
      scope: 1,
      categoryId: 'c1',
      categoryName: 'Stationary',
      co2eKg: 50,
      periodStart: '2026-02-10',
      periodEnd: '2026-02-10',
    }),
  ];

  it('groups by scope with pro-rated monthly cells', () => {
    const h = heatmap(facts, 'scope', 'month');
    expect(h.columns).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(h.rows.map((r) => r.label)).toEqual(['Scope 1', 'Scope 2']);
    expect(h.rows[1]!.cells).toEqual([310, 280, 310]);
    expect(h.columnTotals).toEqual([310, 330, 310]);
    expect(h.total).toBe(950);
  });

  it('buckets by quarter and sorts other groupings by total', () => {
    const h = heatmap(facts, 'category', 'quarter');
    expect(h.columns).toEqual(['2026-Q1']);
    expect(h.rows.map((r) => r.label)).toEqual(['Purchased electricity', 'Stationary']);
  });

  it('respects an explicit range (columns + clipping)', () => {
    const h = heatmap(facts, 'scope', 'month', { from: '2026-02-01', to: '2026-02-28' });
    expect(h.columns).toEqual(['2026-02']);
    expect(h.total).toBe(330);
  });
});

describe('filters, summary, org tree', () => {
  const facts = [
    fact({ activityId: 'a1', orgUnitId: 'pun', co2eKg: 10, status: 'needs_review' }),
    fact({ activityId: 'a2', orgUnitId: 'hq', scope: 1, co2eKg: 5 }),
    fact({ activityId: 'a3', orgUnitId: 'pun-1', scope: 3, co2eKg: 2, status: 'overridden' }),
  ];
  const units = [
    { id: 'hq', parentId: null, name: 'HQ', code: 'HQ' },
    { id: 'pun', parentId: 'hq', name: 'Pune', code: 'PUN' },
    { id: 'pun-1', parentId: 'pun', name: 'Pune 1', code: 'PUN1' },
    { id: 'dxb', parentId: 'hq', name: 'Dubai', code: 'DXB' },
  ];

  it('filters by org subtree and period overlap', () => {
    expect(applyFilters(facts, { orgUnitIds: new Set(['pun', 'pun-1']) }).map((f) => f.activityId)).toEqual([
      'a1',
      'a3',
    ]);
    expect(applyFilters(facts, { from: '2026-02-01' })).toHaveLength(0);
    expect(applyFilters(facts, { scope: 1 })).toHaveLength(1);
  });

  it('summarises scopes and statuses', () => {
    expect(summary(facts, 4)).toEqual({
      co2eKg: { '1': 5, '2': 10, '3': 2, total: 17 },
      activityCount: 3,
      needsReview: 1,
      unmatched: 0,
      overridden: 1,
      orgUnitsWithData: 3,
      orgUnitCount: 4,
    });
  });

  it('rolls emissions up the BU tree', () => {
    const tree = Object.fromEntries(orgTree(facts, units).map((n) => [n.orgUnitId, n]));
    expect(tree.hq!.own.total).toBe(5);
    expect(tree.hq!.rollup).toEqual({ '1': 5, '2': 10, '3': 2, total: 17 });
    expect(tree.pun!.rollup.total).toBe(12);
    expect(tree.dxb!.rollup.total).toBe(0);
  });
});
