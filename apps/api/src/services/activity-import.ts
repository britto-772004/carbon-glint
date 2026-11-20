import type { ColumnMapping, NewActivityModel, OrgUnitModel, RowError } from '../models/index.js';
import { parseDate, parseNumber } from '../lib/parse-values.js';
import { normalizeUnit } from '../lib/units.js';
import { MAPPING_FIELDS, REQUIRED_FIELDS } from '../lib/column-mapping.js';

export const MAX_STORED_ERRORS = 500;

export interface ImportContext {
  tenantId: string;
  activityDefinitionId: string;
  dataSourceId: string;
  orgUnits: Pick<OrgUnitModel, 'id' | 'code' | 'name'>[];
  defaultOrgUnitId: string | null;
  periodStart: string;
  periodEnd: string;
}

export interface ImportOutcome {
  valid: NewActivityModel[];
  errors: RowError[];
  errorCount: number;
}

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Match a cell to an org unit: code, then name (case-insensitive), then punctuation-insensitive, then a unique partial name. */
export function matchOrgUnit(value: string, units: ImportContext['orgUnits']): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const exact = units.find((u) => u.code.toLowerCase() === v) ?? units.find((u) => u.name.toLowerCase() === v);
  if (exact) return exact.id;
  const sv = simplify(v);
  const loose = units.find((u) => simplify(u.code) === sv || simplify(u.name) === sv);
  if (loose) return loose.id;
  const partial = units.filter((u) => simplify(u.name).includes(sv) || sv.includes(simplify(u.name)));
  return partial.length === 1 ? partial[0]!.id : null;
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

    let orgUnitId = ctx.defaultOrgUnitId;
    const ouRaw = cell(r, 'orgUnit');
    if (ouRaw) {
      orgUnitId = matchOrgUnit(ouRaw, ctx.orgUnits);
      if (!orgUnitId) fail(rowNo, 'orgUnit', `No business unit matches "${ouRaw}"`);
    }

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
      orgUnitId,
      periodStart: periodStart!,
      periodEnd: periodEnd!,
      spend,
      currency: cell(r, 'currency').toUpperCase() || null,
      extra,
    });
  });

  return { valid, errors, errorCount };
}
