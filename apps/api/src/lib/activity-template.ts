import ExcelJS from 'exceljs';
import { UNITS } from './units.js';

/** Columns of the sample data-source template (headers chosen so auto-mapping recognises them). */
export const TEMPLATE_COLUMNS = [
  { header: 'Activity Description', key: 'description', width: 38, note: 'What was consumed or done (required)' },
  { header: 'Location', key: 'location', width: 22, note: 'City / country / route (optional)' },
  { header: 'Measure', key: 'measure', width: 12, note: 'Quantity — a number (required)' },
  { header: 'Unit', key: 'unit', width: 14, note: 'kWh, L, kg, t, km, passenger.km, tonne.km, room.night… (required)' },
  { header: 'Period Start', key: 'periodStart', width: 14, note: 'yyyy-mm-dd (optional; defaults to AD period)' },
  { header: 'Period End', key: 'periodEnd', width: 14, note: 'yyyy-mm-dd (optional)' },
  { header: 'Spend', key: 'spend', width: 12, note: 'Amount paid (optional, for spend-based factors)' },
  { header: 'Currency', key: 'currency', width: 10, note: 'ISO code, e.g. INR, USD (optional)' },
] as const;

export const TEMPLATE_ROWS: Array<Record<(typeof TEMPLATE_COLUMNS)[number]['key'], string | number>> = [
  {
    description: 'Grid electricity – office',
    location: 'Bengaluru, IN',
    measure: 18450,
    unit: 'kWh',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: 166050,
    currency: 'INR',
  },
  {
    description: 'Diesel – DG set backup power',
    location: 'Bengaluru, IN',
    measure: 1200,
    unit: 'L',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: 108000,
    currency: 'INR',
  },
  {
    description: 'Petrol – company cars',
    location: 'Bengaluru, IN',
    measure: 640,
    unit: 'L',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: 65280,
    currency: 'INR',
  },
  {
    description: 'Natural gas – boiler',
    location: 'Pune, IN',
    measure: 5200,
    unit: 'm3',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: '',
    currency: '',
  },
  {
    description: 'R-410A refrigerant top-up – HVAC',
    location: 'Pune, IN',
    measure: 3.5,
    unit: 'kg',
    periodStart: '2026-02-12',
    periodEnd: '2026-02-12',
    spend: '',
    currency: '',
  },
  {
    description: 'Flight – economy BLR→DXB return',
    location: 'BLR-DXB',
    measure: 5420,
    unit: 'passenger.km',
    periodStart: '2026-02-03',
    periodEnd: '2026-02-07',
    spend: 38000,
    currency: 'INR',
  },
  {
    description: 'Hotel stay – Dubai',
    location: 'Dubai, AE',
    measure: 4,
    unit: 'room.night',
    periodStart: '2026-02-03',
    periodEnd: '2026-02-07',
    spend: 2400,
    currency: 'AED',
  },
  {
    description: 'Road freight – HGV diesel',
    location: 'Pune → Mumbai',
    measure: 18600,
    unit: 'tonne.km',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: '',
    currency: '',
  },
  {
    description: 'Office paper (A4)',
    location: 'Bengaluru, IN',
    measure: 0.25,
    unit: 't',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: 21000,
    currency: 'INR',
  },
  {
    description: 'Mixed waste to landfill',
    location: 'Pune, IN',
    measure: 2.1,
    unit: 't',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    spend: '',
    currency: '',
  },
];

const BRAND = 'FF0F766E';

/** Builds the downloadable XLSX template: Instructions sheet + Activities sheet (with unit dropdowns). */
export async function buildActivityTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Carbon Glint';
  wb.created = new Date();

  const info = wb.addWorksheet('Instructions', { properties: { tabColor: { argb: BRAND } } });
  info.columns = [{ width: 26 }, { width: 90 }];
  info.addRow(['Carbon Glint – activity data template']).font = { bold: true, size: 16, color: { argb: BRAND } };
  info.addRow([]);
  info.addRow([
    'How to use',
    'Fill one row per activity on the "Activities" sheet, then upload it to an Activity Definition. Column names can be changed — you will map them during upload (or let AI do it).',
  ]);
  info.addRow([]);
  info.addRow(['Column', 'What to enter']).font = { bold: true };
  for (const c of TEMPLATE_COLUMNS) info.addRow([c.header, c.note]);
  info.addRow([]);
  info.addRow(['Accepted units']).font = { bold: true };
  info.addRow([
    '',
    UNITS.filter((u) => u.dimension !== 'currency')
      .map((u) => u.code)
      .join(', '),
  ]);
  info.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  const ws = wb.addWorksheet('Activities', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  header.height = 22;
  for (const r of TEMPLATE_ROWS) ws.addRow(r);
  ws.getColumn('measure').numFmt = '#,##0.###';
  ws.getColumn('spend').numFmt = '#,##0.00';
  const unitList = `"${UNITS.filter((u) => u.dimension !== 'currency')
    .map((u) => u.code)
    .join(',')}"`;
  if (unitList.length < 255) {
    for (let r = 2; r <= 500; r++) {
      ws.getCell(`D${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [unitList],
        showErrorMessage: false,
      };
    }
  }
  ws.autoFilter = { from: 'A1', to: 'H1' };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildActivityTemplateCsv(): string {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [
    TEMPLATE_COLUMNS.map((c) => c.header).join(','),
    ...TEMPLATE_ROWS.map((r) => TEMPLATE_COLUMNS.map((c) => esc(r[c.key])).join(',')),
  ].join('\n');
}
