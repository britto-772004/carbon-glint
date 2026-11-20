import type { ColumnMapping, NewActivityModel, RowError } from '../models/index.js';
import { parseDate, parseNumber } from '../lib/parse-values.js';
import { normalizeUnit } from '../lib/units.js';
import { MAPPING_FIELDS, REQUIRED_FIELDS } from '../lib/column-mapping.js';

export const MAX_STORED_ERRORS = 500;

export interface ImportContext {
  tenantId: string;
  activityDefinitionId: string;
  dataSourceId: string;
  /** Every imported activity belongs to this business unit (the sheet has no business-unit column). */
  orgUnitId: string | null;
  periodStart: string;
  periodEnd: string;
}

export interface ImportOutcome {
  valid: NewActivityModel[];
  errors: RowError[];
  errorCount: number;
}

export function missingRequired(mapping: ColumnMapping): string[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f]);
}

/** Validate and convert sheet rows into activity rows. Pure: no I/O. */
export function validateRows(
  columns: string[],
  rows: string[][],
  rowNumbers: number[],
  mapping: ColumnMapping,
  ctx: ImportContext,
): ImportOutcome {
  const index = Object.fromEntries(
    MAPPING_FIELDS.map((f) => [f, mapping[f] ? columns.indexOf(mapping[f]!) : -1]),
  ) as Record<keyof ColumnMapping, number>;
  const mappedCols = new Set(Object.values(index).filter((i) => i >= 0));
  const valid: NewActivityModel[] = [];
  const errors: RowError[] = [];
  let errorCount = 0;

  const fail = (row: number, field: string, message: string) => {
    errorCount += 1;
    if (errors.length < MAX_STORED_ERRORS) errors.push({ row, field, message });
  };
  const cell = (r: string[], f: keyof ColumnMapping) => (index[f] >= 0 ? (r[index[f]] ?? '').trim() : '');

  rows.forEach((r, i) => {
    const rowNo = rowNumbers[i] ?? i + 2;
    const before = errorCount;

    const description = cell(r, 'description');
    if (!description) fail(rowNo, 'description', 'Activity description is empty');

    const measureRaw = cell(r, 'measure');
    const measure = parseNumber(measureRaw);
    if (measure === null) fail(rowNo, 'measure', measureRaw ? `"${measureRaw}" is not a number` : 'Measure is empty');
    else if (measure < 0) fail(rowNo, 'measure', 'Measure cannot be negative');

    const unitRaw = cell(r, 'unit');
    const unit = unitRaw ? normalizeUnit(unitRaw) : null;
    if (!unit) fail(rowNo, 'unit', unitRaw ? `Unknown unit "${unitRaw}"` : 'Unit is empty');

    const psRaw = cell(r, 'periodStart');
    const peRaw = cell(r, 'periodEnd');
    const periodStart = psRaw ? parseDate(psRaw, 'start') : ctx.periodStart;
    const periodEnd = peRaw ? parseDate(peRaw, 'end') : psRaw ? parseDate(psRaw, 'end') : ctx.periodEnd;
    if (psRaw && !periodStart) fail(rowNo, 'periodStart', `"${psRaw}" is not a date`);
    if (peRaw && !periodEnd) fail(rowNo, 'periodEnd', `"${peRaw}" is not a date`);
    if (periodStart && periodEnd && periodEnd < periodStart)
      fail(rowNo, 'periodEnd', 'Period end is before period start');

    const spendRaw = cell(r, 'spend');
    const spend = spendRaw ? parseNumber(spendRaw) : null;
    if (spendRaw && spend === null) fail(rowNo, 'spend', `"${spendRaw}" is not a number`);

    if (errorCount > before) return;

    const extra: Record<string, string> = {};
    columns.forEach((c, ci) => {
      if (!mappedCols.has(ci) && r[ci]) extra[c] = r[ci]!;
    });

    valid.push({
      tenantId: ctx.tenantId,
      activityDefinitionId: ctx.activityDefinitionId,
      dataSourceId: ctx.dataSourceId,
      rowNumber: rowNo,
      description,
      location: cell(r, 'location') || null,
      measure: measure!,
      unit: unit!.code,
      orgUnitId: ctx.orgUnitId,
      periodStart: periodStart!,
      periodEnd: periodEnd!,
      spend,
      currency: cell(r, 'currency').toUpperCase() || null,
      extra,
    });
  });

  return { valid, errors, errorCount };
}
