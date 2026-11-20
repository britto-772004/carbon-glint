import { describe, expect, it } from 'vitest';
import type { ColumnMapping } from '../../../src/models/index.js';
import { matchOrgUnit, validateRows, type ImportContext } from '../../../src/services/activity-import.js';

const units = [
  { id: 'hq', code: 'HQ', name: 'Acme HQ' },
  { id: 'pun', code: 'PUN-01', name: 'Pune Plant' },
  { id: 'dxb', code: 'DXB', name: 'Dubai Office' },
];
const ctx: ImportContext = {
  tenantId: 't',
  activityDefinitionId: 'ad',
  dataSourceId: 'ds',
  orgUnits: units,
  defaultOrgUnitId: 'hq',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
};
const columns = ['Item', 'Qty', 'UOM', 'Site', 'From', 'To', 'Cost', 'Notes'];
const mapping: ColumnMapping = {
  description: 'Item',
  measure: 'Qty',
  unit: 'UOM',
  orgUnit: 'Site',
  periodStart: 'From',
  periodEnd: 'To',
  location: null,
  spend: 'Cost',
  currency: null,
};

describe('matchOrgUnit', () => {
  it.each([
    ['hq', 'hq'],
    ['pun-01', 'pun'],
    ['PUN01', 'pun'],
    ['pune plant', 'pun'],
    ['Dubai', 'dxb'],
    ['Chennai', null],
    ['', null],
  ])('%j → %j', (v, id) => expect(matchOrgUnit(v, units)).toBe(id));
});

describe('validateRows', () => {
  it('converts valid rows, normalizes units, keeps unmapped columns as extra', () => {
    const out = validateRows(
      columns,
      [['Diesel', '1,200', 'Litres', 'PUN-01', 'Jan 2026', 'Mar 2026', '108000', 'DG set']],
      [5],
      mapping,
      ctx,
    );
    expect(out.errors).toEqual([]);
    expect(out.valid[0]).toMatchObject({
      rowNumber: 5,
      description: 'Diesel',
      measure: 1200,
      unit: 'L',
      orgUnitId: 'pun',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      spend: 108000,
      extra: { Notes: 'DG set' },
    });
  });

  it('defaults org unit and period from the Activity Definition', () => {
    const out = validateRows(columns, [['Electricity', '500', 'kWh', '', '', '', '', '']], [2], mapping, ctx);
    expect(out.valid[0]).toMatchObject({ orgUnitId: 'hq', periodStart: '2026-01-01', periodEnd: '2026-03-31' });
  });

  it('a single month in "From" spans that month', () => {
    const m = { ...mapping, periodEnd: null };
    const out = validateRows(columns, [['Electricity', '500', 'kWh', '', 'Feb 2026', '', '', '']], [2], m, ctx);
    expect(out.valid[0]).toMatchObject({ periodStart: '2026-02-01', periodEnd: '2026-02-28' });
  });

  it('reports every problem with its sheet row number', () => {
    const rows = [
      ['', 'abc', 'bananas', 'Nowhere', '31/02/2026', '', 'x', ''],
      ['Petrol', '-5', 'L', '', '2026-03-10', '2026-03-01', '', ''],
    ];
    const out = validateRows(columns, rows, [7, 9], mapping, ctx);
    expect(out.valid).toEqual([]);
    expect(out.errors.map((e) => `${e.row}:${e.field}`)).toEqual([
      '7:description',
      '7:measure',
      '7:unit',
      '7:orgUnit',
      '7:periodStart',
      '7:spend',
      '9:measure',
      '9:periodEnd',
    ]);
    expect(out.errorCount).toBe(8);
  });
});
