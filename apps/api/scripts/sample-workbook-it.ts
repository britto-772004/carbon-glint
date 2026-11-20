/**
 * Builds a realistic test workbook for an IT / software services company (one sheet per Activity
 * Definition, same headers as the official upload template).
 *
 *   pnpm --filter @carbon-glint/api exec tsx scripts/sample-workbook-it.ts [out.xlsx]
 */
import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT = resolve(process.argv[2] ?? '../../docs/samples/carbon-glint-it-software-sample.xlsx');
const TEAL = 'FF0F766E';
const HEADERS = [
  'Activity Description',
  'Business Unit',
  'Location',
  'Measure',
  'Unit',
  'Period Start',
  'Period End',
  'Spend',
  'Currency',
];
type Row = [string, string, string, number, string, string, string, number | '', string];

const OFFICES = [
  { code: 'HQ', name: 'Headquarters', type: 'Headquarters', city: 'Bengaluru', country: 'IN', parent: '—', kwh: 52000 },
  {
    code: 'BLR',
    name: 'Bengaluru Tech Park',
    type: 'Office',
    city: 'Bengaluru',
    country: 'IN',
    parent: 'HQ',
    kwh: 38500,
  },
  {
    code: 'CHN',
    name: 'Chennai Delivery Centre',
    type: 'Office',
    city: 'Chennai',
    country: 'IN',
    parent: 'HQ',
    kwh: 29800,
  },
  {
    code: 'PUN',
    name: 'Pune Development Centre',
    type: 'Office',
    city: 'Pune',
    country: 'IN',
    parent: 'HQ',
    kwh: 21400,
  },
  {
    code: 'HYD',
    name: 'Hyderabad Data Centre',
    type: 'Plant / factory',
    city: 'Hyderabad',
    country: 'IN',
    parent: 'HQ',
    kwh: 96000,
  },
];

// FY 2025-26 (Apr–Mar), monthly.
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 3 + i, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const label = d.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { start: iso(d), end: iso(end), label, summer: [3, 4, 5].includes(d.getUTCMonth()) };
});
const FY = { start: MONTHS[0]!.start, end: MONTHS[11]!.end };
const Q = [
  { start: '2025-04-01', end: '2025-06-30', label: 'Q1' },
  { start: '2025-07-01', end: '2025-09-30', label: 'Q2' },
  { start: '2025-10-01', end: '2025-12-31', label: 'Q3' },
  { start: '2026-01-01', end: '2026-03-31', label: 'Q4' },
];
const wobble = (seed: number) =>
  1 + (Math.sin(seed * 12.9898) * 43758.5453 - Math.floor(Math.sin(seed * 12.9898) * 43758.5453) - 0.5) * 0.12;

const electricity: Row[] = OFFICES.flatMap((o, oi) =>
  MONTHS.map((m, mi) => {
    const kwh = Math.round(o.kwh * (m.summer ? 1.18 : 1) * wobble(oi * 31 + mi));
    return [
      `Grid electricity – ${o.name}`,
      o.code,
      `${o.city}, ${o.country}`,
      kwh,
      'kWh',
      m.start,
      m.end,
      Math.round(kwh * 9.2),
      'INR',
    ] as Row;
  }),
);

const stationary: Row[] = [
  ...['HQ', 'CHN', 'HYD'].flatMap((code, i) =>
    Q.map((q, qi) => {
      const o = OFFICES.find((x) => x.code === code)!;
      const litres = Math.round([420, 310, 1650][i]! * wobble(i * 7 + qi));
      return [
        `Diesel – DG set backup power`,
        code,
        `${o.city}, IN`,
        litres,
        'L',
        q.start,
        q.end,
        litres * 92,
        'INR',
      ] as Row;
    }),
  ),
  ['LPG – office cafeteria', 'BLR', 'Bengaluru, IN', 1180, 'kg', FY.start, FY.end, 112100, 'INR'],
  ['LPG – office cafeteria', 'PUN', 'Pune, IN', 640, 'kg', FY.start, FY.end, 60800, 'INR'],
];

const fugitive: Row[] = [
  ['R-410A refrigerant top-up – HVAC', 'HQ', 'Bengaluru, IN', 18, 'kg', FY.start, FY.end, 54000, 'INR'],
  ['R-410A refrigerant top-up – precision cooling', 'HYD', 'Hyderabad, IN', 42, 'kg', FY.start, FY.end, 126000, 'INR'],
  ['R-134a refrigerant top-up – chillers', 'CHN', 'Chennai, IN', 12, 'kg', FY.start, FY.end, 33600, 'INR'],
];

const travel: Row[] = [
  [
    'Flight – economy BLR→DXB return',
    'HQ',
    'Bengaluru–Dubai',
    21400,
    'passenger.km',
    Q[0]!.start,
    Q[0]!.end,
    182000,
    'INR',
  ],
  [
    'Flight – long-haul economy BLR→SFO return',
    'HQ',
    'Bengaluru–San Francisco',
    54200,
    'passenger.km',
    Q[1]!.start,
    Q[1]!.end,
    640000,
    'INR',
  ],
  [
    'Flight – long-haul business class BLR→LHR return',
    'HQ',
    'Bengaluru–London',
    32800,
    'passenger.km',
    Q[2]!.start,
    Q[2]!.end,
    910000,
    'INR',
  ],
  ['Flight – domestic economy', 'CHN', 'Chennai–Delhi', 18600, 'passenger.km', Q[1]!.start, Q[1]!.end, 98000, 'INR'],
  ['Flight – domestic economy', 'PUN', 'Pune–Bengaluru', 9400, 'passenger.km', Q[3]!.start, Q[3]!.end, 61000, 'INR'],
  ['Hotel stay – Dubai', 'HQ', 'Dubai, AE', 24, 'room.night', Q[0]!.start, Q[0]!.end, 264000, 'INR'],
  ['Hotel stay – United States', 'HQ', 'San Francisco, US', 36, 'room.night', Q[1]!.start, Q[1]!.end, 720000, 'INR'],
  ['Hotel stay – United Kingdom', 'HQ', 'London, GB', 20, 'room.night', Q[2]!.start, Q[2]!.end, 390000, 'INR'],
  ['Hotel stay – India', 'CHN', 'Delhi, IN', 42, 'room.night', Q[1]!.start, Q[1]!.end, 189000, 'INR'],
  ['Rail – national rail', 'PUN', 'Pune–Mumbai', 6200, 'passenger.km', Q[2]!.start, Q[2]!.end, 18600, 'INR'],
  ['Taxi – client visits', 'BLR', 'Bengaluru, IN', 14800, 'km', FY.start, FY.end, 266400, 'INR'],
];

const commuting: Row[] = OFFICES.filter((o) => o.code !== 'HYD').flatMap((o, i) => {
  const staff = [220, 640, 410, 280][i]!;
  return [
    [
      `Car – average petrol, employee commuting`,
      o.code,
      `${o.city}, IN`,
      Math.round(staff * 0.35 * 18 * 2 * 220),
      'km',
      FY.start,
      FY.end,
      '',
      '',
    ],
    [
      `Motorbike – average, employee commuting`,
      o.code,
      `${o.city}, IN`,
      Math.round(staff * 0.3 * 12 * 2 * 220),
      'km',
      FY.start,
      FY.end,
      '',
      '',
    ],
    [
      `Bus – local, employee commuting`,
      o.code,
      `${o.city}, IN`,
      Math.round(staff * 0.25 * 15 * 2 * 220),
      'passenger.km',
      FY.start,
      FY.end,
      '',
      '',
    ],
    [
      `Metro / light rail – employee commuting`,
      o.code,
      `${o.city}, IN`,
      Math.round(staff * 0.1 * 14 * 2 * 220),
      'passenger.km',
      FY.start,
      FY.end,
      '',
      '',
    ],
  ] as Row[];
});

const purchased: Row[] = [
  ['Laptops purchased', 'HQ', 'Bengaluru, IN', 320, 'unit', FY.start, FY.end, 22400000, 'INR'],
  ['Monitors purchased', 'BLR', 'Bengaluru, IN', 180, 'unit', FY.start, FY.end, 2520000, 'INR'],
  ['Servers – rack mounted', 'HYD', 'Hyderabad, IN', 24, 'unit', FY.start, FY.end, 19200000, 'INR'],
  ['Office paper (A4)', 'HQ', 'Bengaluru, IN', 1.8, 't', FY.start, FY.end, 216000, 'INR'],
  ['Office paper (A4)', 'CHN', 'Chennai, IN', 1.1, 't', FY.start, FY.end, 132000, 'INR'],
];

const waste: Row[] = [
  ['Mixed waste to landfill', 'HQ', 'Bengaluru, IN', 14.2, 't', FY.start, FY.end, '', ''],
  ['Mixed recycling – paper and cardboard', 'BLR', 'Bengaluru, IN', 6.8, 't', FY.start, FY.end, '', ''],
  ['Food waste – composting', 'CHN', 'Chennai, IN', 9.4, 't', FY.start, FY.end, '', ''],
  ['WEEE – mixed electronic waste, recycling', 'HYD', 'Hyderabad, IN', 2.6, 't', FY.start, FY.end, '', ''],
];

const SHEETS: Array<{ name: string; scope: string; category: string; adName: string; rows: Row[] }> = [
  {
    name: 'S2 Electricity',
    scope: 'Scope 2',
    category: 'Purchased electricity',
    adName: 'Office & DC electricity FY26',
    rows: electricity,
  },
  {
    name: 'S1 DG sets & LPG',
    scope: 'Scope 1',
    category: 'Stationary combustion',
    adName: 'DG sets & cafeteria LPG FY26',
    rows: stationary,
  },
  {
    name: 'S1 Refrigerants',
    scope: 'Scope 1',
    category: 'Fugitive emissions',
    adName: 'HVAC refrigerants FY26',
    rows: fugitive,
  },
  {
    name: 'S3 Business travel',
    scope: 'Scope 3',
    category: '6. Business travel',
    adName: 'Business travel FY26',
    rows: travel,
  },
  {
    name: 'S3 Commuting',
    scope: 'Scope 3',
    category: '7. Employee commuting',
    adName: 'Employee commuting FY26',
    rows: commuting,
  },
  {
    name: 'S3 Purchased goods',
    scope: 'Scope 3',
    category: '1. Purchased goods & services',
    adName: 'IT hardware & supplies FY26',
    rows: purchased,
  },
  {
    name: 'S3 Waste',
    scope: 'Scope 3',
    category: '5. Waste generated in operations',
    adName: 'Office waste FY26',
    rows: waste,
  },
];

const wb = new ExcelJS.Workbook();
wb.creator = 'Carbon Glint';
wb.created = new Date('2026-11-20T00:00:00Z');

const header = (ws: ExcelJS.Worksheet) => {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Livvic' };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  r.alignment = { vertical: 'middle' };
  r.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
};

// Read-me sheet first.
const readme = wb.addWorksheet('Read me', { properties: { tabColor: { argb: TEAL } } });
readme.columns = [{ width: 30 }, { width: 34 }, { width: 22 }, { width: 18 }, { width: 14 }, { width: 10 }];
readme.addRow(['Carbon Glint – test data for an IT / software services company']).font = {
  bold: true,
  size: 16,
  color: { argb: TEAL },
};
readme.addRow(['Reporting period: FY 2025-26 (1 Apr 2025 – 31 Mar 2026). One sheet per Activity Definition.']);
readme.addRow([]);
readme.addRow(['Step 1 – create these business units (Org Units) first. Rows use the Code column.']).font = {
  bold: true,
};
const ouHeader = readme.addRow(['Code', 'Name', 'Type', 'City', 'Country', 'Parent']);
ouHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
ouHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
for (const o of OFFICES) readme.addRow([o.code, o.name, o.type, o.city, o.country, o.parent]);
readme.addRow(['Tip: your headquarters already exists with code HQ. Create the other four under it.']).font = {
  italic: true,
};
readme.addRow([]);
readme.addRow(['Step 2 – create one Activity Definition per sheet, upload this file and pick the sheet:']).font = {
  bold: true,
};
const adHeader = readme.addRow(['Sheet', 'Activity Definition name', 'Scope', 'GHG category', 'Rows']);
adHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
adHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
for (const s of SHEETS) readme.addRow([s.name, s.adName, s.scope, s.category, s.rows.length]);
readme.addRow([]);
readme.addRow(['Step 3 – map columns (AI or manual), import, then Publish. Emissions appear on the Dashboard.']).font =
  { bold: true };
readme.addRow(['Step 4 – try deleting a few rows on a definition and press Recalculate.']).font = { bold: true };

for (const s of SHEETS) {
  const ws = wb.addWorksheet(s.name);
  ws.columns = [
    { width: 46 },
    { width: 14 },
    { width: 24 },
    { width: 12 },
    { width: 14 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 10 },
  ];
  ws.addRow(HEADERS);
  header(ws);
  for (const r of s.rows) ws.addRow(r);
  ws.getColumn(4).numFmt = '#,##0.##';
  ws.getColumn(8).numFmt = '#,##0';
  ws.autoFilter = { from: 'A1', to: 'I1' };
}

mkdirSync(dirname(OUT), { recursive: true });
await wb.xlsx.writeFile(OUT);
console.log(`wrote ${OUT}: ${SHEETS.map((s) => `${s.name} (${s.rows.length})`).join(', ')}`);
