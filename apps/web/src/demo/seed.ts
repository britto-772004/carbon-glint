import type { ColumnMapping, DataSource, GhgCategory, OrgUnit, Report, User } from '@carbon-glint/sdk';
import { applyOverride, calculate, nextId } from './engine';
import { factorByKey } from './factors';
import { createRng, type Rng } from './rng';
import type { DemoActivity, DemoState } from './types';

const T0 = '2026-01-05T09:00:00.000Z';
export const DEMO_USER_ID = 'demo-user-1';

// ── Organisation ─────────────────────────────────────────────────────────────
const UNITS: Array<
  [code: string, name: string, type: OrgUnit['type'], parent: string | null, country: string, city: string]
> = [
  ['HQ', 'Aurora HQ', 'hq', null, 'IN', 'Bengaluru'],
  ['PUN', 'Pune Plant', 'plant', 'HQ', 'IN', 'Pune'],
  ['CHE', 'Chennai Plant', 'plant', 'HQ', 'IN', 'Chennai'],
  ['HOS', 'Hosur Foundry', 'plant', 'HQ', 'IN', 'Hosur'],
  ['MUM', 'Mumbai Warehouse', 'warehouse', 'HQ', 'IN', 'Mumbai'],
  ['DEL', 'Delhi Sales Office', 'office', 'HQ', 'IN', 'New Delhi'],
  ['DXB', 'Dubai Office', 'office', 'HQ', 'AE', 'Dubai'],
  ['SIN', 'Singapore Branch', 'branch', 'HQ', 'SG', 'Singapore'],
  ['FRA', 'Frankfurt Branch', 'branch', 'HQ', 'DE', 'Frankfurt'],
  ['PRD', 'Pune R&D Campus', 'campus', 'PUN', 'IN', 'Pune'],
];
export const ouId = (code: string) => `demo-ou-${code.toLowerCase()}`;
const CITY: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u[0], `${u[5]}, ${u[4]}`]));

// ── GHG Protocol categories (same taxonomy as the real app) ──────────────────
const CATS: Array<[scope: 1 | 2 | 3, code: string, name: string, description: string]> = [
  [
    1,
    'S1_STATIONARY',
    'Stationary combustion',
    'Fuels burned in boilers, furnaces, generators and other fixed equipment (diesel DG sets, natural gas, LPG, coal).',
  ],
  [
    1,
    'S1_MOBILE',
    'Mobile combustion',
    'Fuels burned in company-owned or controlled vehicles, forklifts, ships and aircraft.',
  ],
  [
    1,
    'S1_PROCESS',
    'Process emissions',
    'Non-combustion emissions from industrial processes (cement calcination, chemical reactions, smelting).',
  ],
  [
    1,
    'S1_FUGITIVE',
    'Fugitive emissions',
    'Leaks of refrigerants (HFCs), SF6, methane and other gases from equipment.',
  ],
  [
    2,
    'S2_ELECTRICITY',
    'Purchased electricity',
    'Electricity bought from the grid or a supplier and consumed by the organisation.',
  ],
  [
    2,
    'S2_HEAT_STEAM',
    'Purchased heat & steam',
    'Heat or steam bought from a third party (district heating, industrial steam).',
  ],
  [2, 'S2_COOLING', 'Purchased cooling', 'Chilled water or cooling bought from a third party (district cooling).'],
  [
    3,
    'S3_C1',
    '1. Purchased goods & services',
    'Cradle-to-gate emissions of goods and services bought in the reporting year.',
  ],
  [3, 'S3_C2', '2. Capital goods', 'Cradle-to-gate emissions of capital goods (buildings, machinery, IT hardware).'],
  [
    3,
    'S3_C3',
    '3. Fuel- & energy-related activities',
    'Upstream emissions of purchased fuels and electricity, and transmission & distribution losses.',
  ],
  [
    3,
    'S3_C4',
    '4. Upstream transportation & distribution',
    'Transport and storage of purchased products by third parties.',
  ],
  [
    3,
    'S3_C5',
    '5. Waste generated in operations',
    'Disposal and treatment of waste (landfill, recycling, incineration, wastewater).',
  ],
  [
    3,
    'S3_C6',
    '6. Business travel',
    'Employee travel for work in vehicles not owned by the organisation (flights, rail, taxis, hotels).',
  ],
  [3, 'S3_C7', '7. Employee commuting', 'Employees travelling between home and work, including remote working.'],
  [3, 'S3_C8', '8. Upstream leased assets', 'Operation of assets leased by the organisation and not in Scope 1 or 2.'],
  [
    3,
    'S3_C9',
    '9. Downstream transportation & distribution',
    'Transport and storage of sold products after the point of sale.',
  ],
  [3, 'S3_C10', '10. Processing of sold products', 'Processing of intermediate products sold to other companies.'],
  [
    3,
    'S3_C11',
    '11. Use of sold products',
    'End use of goods and services sold (e.g. fuel or electricity used by products).',
  ],
  [
    3,
    'S3_C12',
    '12. End-of-life treatment of sold products',
    'Disposal and treatment of sold products at end of life.',
  ],
  [3, 'S3_C13', '13. Downstream leased assets', 'Operation of assets owned by the organisation and leased to others.'],
  [3, 'S3_C14', '14. Franchises', 'Operation of franchises not included in Scope 1 or 2.'],
  [3, 'S3_C15', '15. Investments', 'Emissions from equity and debt investments and project finance.'],
];
const RECOMMENDED = [
  'S1_STATIONARY',
  'S1_MOBILE',
  'S1_PROCESS',
  'S2_ELECTRICITY',
  'S3_C1',
  'S3_C3',
  'S3_C4',
  'S3_C5',
  'S3_C6',
  'S3_C7',
];

// ── Time ─────────────────────────────────────────────────────────────────────
const MONTHS = Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const lastDay = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const monthStart = (m: string) => `${m}-01`;
const monthEnd = (m: string) => `${m}-${String(lastDay(m)).padStart(2, '0')}`;
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

type Row = Omit<DemoActivity, 'id' | 'definitionId' | 'dataSourceId' | 'rowNumber'>;

interface Stream {
  bu: string;
  desc: string;
  factor: string | null;
  unit: string;
  base: number;
  /** seasonal swing (fraction of base) */
  amp?: number;
  /** total drift over the 10 months (fraction of base) */
  trend?: number;
  noise?: number;
  decimals?: number;
  /** chance that a row is flagged "needs review" */
  review?: number;
  months?: string[];
}

function monthly(rng: Rng, streams: Stream[]): Row[] {
  const rows: Row[] = [];
  for (const s of streams) {
    const phase = rng.between(0, Math.PI * 2);
    (s.months ?? MONTHS).forEach((m, i) => {
      const season = 1 + (s.amp ?? 0.1) * Math.sin((i / 12) * Math.PI * 2 + phase);
      const drift = 1 + ((s.trend ?? 0) * i) / 9;
      const noise = 1 + (rng.next() - 0.5) * 2 * (s.noise ?? 0.07);
      const raw = s.base * season * drift * noise;
      const p = 10 ** (s.decimals ?? 0);
      rows.push({
        description: s.desc,
        location: CITY[s.bu] ?? null,
        measure: Math.max(0.1, Math.round(raw * p) / p),
        unit: s.unit,
        orgUnitId: ouId(s.bu),
        periodStart: monthStart(m),
        periodEnd: monthEnd(m),
        factorKey: s.factor,
        review: s.review ? rng.next() < s.review : undefined,
      });
    });
  }
  return rows;
}

const STD_COLUMNS = ['Activity Description', 'Location', 'Measure', 'Unit', 'Period Start', 'Period End'];
export const STD_MAPPING: ColumnMapping = {
  description: 'Activity Description',
  location: 'Location',
  measure: 'Measure',
  unit: 'Unit',
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  spend: null,
  currency: null,
};

export function buildState(): DemoState {
  const rng = createRng(20260521);
  const industries = [
    { id: 'demo-ind-mfg', code: 'manufacturing', name: 'Manufacturing' },
    { id: 'demo-ind-it', code: 'it_software', name: 'IT & software services' },
    { id: 'demo-ind-log', code: 'logistics', name: 'Logistics & transportation' },
    { id: 'demo-ind-ret', code: 'retail', name: 'Retail & consumer goods' },
    { id: 'demo-ind-fin', code: 'financial_services', name: 'Banking & financial services' },
    { id: 'demo-ind-hc', code: 'healthcare', name: 'Healthcare & pharma' },
  ];
  const user: User = {
    id: DEMO_USER_ID,
    email: 'priya.nair@aurora-mfg.example',
    name: 'Priya Nair',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    passwordIsTemporary: false,
    lastLoginAt: new Date().toISOString(),
    createdAt: T0,
  };
  const s: DemoState = {
    user,
    tenant: {
      id: 'demo-tenant',
      name: 'Aurora Manufacturing Pvt Ltd',
      emailDomain: 'aurora-mfg.example',
      status: 'active',
      onboarded: true,
      industry: industries[0]!,
      employeeBand: '251-1000',
      businessUnitCount: UNITS.length,
      website: 'https://aurora-mfg.example',
      linkedinUrl: null,
      createdAt: T0,
    },
    industries,
    orgUnits: UNITS.map(([code, name, type, parent, country, city]) => ({
      id: ouId(code),
      parentId: parent ? ouId(parent) : null,
      name,
      code,
      type,
      country,
      city,
      address: null,
      active: true,
      createdAt: T0,
    })),
    categories: CATS.map(([scope, code, name, description]): GhgCategory => ({
      id: `demo-cat-${code.toLowerCase()}`,
      scope,
      code,
      name,
      description,
      custom: false,
      recommended: RECOMMENDED.includes(code),
      rank: RECOMMENDED.includes(code) ? RECOMMENDED.indexOf(code) : null,
    })),
    definitions: [],
    dataSources: [],
    activities: [],
    calcs: new Map(),
    overrides: new Map(),
    reports: [],
    conversations: [],
    messages: new Map(),
    users: [],
    invitations: [],
    sync: {
      intervalHours: 168,
      nextRunAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      lastRun: {
        trigger: 'schedule',
        status: 'ok',
        startedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        finishedAt: new Date(Date.now() - 2 * 86_400_000 + 41_000).toISOString(),
        imported: [],
        message: 'All known databases are up to date.',
      },
    },
    seq: 0,
  };
  const cat = (code: string) => s.categories.find((c) => c.code === code)!;
  let defIndex = 0;

  /** Create a definition + its imported data source from `rows`. */
  const define = (
    name: string,
    description: string,
    catCode: string,
    defaultBu: string | null,
    file: string,
    rows: Row[],
    status: 'published' | 'draft' = 'published',
  ) => {
    defIndex += 1;
    const c = cat(catCode);
    const id = `demo-ad-${String(defIndex).padStart(2, '0')}`;
    const dsId = `demo-ds-${String(defIndex).padStart(2, '0')}`;
    const created = new Date(Date.UTC(2026, 0, 12 + defIndex)).toISOString();
    s.definitions.push({
      id,
      name,
      description,
      scope: c.scope,
      category: { id: c.id, code: c.code, name: c.name, scope: c.scope },
      defaultOrgUnitId: defaultBu ? ouId(defaultBu) : null,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      status,
      publishedAt: status === 'published' ? new Date(Date.UTC(2026, 10, 2, 10, defIndex)).toISOString() : null,
      createdAt: created,
    });
    if (rows.length > 0) {
      rows.forEach((r, i) =>
        s.activities.push({
          ...r,
          id: `demo-act-${String(s.activities.length + 1).padStart(4, '0')}`,
          definitionId: id,
          dataSourceId: dsId,
          rowNumber: i + 2,
        }),
      );
      const ds: DataSource = {
        id: dsId,
        activityDefinitionId: id,
        fileName: file,
        fileType: file.endsWith('.csv') ? 'csv' : 'xlsx',
        fileSize: 4_000 + rows.length * 96,
        sheets: ['Sheet1'],
        sheetName: 'Sheet1',
        headerRow: 1,
        columns: STD_COLUMNS,
        preview: rows
          .slice(0, 8)
          .map((r) => [r.description, r.location ?? '', String(r.measure), r.unit, r.periodStart, r.periodEnd]),
        rowCount: rows.length,
        mapping: STD_MAPPING,
        mappingMode: 'ai',
        status: 'imported',
        importedCount: rows.length,
        errorCount: 0,
        errors: [],
        importedAt: created,
        createdAt: created,
      };
      s.dataSources.push(ds);
    }
    return id;
  };
  const S = (o: Stream) => o;

  // ═════════════════════════ SCOPE 1 ═════════════════════════
  const dieselRows = monthly(rng, [
    S({ bu: 'PUN', desc: 'Diesel – DG set backup power', factor: 'diesel', unit: 'L', base: 6200, amp: 0.25 }),
    S({ bu: 'CHE', desc: 'Diesel – DG set backup power', factor: 'diesel', unit: 'L', base: 5200, amp: 0.25 }),
    S({
      bu: 'HOS',
      desc: 'Diesel – DG set backup power',
      factor: 'diesel',
      unit: 'L',
      base: 7800,
      amp: 0.2,
      review: 0.1,
    }),
    S({ bu: 'HQ', desc: 'Diesel – DG set backup power', factor: 'diesel', unit: 'L', base: 1800, amp: 0.3 }),
    S({ bu: 'MUM', desc: 'Diesel – DG set (warehouse)', factor: 'diesel', unit: 'L', base: 1400, amp: 0.3 }),
  ]);
  define(
    'Diesel — DG sets & backup power',
    'Diesel burned in generator sets at plants and offices during grid outages.',
    'S1_STATIONARY',
    'HQ',
    'diesel_dg_2026.xlsx',
    dieselRows,
  );
  define(
    'Natural gas — boilers & furnaces',
    'Piped natural gas used for steam boilers, heat-treatment and casting furnaces.',
    'S1_STATIONARY',
    'PUN',
    'natural_gas_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'PUN',
        desc: 'Natural gas – boiler (steam generation)',
        factor: 'natgas',
        unit: 'm3',
        base: 41000,
        amp: 0.12,
        trend: -0.06,
      }),
      S({
        bu: 'CHE',
        desc: 'Natural gas – heat treatment furnace',
        factor: 'natgas',
        unit: 'm3',
        base: 33000,
        amp: 0.1,
        trend: -0.04,
        review: 0.1,
      }),
      S({
        bu: 'HOS',
        desc: 'Natural gas – casting furnace',
        factor: 'natgas',
        unit: 'm3',
        base: 52000,
        amp: 0.1,
        trend: -0.05,
      }),
    ]),
  );
  define(
    'LPG — canteens & forklifts',
    'LPG cylinders for canteens and forklift trucks.',
    'S1_STATIONARY',
    'PUN',
    'lpg_2026.xlsx',
    monthly(rng, [
      S({ bu: 'PUN', desc: 'LPG – canteen & kitchen', factor: 'lpg_kg', unit: 'kg', base: 900, amp: 0.08 }),
      S({ bu: 'CHE', desc: 'LPG – canteen & kitchen', factor: 'lpg_kg', unit: 'kg', base: 760, amp: 0.08 }),
      S({ bu: 'HOS', desc: 'LPG – canteen & kitchen', factor: 'lpg_kg', unit: 'kg', base: 1100, amp: 0.08 }),
      S({ bu: 'HQ', desc: 'LPG – cafeteria', factor: 'lpg_kg', unit: 'kg', base: 340, amp: 0.1 }),
      S({ bu: 'MUM', desc: 'LPG – warehouse forklifts', factor: 'lpg_kg', unit: 'kg', base: 410, amp: 0.15 }),
      S({ bu: 'PUN', desc: 'LPG – forklifts', factor: 'lpg_kg', unit: 'kg', base: 1300, amp: 0.1 }),
      S({ bu: 'HOS', desc: 'LPG – forklifts', factor: 'lpg_kg', unit: 'kg', base: 1500, amp: 0.1 }),
    ]),
  );
  define(
    'Furnace oil & coal — process heating',
    'Heavy fuel oil and industrial coal used for process heat at the foundry and plants.',
    'S1_STATIONARY',
    'HOS',
    'process_heat_fuels_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'HOS',
        desc: 'Furnace oil – induction furnace backup',
        factor: 'furnace_oil',
        unit: 'L',
        base: 21000,
        amp: 0.15,
        trend: -0.1,
      }),
      S({
        bu: 'PUN',
        desc: 'Furnace oil – paint shop oven',
        factor: 'furnace_oil',
        unit: 'L',
        base: 14000,
        amp: 0.1,
        review: 0.1,
      }),
      S({
        bu: 'HOS',
        desc: 'Coal – industrial boiler',
        factor: 'coal',
        unit: 't',
        base: 85,
        amp: 0.12,
        trend: -0.15,
        decimals: 1,
      }),
      S({
        bu: 'CHE',
        desc: 'Coal – industrial boiler',
        factor: 'coal',
        unit: 't',
        base: 40,
        amp: 0.12,
        trend: -0.15,
        decimals: 1,
      }),
    ]),
  );
  define(
    'Company vehicles — fleet fuel',
    'Diesel and petrol for company-owned cars, shuttle buses and delivery trucks.',
    'S1_MOBILE',
    'HQ',
    'fleet_fuel_2026.xlsx',
    monthly(rng, [
      S({ bu: 'HQ', desc: 'Diesel – executive fleet', factor: 'diesel', unit: 'L', base: 3200 }),
      S({ bu: 'HQ', desc: 'Petrol – company cars', factor: 'petrol', unit: 'L', base: 1900 }),
      S({ bu: 'DEL', desc: 'Petrol – sales fleet', factor: 'petrol', unit: 'L', base: 1400 }),
      S({ bu: 'MUM', desc: 'Diesel – delivery vehicles', factor: 'diesel', unit: 'L', base: 4200, amp: 0.15 }),
      S({ bu: 'DXB', desc: 'Petrol – company cars', factor: 'petrol', unit: 'L', base: 900 }),
      S({ bu: 'PUN', desc: 'Diesel – plant shuttle buses', factor: 'diesel', unit: 'L', base: 2600 }),
      S({ bu: 'CHE', desc: 'Diesel – plant shuttle buses', factor: 'diesel', unit: 'L', base: 2400, review: 0.08 }),
    ]),
  );
  const refrig: Row[] = [];
  for (const bu of ['PUN', 'CHE', 'HOS', 'HQ', 'MUM', 'DXB']) {
    for (let k = 0; k < rng.int(3, 5); k++) {
      const gas = rng.pick([
        ['r410a', 'R-410A', 'HVAC split units'],
        ['r134a', 'R-134a', 'chiller'],
        ['r32', 'R-32', 'VRF system'],
        ['r404a', 'R-404A', 'cold room'],
      ] as const);
      const m = rng.pick(MONTHS);
      refrig.push({
        description: `Refrigerant top-up ${gas[1]} – ${gas[2]}`,
        location: CITY[bu]!,
        measure: Math.round(rng.between(3, 38) * 10) / 10,
        unit: 'kg',
        orgUnitId: ouId(bu),
        periodStart: `${m}-${String(rng.int(2, 24)).padStart(2, '0')}`,
        periodEnd: monthEnd(m),
        factorKey: gas[0],
      });
    }
  }
  refrig.forEach((r) => (r.periodEnd = r.periodStart));
  define(
    'Refrigerant top-ups — HVAC & chillers',
    'Refrigerant gas recharged after leaks, recorded from service reports.',
    'S1_FUGITIVE',
    'HQ',
    'refrigerant_service_log.xlsx',
    refrig,
  );
  define(
    'Process emissions — lime & casting',
    'CO₂ released by calcination and casting processes (not from fuel).',
    'S1_PROCESS',
    'HOS',
    'process_emissions_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'HOS',
        desc: 'Quicklime calcination – casting line',
        factor: 'lime',
        unit: 't',
        base: 130,
        amp: 0.1,
        decimals: 1,
      }),
      S({ bu: 'PUN', desc: 'Process CO2 – lime kiln', factor: 'lime', unit: 't', base: 70, amp: 0.1, decimals: 1 }),
    ]),
  );

  // ═════════════════════════ SCOPE 2 ═════════════════════════
  const elecIn = monthly(rng, [
    S({
      bu: 'HQ',
      desc: 'Grid electricity – head office',
      factor: 'elec_in',
      unit: 'kWh',
      base: 85000,
      amp: 0.12,
      trend: -0.04,
    }),
    S({
      bu: 'PUN',
      desc: 'Grid electricity – plant',
      factor: 'elec_in',
      unit: 'kWh',
      base: 420000,
      amp: 0.1,
      trend: -0.06,
    }),
    S({
      bu: 'CHE',
      desc: 'Grid electricity – plant',
      factor: 'elec_in',
      unit: 'kWh',
      base: 360000,
      amp: 0.1,
      trend: -0.05,
    }),
    S({
      bu: 'HOS',
      desc: 'Grid electricity – foundry',
      factor: 'elec_in',
      unit: 'kWh',
      base: 520000,
      amp: 0.1,
      trend: -0.07,
    }),
    S({ bu: 'MUM', desc: 'Grid electricity – warehouse', factor: 'elec_in', unit: 'kWh', base: 62000, amp: 0.1 }),
    S({ bu: 'DEL', desc: 'Grid electricity – sales office', factor: 'elec_in', unit: 'kWh', base: 24000, amp: 0.2 }),
    S({
      bu: 'PRD',
      desc: 'Grid electricity – R&D campus',
      factor: 'elec_in',
      unit: 'kWh',
      base: 118000,
      amp: 0.1,
      trend: 0.05,
    }),
  ]);
  define(
    'Grid electricity — India sites',
    'Monthly purchased electricity at all Indian sites (utility bills).',
    'S2_ELECTRICITY',
    'HQ',
    'electricity_india_2026.xlsx',
    elecIn,
  );
  define(
    'Grid electricity — overseas offices',
    'Purchased electricity at the Dubai, Singapore and Frankfurt offices.',
    'S2_ELECTRICITY',
    'DXB',
    'electricity_overseas_2026.xlsx',
    monthly(rng, [
      S({ bu: 'DXB', desc: 'Grid electricity – Dubai office', factor: 'elec_ae', unit: 'kWh', base: 38000, amp: 0.25 }),
      S({
        bu: 'SIN',
        desc: 'Grid electricity – Singapore branch',
        factor: 'elec_sg',
        unit: 'kWh',
        base: 21000,
        amp: 0.08,
      }),
      S({
        bu: 'FRA',
        desc: 'Grid electricity – Frankfurt branch',
        factor: 'elec_de',
        unit: 'kWh',
        base: 16500,
        amp: 0.15,
      }),
    ]),
  );
  define(
    'Purchased steam',
    'Process steam bought from an industrial park utility.',
    'S2_HEAT_STEAM',
    'HOS',
    'steam_2026.xlsx',
    monthly(rng, [
      S({ bu: 'HOS', desc: 'Purchased steam – process', factor: 'steam', unit: 'kWh', base: 260000, amp: 0.1 }),
      S({ bu: 'CHE', desc: 'Purchased steam – paint shop', factor: 'steam', unit: 'kWh', base: 140000, amp: 0.1 }),
    ]),
  );
  define(
    'District cooling',
    'Chilled water supplied to the Dubai and Singapore offices.',
    'S2_COOLING',
    'DXB',
    'district_cooling_2026.xlsx',
    monthly(rng, [
      S({ bu: 'DXB', desc: 'District cooling – chilled water', factor: 'cooling', unit: 'kWh', base: 52000, amp: 0.3 }),
      S({
        bu: 'SIN',
        desc: 'District cooling – chilled water',
        factor: 'cooling',
        unit: 'kWh',
        base: 30000,
        amp: 0.12,
      }),
    ]),
  );

  // ═════════════════════════ SCOPE 3 ═════════════════════════
  define(
    'Raw materials — steel, aluminium & copper',
    'Metals purchased for manufacturing (supplier invoices).',
    'S3_C1',
    'PUN',
    'raw_materials_metals.xlsx',
    monthly(rng, [
      S({ bu: 'PUN', desc: 'Steel coil (hot rolled)', factor: 'steel', unit: 't', base: 180, amp: 0.1, decimals: 1 }),
      S({ bu: 'CHE', desc: 'Steel sheet', factor: 'steel', unit: 't', base: 150, amp: 0.1, decimals: 1 }),
      S({ bu: 'HOS', desc: 'Steel bar stock', factor: 'steel', unit: 't', base: 210, amp: 0.1, decimals: 1 }),
      S({ bu: 'PUN', desc: 'Aluminium extrusions', factor: 'aluminium', unit: 't', base: 8, amp: 0.15, decimals: 1 }),
      S({ bu: 'CHE', desc: 'Aluminium sheet', factor: 'aluminium', unit: 't', base: 6, amp: 0.15, decimals: 1 }),
      S({ bu: 'HOS', desc: 'Aluminium ingots', factor: 'aluminium', unit: 't', base: 14, amp: 0.15, decimals: 1 }),
      S({ bu: 'HOS', desc: 'Copper wire', factor: 'copper', unit: 't', base: 5, amp: 0.2, decimals: 1 }),
    ]),
  );
  define(
    'Plastics, packaging, paper & water',
    'Resins, packaging materials, office paper and municipal water.',
    'S3_C1',
    'PUN',
    'plastics_packaging_water.xlsx',
    [
      ...monthly(rng, [
        S({ bu: 'PUN', desc: 'Polypropylene granules', factor: 'plastic', unit: 't', base: 28, decimals: 1 }),
        S({ bu: 'CHE', desc: 'Polypropylene granules', factor: 'plastic', unit: 't', base: 22, decimals: 1 }),
        S({ bu: 'HOS', desc: 'ABS resin', factor: 'plastic', unit: 't', base: 30, decimals: 1, review: 0.1 }),
        S({ bu: 'PUN', desc: 'Corrugated cardboard packaging', factor: 'cardboard', unit: 't', base: 18, decimals: 1 }),
        S({ bu: 'CHE', desc: 'Corrugated cardboard packaging', factor: 'cardboard', unit: 't', base: 14, decimals: 1 }),
        S({ bu: 'HOS', desc: 'Corrugated cardboard packaging', factor: 'cardboard', unit: 't', base: 20, decimals: 1 }),
        S({ bu: 'HQ', desc: 'Office paper (A4)', factor: 'paper', unit: 't', base: 0.9, decimals: 2 }),
        S({ bu: 'PUN', desc: 'Municipal water supply', factor: 'water_supply', unit: 'm3', base: 4200 }),
        S({ bu: 'CHE', desc: 'Municipal water supply', factor: 'water_supply', unit: 'm3', base: 3600 }),
        S({ bu: 'HOS', desc: 'Municipal water supply', factor: 'water_supply', unit: 'm3', base: 5100 }),
      ]),
    ],
  );
  const capital: Row[] = [];
  const cap = (
    bu: string,
    desc: string,
    measure: number,
    unit: string,
    month: string,
    factorKey: string | null,
    review = false,
  ) =>
    capital.push({
      description: desc,
      location: CITY[bu]!,
      measure,
      unit,
      orgUnitId: ouId(bu),
      periodStart: monthStart(month),
      periodEnd: monthEnd(month),
      factorKey,
      review,
    });
  cap('HQ', 'Laptops – new joiners', 24, 'unit', '2026-02', 'laptop');
  cap('HQ', 'Laptops – refresh cycle', 60, 'unit', '2026-05', 'laptop');
  cap('DEL', 'Laptops – sales team', 18, 'unit', '2026-07', 'laptop');
  cap('HQ', 'Servers – data room upgrade', 6, 'unit', '2026-04', 'server');
  cap('PRD', 'Servers – R&D compute cluster', 10, 'unit', '2026-06', 'server');
  cap('PRD', 'Industrial UPS system', 3, 'unit', '2026-08', 'server', true);
  cap('PUN', 'CNC machining centre (installed)', 18, 't', '2026-03', 'machinery');
  cap('HOS', 'Press line 400T (installed)', 40, 't', '2026-05', 'machinery');
  cap('CHE', 'Robotic welding cell', 11, 't', '2026-09', 'machinery');
  cap('PRD', 'Concrete – R&D lab extension', 120, 't', '2026-03', 'concrete');
  cap('PRD', 'Concrete – R&D lab extension (phase 2)', 95, 't', '2026-07', 'concrete');
  cap('HOS', 'Custom robotic welding cell (turnkey)', 1, 'unit', '2026-10', null);
  cap('MUM', 'Mezzanine racking system (supplier quote)', 1, 'unit', '2026-04', null);
  define(
    'Capital goods — machinery & IT',
    'Machinery, IT hardware and construction purchased during the year.',
    'S3_C2',
    'HQ',
    'capex_register_2026.xlsx',
    capital,
  );
  const wttDiesel = dieselRows.map((r) => ({
    ...r,
    description: `WTT – ${r.description}`,
    factorKey: 'wtt_diesel',
    review: false,
  }));
  const td = elecIn.map((r) => ({
    ...r,
    description: r.description.replace('Grid electricity', 'T&D losses – grid electricity'),
    factorKey: 'td_in',
    review: false,
  }));
  define(
    'Fuel- & energy-related activities',
    'Upstream fuel emissions (well-to-tank) and grid transmission & distribution losses.',
    'S3_C3',
    'HQ',
    'fuel_energy_related_2026.xlsx',
    [...td, ...wttDiesel],
  );
  define(
    'Upstream freight — inbound logistics',
    'Road, sea, air and rail freight for raw materials and spares.',
    'S3_C4',
    'PUN',
    'inbound_freight_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'PUN',
        desc: 'Road freight – raw material inbound (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 120000,
        amp: 0.1,
      }),
      S({
        bu: 'CHE',
        desc: 'Road freight – raw material inbound (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 95000,
        amp: 0.1,
      }),
      S({
        bu: 'HOS',
        desc: 'Road freight – raw material inbound (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 160000,
        amp: 0.1,
      }),
      S({
        bu: 'HOS',
        desc: 'Sea freight – imported aluminium (container)',
        factor: 'sea',
        unit: 'tonne.km',
        base: 1200000,
        amp: 0.15,
      }),
      S({
        bu: 'PUN',
        desc: 'Sea freight – imported components (container)',
        factor: 'sea',
        unit: 'tonne.km',
        base: 900000,
        amp: 0.15,
      }),
      S({
        bu: 'PUN',
        desc: 'Air freight – urgent spares',
        factor: 'air_freight',
        unit: 'tonne.km',
        base: 6000,
        amp: 0.5,
        noise: 0.3,
        review: 0.12,
      }),
      S({
        bu: 'HOS',
        desc: 'Rail freight – coal inbound',
        factor: 'rail_freight',
        unit: 'tonne.km',
        base: 80000,
        amp: 0.1,
        trend: -0.15,
      }),
    ]),
  );
  define(
    'Waste & wastewater — plants',
    'Waste to landfill, recycling, incineration and effluent treatment at the three plants.',
    'S3_C5',
    'PUN',
    'waste_register_2026.xlsx',
    [
      ...monthly(rng, [
        S({ bu: 'PUN', desc: 'General waste to landfill', factor: 'landfill', unit: 't', base: 14, decimals: 1 }),
        S({ bu: 'CHE', desc: 'General waste to landfill', factor: 'landfill', unit: 't', base: 11, decimals: 1 }),
        S({ bu: 'HOS', desc: 'General waste to landfill', factor: 'landfill', unit: 't', base: 17, decimals: 1 }),
        S({ bu: 'PUN', desc: 'Metal scrap – recycled', factor: 'recycle_metal', unit: 't', base: 38, decimals: 1 }),
        S({ bu: 'CHE', desc: 'Metal scrap – recycled', factor: 'recycle_metal', unit: 't', base: 30, decimals: 1 }),
        S({ bu: 'HOS', desc: 'Metal scrap – recycled', factor: 'recycle_metal', unit: 't', base: 55, decimals: 1 }),
        S({ bu: 'PUN', desc: 'Effluent – wastewater treatment', factor: 'wastewater', unit: 'm3', base: 2800 }),
        S({ bu: 'CHE', desc: 'Effluent – wastewater treatment', factor: 'wastewater', unit: 'm3', base: 2300 }),
        S({
          bu: 'HOS',
          desc: 'Effluent – wastewater treatment',
          factor: 'wastewater',
          unit: 'm3',
          base: 3400,
          review: 0.1,
        }),
        S({
          bu: 'HOS',
          desc: 'Hazardous waste – incineration',
          factor: 'incineration',
          unit: 't',
          base: 1.2,
          decimals: 2,
          months: ['2026-03', '2026-06', '2026-09'],
        }),
        S({
          bu: 'PUN',
          desc: 'Hazardous waste – incineration',
          factor: 'incineration',
          unit: 't',
          base: 0.8,
          decimals: 2,
          months: ['2026-03', '2026-06', '2026-09'],
        }),
      ]),
    ],
  );

  // business travel
  const ROUTES = [
    ['BLR → LHR', 8000, 'long_bus', 'Business'],
    ['BLR → DXB', 2700, 'short', 'Economy'],
    ['DXB → LHR', 5500, 'long_econ', 'Economy'],
    ['BLR → SIN', 3600, 'short', 'Economy'],
    ['SIN → SYD', 6300, 'long_econ', 'Economy'],
    ['FRA → DEL', 6100, 'long_econ', 'Economy'],
    ['DEL → BOM', 1150, 'dom', 'Economy'],
    ['BLR → DEL', 1740, 'dom', 'Economy'],
    ['FRA → LHR', 650, 'short', 'Economy'],
    ['DXB → FRA', 4800, 'long_econ', 'Economy'],
    ['BLR → FRA', 7000, 'long_bus', 'Business'],
    ['DEL → DXB', 2200, 'short', 'Economy'],
  ] as const;
  const flightFactor = (k: string) =>
    ({ dom: 'flight_dom', short: 'flight_short', long_econ: 'flight_long_econ', long_bus: 'flight_long_bus' })[k]!;
  const flights: Row[] = [];
  for (const [bu, n] of [
    ['HQ', 12],
    ['DEL', 8],
    ['DXB', 8],
    ['SIN', 7],
    ['FRA', 7],
    ['PUN', 3],
  ] as const) {
    for (let k = 0; k < n; k++) {
      const [route, dist, cls, label] = rng.pick(ROUTES);
      const pax = rng.int(1, 3);
      const start = `${rng.pick(MONTHS)}-${String(rng.int(2, 24)).padStart(2, '0')}`;
      flights.push({
        description: `Flight ${route} return (${label}${pax > 1 ? `, ${pax} pax` : ''})`,
        location: CITY[bu]!,
        measure: dist * 2 * pax,
        unit: 'passenger.km',
        orgUnitId: ouId(bu),
        periodStart: start,
        periodEnd: addDays(start, rng.int(2, 6)),
        factorKey: flightFactor(cls),
        review: rng.next() < 0.05,
      });
    }
  }
  flights.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  define(
    'Business travel — flights',
    'Flights booked through the corporate travel desk.',
    'S3_C6',
    'HQ',
    'travel_desk_flights_2026.xlsx',
    flights,
  );
  const ground: Row[] = [];
  const HOTELS = [
    ['Mumbai', 'IN', 'hotel_in'],
    ['Delhi', 'IN', 'hotel_in'],
    ['Dubai', 'AE', 'hotel_ae'],
    ['Singapore', 'SG', 'hotel_sg'],
    ['Frankfurt', 'DE', 'hotel_de'],
    ['London', 'GB', 'hotel_gb'],
  ] as const;
  for (let k = 0; k < 32; k++) {
    const [city, cc, fk] = rng.pick(HOTELS);
    const bu = rng.pick(['HQ', 'DEL', 'DXB', 'SIN', 'FRA'] as const);
    const start = `${rng.pick(MONTHS)}-${String(rng.int(2, 24)).padStart(2, '0')}`;
    const nights = rng.int(1, 6);
    ground.push({
      description: `Hotel stay – ${city}, ${cc}`,
      location: CITY[bu]!,
      measure: nights,
      unit: 'room.night',
      orgUnitId: ouId(bu),
      periodStart: start,
      periodEnd: addDays(start, nights),
      factorKey: fk,
    });
  }
  for (let k = 0; k < 10; k++) {
    const start = `${rng.pick(MONTHS)}-${String(rng.int(2, 24)).padStart(2, '0')}`;
    ground.push({
      description: rng.pick(['Rail – Pune ↔ Mumbai', 'Rail – Chennai ↔ Bengaluru', 'Rail – Frankfurt ↔ Cologne']),
      location: 'India',
      measure: rng.int(1, 4) * rng.pick([300, 280, 360]),
      unit: 'passenger.km',
      orgUnitId: ouId(rng.pick(['HQ', 'PUN', 'CHE', 'FRA'] as const)),
      periodStart: start,
      periodEnd: start,
      factorKey: 'rail',
    });
  }
  for (let k = 0; k < 14; k++) {
    const start = `${rng.pick(MONTHS)}-${String(rng.int(2, 26)).padStart(2, '0')}`;
    ground.push({
      description: 'Taxi – airport transfer',
      location: 'India',
      measure: rng.int(18, 64),
      unit: 'passenger.km',
      orgUnitId: ouId(rng.pick(['HQ', 'DEL', 'DXB', 'SIN'] as const)),
      periodStart: start,
      periodEnd: start,
      factorKey: 'taxi',
    });
  }
  ground.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  define(
    'Business travel — hotels & ground transport',
    'Hotel nights, rail journeys and taxis from expense claims.',
    'S3_C6',
    'HQ',
    'expense_claims_travel_2026.xlsx',
    ground,
  );
  define(
    'Employee commuting',
    'Estimated commuting distance from the annual employee transport survey.',
    'S3_C7',
    'HQ',
    'commuting_survey_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'HQ',
        desc: 'Employee commuting – cars (diesel)',
        factor: 'car_diesel',
        unit: 'km',
        base: 38000,
        amp: 0.05,
      }),
      S({
        bu: 'HQ',
        desc: 'Employee commuting – company bus',
        factor: 'bus',
        unit: 'passenger.km',
        base: 22000,
        amp: 0.05,
      }),
      S({
        bu: 'PUN',
        desc: 'Employee commuting – cars (petrol)',
        factor: 'car_petrol',
        unit: 'km',
        base: 52000,
        amp: 0.05,
      }),
      S({
        bu: 'PUN',
        desc: 'Employee commuting – two-wheelers',
        factor: 'motorbike',
        unit: 'km',
        base: 40000,
        amp: 0.05,
      }),
      S({
        bu: 'PUN',
        desc: 'Employee commuting – shuttle bus',
        factor: 'bus',
        unit: 'passenger.km',
        base: 95000,
        amp: 0.05,
      }),
      S({
        bu: 'CHE',
        desc: 'Employee commuting – cars (petrol)',
        factor: 'car_petrol',
        unit: 'km',
        base: 44000,
        amp: 0.05,
      }),
      S({
        bu: 'CHE',
        desc: 'Employee commuting – two-wheelers',
        factor: 'motorbike',
        unit: 'km',
        base: 36000,
        amp: 0.05,
      }),
      S({
        bu: 'HOS',
        desc: 'Employee commuting – cars (diesel)',
        factor: 'car_diesel',
        unit: 'km',
        base: 41000,
        amp: 0.05,
      }),
      S({
        bu: 'HOS',
        desc: 'Employee commuting – two-wheelers',
        factor: 'motorbike',
        unit: 'km',
        base: 52000,
        amp: 0.05,
      }),
      S({
        bu: 'MUM',
        desc: 'Employee commuting – cars (petrol)',
        factor: 'car_petrol',
        unit: 'km',
        base: 9000,
        amp: 0.05,
      }),
      S({
        bu: 'DEL',
        desc: 'Employee commuting – cars (petrol)',
        factor: 'car_petrol',
        unit: 'km',
        base: 6500,
        amp: 0.05,
      }),
      S({
        bu: 'DXB',
        desc: 'Employee commuting – cars (petrol)',
        factor: 'car_petrol',
        unit: 'km',
        base: 7500,
        amp: 0.05,
      }),
      S({
        bu: 'SIN',
        desc: 'Employee commuting – metro',
        factor: 'metro',
        unit: 'passenger.km',
        base: 5500,
        amp: 0.05,
      }),
      S({
        bu: 'FRA',
        desc: 'Employee commuting – cars (diesel)',
        factor: 'car_diesel',
        unit: 'km',
        base: 4800,
        amp: 0.05,
      }),
    ]),
  );
  define(
    'Downstream transport — customer deliveries',
    'Outbound road and sea shipments of finished goods.',
    'S3_C9',
    'MUM',
    'outbound_logistics_2026.xlsx',
    monthly(rng, [
      S({
        bu: 'PUN',
        desc: 'Road freight – finished goods to customers (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 90000,
        amp: 0.1,
      }),
      S({
        bu: 'CHE',
        desc: 'Road freight – finished goods to customers (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 75000,
        amp: 0.1,
      }),
      S({
        bu: 'HOS',
        desc: 'Road freight – castings to customers (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 110000,
        amp: 0.1,
      }),
      S({
        bu: 'MUM',
        desc: 'Road freight – last-mile distribution (HGV)',
        factor: 'hgv',
        unit: 'tonne.km',
        base: 60000,
        amp: 0.12,
      }),
      S({
        bu: 'HOS',
        desc: 'Sea freight – export shipments to Dubai',
        factor: 'sea',
        unit: 'tonne.km',
        base: 600000,
        amp: 0.2,
      }),
    ]),
  );
  const quarterRow = (bu: string, desc: string, measure: number, unit: string, q: number, factor: string): Row => ({
    description: desc,
    location: CITY[bu]!,
    measure,
    unit,
    orgUnitId: ouId(bu),
    periodStart: ['2026-01-01', '2026-04-01', '2026-07-01'][q]!,
    periodEnd: ['2026-03-31', '2026-06-30', '2026-09-30'][q]!,
    factorKey: factor,
  });
  define(
    'Use of sold products — in-use electricity',
    'Electricity consumed by sold motors and pumps over their use phase (estimated).',
    'S3_C11',
    'HQ',
    'use_phase_model_2026.xlsx',
    [0, 1, 2].flatMap((q) => [
      quarterRow(
        'HQ',
        'Product line A (industrial pumps) – in-use electricity',
        Math.round(2_400_000 * (1 + q * 0.04)),
        'kWh',
        q,
        'elec_in',
      ),
      quarterRow(
        'HQ',
        'Product line B (motors) – in-use electricity',
        Math.round(1_700_000 * (1 + q * 0.03)),
        'kWh',
        q,
        'elec_in',
      ),
      quarterRow(
        'HQ',
        'Product line C (compressors) – in-use electricity',
        Math.round(900_000 * (1 + q * 0.05)),
        'kWh',
        q,
        'elec_in',
      ),
    ]),
  );
  define(
    'End-of-life treatment of sold products',
    'Disposal of sold products at end of life (modelled).',
    'S3_C12',
    'HQ',
    'end_of_life_model_2026.xlsx',
    monthly(rng, [
      S({ bu: 'HQ', desc: 'Sold products – landfilled', factor: 'landfill', unit: 't', base: 22, decimals: 1 }),
      S({
        bu: 'HQ',
        desc: 'Sold products – metal recycled',
        factor: 'recycle_metal',
        unit: 't',
        base: 70,
        decimals: 1,
      }),
      S({
        bu: 'HQ',
        desc: 'Sold products – plastic incinerated',
        factor: 'incineration',
        unit: 't',
        base: 6,
        decimals: 1,
      }),
    ]),
  );
  // drafts (no emissions yet)
  define(
    'Leased vehicles (draft)',
    'Contract-hire cars — data imported, not yet published.',
    'S3_C8',
    'HQ',
    'leased_vehicles_draft.csv',
    monthly(rng, [
      S({ bu: 'HQ', desc: 'Leased cars – diesel', factor: 'diesel', unit: 'L', base: 900, months: MONTHS.slice(0, 6) }),
    ]),
    'draft',
  );
  define(
    'Purchased services — spend based (draft)',
    'Consulting, IT services and marketing spend. Upload the finance export to start.',
    'S3_C1',
    'HQ',
    'unused.csv',
    [],
    'draft',
  );

  // ── calculate every published definition ──
  const published = new Set(s.definitions.filter((d) => d.status === 'published').map((d) => d.id));
  for (const a of s.activities) if (published.has(a.definitionId)) s.calcs.set(a.id, calculate(s, a));

  // ── a few manual overrides with reasons ──
  const find = (definitionPrefix: string, descIncludes: string, nth = 0) =>
    s.activities.filter(
      (a) =>
        s.definitions.find((d) => d.id === a.definitionId)!.name.startsWith(definitionPrefix) &&
        a.description.includes(descIncludes),
    )[nth]!;
  applyOverride(s, find('Grid electricity — overseas', 'Dubai', 4), {
    type: 'custom_factor',
    value: 0.35,
    unit: 'kWh',
    citation: 'https://www.dewa.gov.ae/',
    reason: 'Supplier-published 2025 grid factor for DEWA (location-based).',
  });
  applyOverride(s, find('Raw materials', 'Steel bar stock', 2), {
    type: 'custom_factor',
    value: 1900,
    unit: 't',
    citation: 'EPD S-P-01234',
    reason: 'Supplier EPD (EN 15804): 1.9 tCO2e per tonne of recycled-content steel.',
  });
  applyOverride(s, find('Business travel — flights', 'Business', 1), {
    type: 'factor',
    factorId: factorByKey('flight_long_econ').id,
    reason: 'Ticket was booked in economy; class corrected from the invoice.',
  });
  applyOverride(s, find('Furnace oil', 'Coal', 3), {
    type: 'custom_result',
    value: 168000,
    reason: 'Weighbridge-based calculation supplied by the plant EHS team.',
  });

  // ── reports, team ──
  const mkReport = (
    n: number,
    ou: string,
    format: string,
    formatName: string,
    ps: string,
    pe: string,
    daysAgo: number,
  ): Report => ({
    id: `demo-report-${n}`,
    orgUnitId: ouId(ou),
    orgUnitName: s.orgUnits.find((u) => u.code === ou)!.name,
    format,
    formatName,
    periodStart: ps,
    periodEnd: pe,
    status: 'ready',
    error: null,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    generatedAt: new Date(Date.now() - daysAgo * 86_400_000 + 9_000).toISOString(),
  });
  s.reports = [
    mkReport(
      3,
      'DXB',
      'AE_CLIMATE_LAW',
      'UAE — Federal Decree-Law No. 11 of 2024 (Climate Change)',
      '2026-01-01',
      '2026-09-30',
      2,
    ),
    mkReport(
      2,
      'HQ',
      'US_GHGP',
      'United States — GHG Protocol corporate inventory (SEC-style)',
      '2026-01-01',
      '2026-06-30',
      9,
    ),
    mkReport(1, 'HQ', 'IN_BRSR', 'India — SEBI BRSR (Principle 6: Environment)', '2026-01-01', '2026-09-30', 16),
  ];
  const person = (n: number, name: string, email: string, status: User['status'], verified: boolean): User => ({
    id: `demo-user-${n}`,
    email,
    name,
    role: 'admin',
    status,
    emailVerified: verified,
    passwordIsTemporary: false,
    lastLoginAt: status === 'active' ? new Date(Date.now() - n * 3 * 3_600_000).toISOString() : null,
    createdAt: T0,
  });
  s.users = [
    user,
    person(2, 'Rahul Menon', 'rahul.menon@aurora-mfg.example', 'active', true),
    person(3, 'Ananya Iyer', 'ananya.iyer@aurora-mfg.example', 'active', true),
    person(4, 'Vikram Shah', 'vikram.shah@aurora-mfg.example', 'pending', false),
    person(5, 'Sara Khan', 'sara.khan@aurora-mfg.example', 'disabled', true),
  ];
  s.invitations = [
    {
      id: 'demo-inv-1',
      email: 'finance.lead@aurora-mfg.example',
      status: 'pending',
      expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: 'demo-inv-2',
      email: 'plant.ehs@aurora-mfg.example',
      status: 'pending',
      expiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    },
  ];
  nextId(s, 'init');
  return s;
}
