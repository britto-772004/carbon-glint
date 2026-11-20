import { describe, expect, it } from 'vitest';
import type { ColumnMapping } from '../../../src/models/index.js';
import { validateRows, type ImportContext } from '../../../src/services/activity-import.js';

const ctx: ImportContext = {
  tenantId: 't',
  activityDefinitionId: 'ad',
  dataSourceId: 'ds',
  orgUnitId: 'hq',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
};
const columns = ['Item', 'Qty', 'UOM', 'From', 'To', 'Cost', 'Notes'];
const mapping: ColumnMapping = {
  description: 'Item',
  measure: 'Qty',
  unit: 'UOM',
  periodStart: 'From',
  periodEnd: 'To',
  location: null,
  spend: 'Cost',
  currency: null,
};

describe('validateRows', () => {
  it('converts valid rows, normalizes units, keeps unmapped columns as extra', () => {
    const out = validateRows(
      columns,
      [['Diesel', '1,200', 'Litres', 'Jan 2026', 'Mar 2026', '108000', 'DG set']],
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
      orgUnitId: 'hq',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      spend: 108000,
      extra: { Notes: 'DG set' },
    });
  });

  it('assigns the definition’s business unit and defaults the period', () => {
    const out = validateRows(columns, [['Electricity', '500', 'kWh', '', '', '', '']], [2], mapping, ctx);
    expect(out.valid[0]).toMatchObject({ orgUnitId: 'hq', periodStart: '2026-01-01', periodEnd: '2026-03-31' });
  });

  it('a single month in "From" spans that month', () => {
    const m = { ...mapping, periodEnd: null };
    const out = validateRows(columns, [['Electricity', '500', 'kWh', 'Feb 2026', '', '', '']], [2], m, ctx);
    expect(out.valid[0]).toMatchObject({ periodStart: '2026-02-01', periodEnd: '2026-02-28' });
  });

  it('reports every problem with its sheet row number', () => {
    const rows = [
      ['', 'abc', 'bananas', '31/02/2026', '', 'x', ''],
      ['Petrol', '-5', 'L', '2026-03-10', '2026-03-01', '', ''],
    ];
    const out = validateRows(columns, rows, [7, 9], mapping, ctx);
    expect(out.valid).toEqual([]);
    expect(out.errors.map((e) => `${e.row}:${e.field}`)).toEqual([
      '7:description',
      '7:measure',
      '7:unit',
      '7:periodStart',
      '7:spend',
      '9:measure',
      '9:periodEnd',
    ]);
    expect(out.errorCount).toBe(7);
  });
});
