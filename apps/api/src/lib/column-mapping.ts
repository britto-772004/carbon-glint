import type { ColumnMapping } from '../models/activity.model.js';

export const MAPPING_FIELDS = [
  'description',
  'measure',
  'unit',
  'location',
  'orgUnit',
  'periodStart',
  'periodEnd',
  'spend',
  'currency',
] as const satisfies readonly (keyof ColumnMapping)[];
export type MappingField = (typeof MAPPING_FIELDS)[number];
export const REQUIRED_FIELDS: MappingField[] = ['description', 'measure', 'unit'];

const SYNONYMS: Record<MappingField, string[]> = {
  description: [
    'activity description',
    'description',
    'activity',
    'item',
    'particulars',
    'details',
    'fuel',
    'fuel type',
    'source',
    'emission source',
    'name',
  ],
  measure: [
    'measure',
    'volume',
    'quantity',
    'qty',
    'amount',
    'consumption',
    'usage',
    'value',
    'distance',
    'weight',
    'kwh',
    'litres',
    'liters',
  ],
  unit: ['unit', 'units', 'uom', 'unit of measure', 'unit of measurement', 'measure unit'],
  location: ['location', 'site', 'city', 'country', 'region', 'place', 'address', 'route'],
  orgUnit: [
    'business unit',
    'bu',
    'org unit',
    'branch',
    'facility',
    'plant',
    'office',
    'department',
    'site code',
    'unit code',
    'cost center',
    'cost centre',
    'entity',
  ],
  periodStart: ['period start', 'start date', 'from', 'from date', 'date', 'month', 'billing start', 'invoice date'],
  periodEnd: ['period end', 'end date', 'to', 'to date', 'billing end'],
  spend: ['spend', 'cost', 'amount spent', 'invoice amount', 'price', 'total cost', 'expense'],
  currency: ['currency', 'ccy', 'cur'],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Whole-word containment ("to" must not match inside "total"). */
const hasPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `);

/** Score how well a header matches a field (exact synonym 3, header contains synonym 2, synonym contains header 1). */
function score(header: string, field: MappingField): number {
  const h = norm(header);
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    if (h === syn) best = Math.max(best, 3);
    else if (hasPhrase(h, syn)) best = Math.max(best, 2);
    else if (h.length >= 3 && hasPhrase(syn, h)) best = Math.max(best, 1);
  }
  return best;
}

/** Deterministic header-name mapping (used alone without Gemini, and as a fallback/validator for AI output). */
export function heuristicMapping(columns: string[]): {
  mapping: ColumnMapping;
  confidence: Record<MappingField, number>;
} {
  const mapping = Object.fromEntries(MAPPING_FIELDS.map((f) => [f, null])) as unknown as ColumnMapping;
  const confidence = Object.fromEntries(MAPPING_FIELDS.map((f) => [f, 0])) as Record<MappingField, number>;
  const candidates = MAPPING_FIELDS.flatMap((field) =>
    columns.map((column) => ({ field, column, s: score(column, field) })).filter((c) => c.s > 0),
  ).sort((a, b) => b.s - a.s);
  const usedColumns = new Set<string>();
  for (const c of candidates) {
    if (mapping[c.field] || usedColumns.has(c.column)) continue;
    mapping[c.field] = c.column;
    confidence[c.field] = c.s === 3 ? 0.9 : c.s === 2 ? 0.7 : 0.4;
    usedColumns.add(c.column);
  }
  return { mapping, confidence };
}

/** Drops mappings to columns that don't exist and duplicate uses of one column. */
export function sanitizeMapping(raw: Partial<Record<string, unknown>>, columns: string[]): ColumnMapping {
  const used = new Set<string>();
  const out = Object.fromEntries(MAPPING_FIELDS.map((f) => [f, null])) as unknown as ColumnMapping;
  for (const f of MAPPING_FIELDS) {
    const v = raw[f];
    if (typeof v === 'string' && columns.includes(v) && !used.has(v)) {
      out[f] = v;
      used.add(v);
    }
  }
  return out;
}
