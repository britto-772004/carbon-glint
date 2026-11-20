import { describe, expect, it } from 'vitest';
import {
  buildActivityTemplateCsv,
  buildActivityTemplateXlsx,
  TEMPLATE_ROWS,
} from '../../../src/lib/activity-template.js';
import { heuristicMapping, sanitizeMapping } from '../../../src/lib/column-mapping.js';
import { parseDate, parseNumber } from '../../../src/lib/parse-values.js';
import { detectHeaderRow, parseSpreadsheet } from '../../../src/lib/spreadsheet.js';
import { conversionFactor, normalizeUnit } from '../../../src/lib/units.js';

describe('units', () => {
  it.each([
    ['Litres', 'L'],
    [' KWH ', 'kWh'],
    ['tonnes', 't'],
    ['m³', 'm3'],
    ['pkm', 'passenger.km'],
    ['Room Nights', 'room.night'],
    ['inr', 'INR'],
  ])('normalizes %j → %s', (raw, code) => expect(normalizeUnit(raw)?.code).toBe(code));

  it('returns null for unknown units', () => expect(normalizeUnit('bananas')).toBeNull());

  it('converts within a dimension only', () => {
    expect(conversionFactor('MWh', 'kWh')).toBe(1000);
    expect(conversionFactor('GJ', 'kWh')).toBeCloseTo(277.7778, 3);
    expect(conversionFactor('gal_us', 'L')).toBeCloseTo(3.7854, 4);
    expect(conversionFactor('kg', 'kWh')).toBeNull();
    expect(conversionFactor('USD', 'INR')).toBeNull();
  });
});

describe('parseNumber / parseDate', () => {
  it.each([
    ['1,234.5', 1234.5],
    ['1 234,5', 1234.5],
    ['₹ 2,000', 2000],
    ['(120)', -120],
    ['abc', null],
    ['', null],
    [42, 42],
  ])('parseNumber(%j) = %j', (raw, n) => expect(parseNumber(raw as string)).toBe(n));

  it.each([
    ['2026-03-31', 'start', '2026-03-31'],
    ['31/03/2026', 'start', '2026-03-31'],
    ['15 Jan 2026', 'start', '2026-01-15'],
    ['Feb 2026', 'start', '2026-02-01'],
    ['Feb 2026', 'end', '2026-02-28'],
    ['2026-02', 'end', '2026-02-28'],
    [46022, 'start', '2025-12-31'],
    ['31/02/2026', 'start', null],
    ['soon', 'start', null],
  ] as const)('parseDate(%j, %s) = %j', (raw, edge, out) => expect(parseDate(raw, edge)).toBe(out));
});

describe('spreadsheet parsing', () => {
  it('detects the header row below title rows', () => {
    expect(detectHeaderRow([['Fuel report Q1'], [''], ['Item', 'Qty', 'Unit'], ['Diesel', '10', 'L']])).toBe(3);
  });

  it('parses CSV with BOM, blank rows and duplicate headers', async () => {
    const csv = '﻿Item,Qty,Qty\nDiesel,"1,200",x\n\n,,\nPetrol,5,y\n';
    const p = await parseSpreadsheet(Buffer.from(csv), 'csv');
    expect(p.columns).toEqual(['Item', 'Qty', 'Qty (2)']);
    expect(p.rows).toEqual([
      ['Diesel', '1,200', 'x'],
      ['Petrol', '5', 'y'],
    ]);
  });

  it('round-trips the XLSX template (Activities sheet, formatted numbers as values)', async () => {
    const xlsx = await buildActivityTemplateXlsx();
    const first = await parseSpreadsheet(xlsx, 'xlsx');
    expect(first.sheets).toEqual(['Instructions', 'Activities']);
    const p = await parseSpreadsheet(xlsx, 'xlsx', { sheetName: 'Activities' });
    expect(p.columns[0]).toBe('Activity Description');
    expect(p.rows).toHaveLength(TEMPLATE_ROWS.length);
    expect(p.rows[0]![2]).toBe('18450');
  });

  it('template CSV parses the same', async () => {
    const p = await parseSpreadsheet(Buffer.from(buildActivityTemplateCsv()), 'csv');
    expect(p.rows).toHaveLength(TEMPLATE_ROWS.length);
    expect(p.rows[5]![0]).toBe('Flight – economy BLR→DXB return');
  });
});

describe('column mapping', () => {
  it('maps the template headers fully', () => {
    const { mapping } = heuristicMapping([
      'Activity Description',
      'Business Unit',
      'Location',
      'Measure',
      'Unit',
      'Period Start',
      'Period End',
      'Spend',
      'Currency',
    ]);
    expect(mapping).toEqual({
      description: 'Activity Description',
      location: 'Location',
      measure: 'Measure',
      unit: 'Unit',
      periodStart: 'Period Start',
      periodEnd: 'Period End',
      spend: 'Spend',
      currency: 'Currency',
    });
  });

  it('maps messy real-world headers', () => {
    const { mapping } = heuristicMapping([
      'Sr No',
      'Particulars',
      'Qty',
      'UOM',
      'Plant',
      'Invoice Date',
      'Total Cost (INR)',
    ]);
    expect(mapping).toMatchObject({
      description: 'Particulars',
      measure: 'Qty',
      unit: 'UOM',
      periodStart: 'Invoice Date',
      spend: 'Total Cost (INR)',
    });
  });

  it('sanitizes AI output: unknown columns and duplicates dropped', () => {
    expect(sanitizeMapping({ description: 'A', measure: 'A', unit: 'Nope', location: 'B' }, ['A', 'B'])).toMatchObject({
      description: 'A',
      measure: null,
      unit: null,
      location: 'B',
    });
  });
});
