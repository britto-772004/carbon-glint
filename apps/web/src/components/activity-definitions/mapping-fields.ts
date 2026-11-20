import type { ColumnMapping } from '@carbon-glint/sdk';

export type MappingField = keyof ColumnMapping;

export const MAPPING_FIELDS: { field: MappingField; label: string; required: boolean; hint: string }[] = [
  { field: 'description', label: 'Activity description', required: true, hint: 'What was consumed or done' },
  { field: 'measure', label: 'Measure', required: true, hint: 'The quantity (a number)' },
  { field: 'unit', label: 'Unit', required: true, hint: 'kWh, L, kg, t, km, passenger.km…' },
  { field: 'orgUnit', label: 'Business unit', required: false, hint: 'Org unit code or name' },
  { field: 'location', label: 'Location', required: false, hint: 'Site, city, country or route' },
  { field: 'periodStart', label: 'Period start', required: false, hint: 'Date or month' },
  { field: 'periodEnd', label: 'Period end', required: false, hint: 'Date' },
  { field: 'spend', label: 'Spend', required: false, hint: 'Amount paid' },
  { field: 'currency', label: 'Currency', required: false, hint: 'ISO code' },
];

export const emptyMapping = (): ColumnMapping => ({
  description: null,
  measure: null,
  unit: null,
  location: null,
  orgUnit: null,
  periodStart: null,
  periodEnd: null,
  spend: null,
  currency: null,
});

export const isMappingComplete = (m: ColumnMapping) => MAPPING_FIELDS.every((f) => !f.required || m[f.field]);

export const WIZARD_STEPS = ['Upload', 'Sheet & header', 'Map columns', 'Import'] as const;
