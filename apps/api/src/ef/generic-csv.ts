import Papa from 'papaparse';
import { normalizeUnit } from '../lib/units.js';
import type { ParsedDataset, ParsedFactor } from './types.js';

/**
 * Carbon Glint emission-factor CSV — a simple interchange format for loading other public databases
 * (ADEME Base Carbone exports, US EPA GHG Emission Factors Hub, India CEA grid factors, Australia NGA, Singapore EMA, …).
 *
 * Columns: external_id, name, category, scope (1|2|3|blank), region, unit, co2e_per_unit, co2_per_unit?, ch4_per_unit?, n2o_per_unit?
 * `unit` uses Carbon Glint unit codes or common names (kWh, L, kg, t, km, passenger.km, tonne.km, m3…). Values are kg CO2e per unit.
 */
export const GENERIC_COLUMNS = [
  'external_id',
  'name',
  'category',
  'scope',
  'region',
  'unit',
  'co2e_per_unit',
  'co2_per_unit',
  'ch4_per_unit',
  'n2o_per_unit',
] as const;

const optNum = (s: string | undefined) => (s && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null);

export function parseGenericFactorCsv(
  csv: string,
  source: ParsedDataset['source'],
): { dataset: ParsedDataset; errors: string[] } {
  const rows = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true }).data;
  const errors: string[] = [];
  const factors: ParsedFactor[] = [];
  rows.forEach((r, i) => {
    const line = i + 2;
    const co2e = optNum(r.co2e_per_unit);
    if (!r.external_id || !r.name || co2e === null || !r.unit) {
      errors.push(`line ${line}: external_id, name, unit and co2e_per_unit are required`);
      return;
    }
    const scope = r.scope?.trim();
    factors.push({
      externalId: r.external_id.trim(),
      name: r.name.trim(),
      category: (r.category ?? '').trim(),
      scopeHint: scope === '1' || scope === '2' || scope === '3' ? (Number(scope) as 1 | 2 | 3) : null,
      region: (r.region ?? '').trim() || 'GLOBAL',
      unit: normalizeUnit(r.unit)?.code ?? null,
      unitLabel: r.unit.trim(),
      co2ePerUnit: co2e,
      co2PerUnit: optNum(r.co2_per_unit),
      ch4PerUnit: optNum(r.ch4_per_unit),
      n2oPerUnit: optNum(r.n2o_per_unit),
    });
  });
  return { dataset: { source, factors }, errors };
}
