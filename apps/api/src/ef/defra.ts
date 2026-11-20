import ExcelJS from 'exceljs';
import type { ParsedDataset, ParsedFactor } from './types.js';

/**
 * UK Government GHG Conversion Factors for Company Reporting (DESNZ/DEFRA) — "flat file" format.
 * Sheet "Factors by Category", header row: ID | Scope | Level 1..4 | Column Text | UOM | GHG/Unit | GHG Conversion Factor <year>.
 * Each factor has a total row ("kg CO2e") followed by per-gas rows ("kg CO2e of CO2/CH4/N2O per unit").
 * Licence: Open Government Licence v3.0.
 */
const UOM: Record<string, { unit: string | null; scale: number }> = {
  tonnes: { unit: 't', scale: 1 },
  litres: { unit: 'L', scale: 1 },
  'million litres': { unit: 'L', scale: 1e-6 }, // per million litres → per litre
  'kwh (net cv)': { unit: 'kWh', scale: 1 },
  'kwh (gross cv)': { unit: 'kWh', scale: 1 },
  kwh: { unit: 'kWh', scale: 1 },
  'cubic metres': { unit: 'm3', scale: 1 },
  gj: { unit: 'GJ', scale: 1 },
  kg: { unit: 'kg', scale: 1 },
  km: { unit: 'km', scale: 1 },
  miles: { unit: 'mile', scale: 1 },
  'tonne.km': { unit: 'tonne.km', scale: 1 },
  'passenger.km': { unit: 'passenger.km', scale: 1 },
  'room per night': { unit: 'room.night', scale: 1 },
};

const text = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (typeof v === 'object' && 'result' in v) return text(v.result as ExcelJS.CellValue);
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  return String(v).trim();
};
const num = (v: ExcelJS.CellValue): number | null => {
  const s = text(v);
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function parseDefraFlatFile(data: Buffer, opts: { url: string }): Promise<ParsedDataset> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);
  const ws = wb.getWorksheet('Factors by Category');
  if (!ws) throw new Error('Not a DEFRA flat file: sheet "Factors by Category" missing');

  let headerRow = 0;
  let year = 0;
  ws.eachRow((row, n) => {
    if (headerRow) return;
    const v = (row.values as ExcelJS.CellValue[]).map(text);
    if (v[1] === 'ID' && v[2] === 'Scope') {
      headerRow = n;
      year = Number(v[10]?.match(/(\d{4})/)?.[1] ?? 0);
    }
  });
  if (!headerRow || !year) throw new Error('DEFRA flat file header row not found');

  const byKey = new Map<string, ParsedFactor>();
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const v = row.values as ExcelJS.CellValue[];
    const id = text(v[1]);
    const scope = text(v[2]);
    const levels = [text(v[3]), text(v[4]), text(v[5]), text(v[6]), text(v[7])];
    const uomRaw = text(v[8]);
    const ghg = text(v[9]).toLowerCase();
    const value = num(v[10]);
    if (!id || !uomRaw || value === null || !ghg.startsWith('kg co2e')) return;

    const uom = UOM[uomRaw.toLowerCase()] ?? { unit: null, scale: 1 };
    const factorId = id.replace(/_\d+$/, ''); // per-gas rows share the prefix of their total row
    const key = factorId;
    let f = byKey.get(key);
    if (!f) {
      const [l1, ...rest] = levels;
      // Hotel stay rows: Level 1/2 = 'Hotel stay', Level 3 = country
      const country = l1 === 'Hotel stay' ? levels[2] || levels[1] || '' : '';
      f = {
        externalId: factorId,
        name: [...rest.filter(Boolean), `(${uomRaw})`].join(' › '),
        category: l1 ?? '',
        scopeHint: scope === 'Scope 1' ? 1 : scope === 'Scope 2' ? 2 : scope === 'Scope 3' ? 3 : null,
        region: /UK|electricity|T&D/i.test(`${l1} ${rest.join(' ')}`) && !country ? 'GB' : country || 'GLOBAL',
        unit: uom.unit,
        unitLabel: uomRaw,
        co2ePerUnit: Number.NaN,
        co2PerUnit: null,
        ch4PerUnit: null,
        n2oPerUnit: null,
      };
      byKey.set(key, f);
    }
    const scaled = value * uom.scale;
    if (ghg === 'kg co2e') f.co2ePerUnit = scaled;
    else if (ghg.includes('of co2 ')) f.co2PerUnit = scaled;
    else if (ghg.includes('of ch4')) f.ch4PerUnit = scaled;
    else if (ghg.includes('of n2o')) f.n2oPerUnit = scaled;
  });

  const factors = [...byKey.values()].filter((f) => Number.isFinite(f.co2ePerUnit));
  return {
    source: {
      code: `DEFRA_${year}`,
      publisher: 'UK Department for Energy Security and Net Zero (DESNZ) / DEFRA',
      name: `UK Government GHG Conversion Factors for Company Reporting ${year}`,
      version: String(year),
      year,
      licence: 'Open Government Licence v3.0',
      url: opts.url,
    },
    factors,
  };
}

/** Finds the flat-file download for a given year via the GOV.UK content API. */
export async function findDefraFlatFileUrl(year: number, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(
    `https://www.gov.uk/api/content/government/publications/greenhouse-gas-reporting-conversion-factors-${year}`,
  );
  if (!res.ok) throw new Error(`GOV.UK returned ${res.status} for DEFRA ${year}`);
  const json = (await res.json()) as { details?: { attachments?: Array<{ title?: string; url?: string }> } };
  const att = json.details?.attachments?.find((a) => /flat file/i.test(a.title ?? '') && a.url?.endsWith('.xlsx'));
  if (!att?.url) throw new Error(`No flat-file attachment found for DEFRA ${year}`);
  return att.url;
}
