import type { ReportData } from './report-data.js';

export interface DisclosureRow {
  ref: string;
  item: string;
  value: string;
}

export interface ReportFormatDef {
  code: string;
  name: string;
  region: string;
  framework: string;
  description: string;
  /** Framework-specific disclosure table built from the computed report data. */
  disclosures(d: ReportData): DisclosureRow[];
  notes: string[];
}

const t = (kg: number) => `${(kg / 1000).toLocaleString('en', { maximumFractionDigits: 2 })} tCO2e`;
const gj = (v: number) => `${v.toLocaleString('en', { maximumFractionDigits: 1 })} GJ`;
const scope3Rows = (d: ReportData, prefix: string): DisclosureRow[] =>
  d.scope3ByCategory.length
    ? d.scope3ByCategory.map((c) => ({ ref: prefix, item: `Scope 3 — ${c.name}`, value: t(c.co2eKg) }))
    : [{ ref: prefix, item: 'Scope 3 emissions', value: 'Not reported for this period' }];
const common = (d: ReportData) => ({
  s1: t(d.totals['1']),
  s2: t(d.totals['2']),
  s3: t(d.totals['3']),
  s12: t(d.totals['1'] + d.totals['2']),
  total: t(d.totals.total),
  energy: gj(d.energyGj),
});

export const REPORT_FORMATS: ReportFormatDef[] = [
  {
    code: 'IN_BRSR',
    name: 'India — SEBI BRSR (Principle 6: Environment)',
    region: 'India',
    framework: 'SEBI Business Responsibility and Sustainability Report (BRSR / BRSR Core)',
    description: 'Energy and GHG emission disclosures under Principle 6 of the BRSR format for listed companies.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'P6 · Energy', item: 'Total energy consumption (from activity data in energy units)', value: c.energy },
        { ref: 'P6 · GHG', item: 'Total Scope 1 emissions', value: c.s1 },
        { ref: 'P6 · GHG', item: 'Total Scope 2 emissions (location-based)', value: c.s2 },
        { ref: 'P6 · GHG', item: 'Total Scope 1 + Scope 2 emissions', value: c.s12 },
        {
          ref: 'P6 · Intensity',
          item: 'Scope 1 + 2 per business unit in boundary',
          value: d.businessUnitCount ? t((d.totals['1'] + d.totals['2']) / d.businessUnitCount) : '—',
        },
        ...scope3Rows(d, 'P6 · Leadership'),
      ];
    },
    notes: [
      'Indicator references follow the BRSR Principle 6 structure; verify against the SEBI format in force for the reporting year.',
    ],
  },
  {
    code: 'IN_NIRF',
    name: 'India — Colleges: NIRF / NAAC sustainability annex',
    region: 'India (higher education)',
    framework: 'Sustainability annex for NIRF submissions / NAAC Criterion 7 (environmental consciousness)',
    description: 'Campus carbon footprint annex for higher-education institutions.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'Campus · Energy', item: 'Energy consumed on campus', value: c.energy },
        {
          ref: 'Campus · GHG',
          item: 'Direct emissions (Scope 1: DG sets, boilers, vehicles, refrigerants)',
          value: c.s1,
        },
        { ref: 'Campus · GHG', item: 'Purchased electricity (Scope 2)', value: c.s2 },
        {
          ref: 'Campus · GHG',
          item: 'Indirect value-chain emissions (Scope 3: commuting, travel, waste…)',
          value: c.s3,
        },
        { ref: 'Campus · GHG', item: 'Total campus carbon footprint', value: c.total },
        ...d.byOrgUnit.slice(0, 15).map((u) => ({ ref: 'Campus · Units', item: u.name, value: t(u.co2eKg) })),
      ];
    },
    notes: [
      'NIRF has no standard GHG template; this annex follows NAAC Criterion 7 themes. Confirm the exact format required by your institution.',
    ],
  },
  {
    code: 'US_GHGP',
    name: 'United States — GHG Protocol inventory (California SB 253 aligned)',
    region: 'United States',
    framework: 'GHG Protocol Corporate Standard; California Climate Corporate Data Accountability Act (SB 253)',
    description: 'Corporate GHG inventory with Scope 1, 2 and 3 as required by SB 253.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'SB 253 · Scope 1', item: 'Direct GHG emissions', value: c.s1 },
        { ref: 'SB 253 · Scope 2', item: 'Indirect emissions from purchased energy (location-based)', value: c.s2 },
        ...scope3Rows(d, 'SB 253 · Scope 3'),
        { ref: 'Inventory', item: 'Total gross emissions', value: c.total },
        ...d.byOrgUnit.slice(0, 20).map((u) => ({ ref: 'Facility', item: u.name, value: t(u.co2eKg) })),
      ];
    },
    notes: [
      'Prepared per the GHG Protocol Corporate Standard. SB 253 requires third-party assurance — this report is not assured.',
    ],
  },
  {
    code: 'AE_CLIMATE_LAW',
    name: 'UAE — Climate law GHG report (Federal Decree-Law No. 11 of 2024)',
    region: 'United Arab Emirates',
    framework: 'UAE Federal Decree-Law No. 11 of 2024 on the Reduction of Climate Change Effects',
    description: 'GHG emissions measurement and reporting for entities in scope of the UAE climate law.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'GHG · Scope 1', item: 'Direct emissions', value: c.s1 },
        { ref: 'GHG · Scope 2', item: 'Indirect emissions from purchased energy', value: c.s2 },
        ...scope3Rows(d, 'GHG · Scope 3'),
        { ref: 'Energy', item: 'Energy consumption', value: c.energy },
        { ref: 'Total', item: 'Total GHG emissions', value: c.total },
      ];
    },
    notes: ['Check the implementing regulations and MOCCAE reporting templates for your sector and reporting year.'],
  },
  {
    code: 'SA_TADAWUL',
    name: 'Saudi Arabia — Saudi Exchange (Tadawul) ESG disclosure',
    region: 'Saudi Arabia',
    framework: 'Saudi Exchange ESG Disclosure Guidelines (environmental metrics)',
    description: 'Environmental metrics — GHG emissions, emissions intensity and energy usage.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'Env · GHG', item: 'Scope 1 emissions', value: c.s1 },
        { ref: 'Env · GHG', item: 'Scope 2 emissions', value: c.s2 },
        { ref: 'Env · GHG', item: 'Scope 3 emissions', value: c.s3 },
        {
          ref: 'Env · Intensity',
          item: 'Total emissions per business unit',
          value: d.businessUnitCount ? t(d.totals.total / d.businessUnitCount) : '—',
        },
        { ref: 'Env · Energy', item: 'Total energy usage', value: c.energy },
      ];
    },
    notes: ['Metric names follow the Saudi Exchange ESG guidelines; map to the guideline version you report against.'],
  },
  {
    code: 'AU_AASB_S2',
    name: 'Australia — AASB S2 climate disclosures (GHG) + NGER-style facility table',
    region: 'Australia',
    framework: 'AASB S2 Climate-related Disclosures; National Greenhouse and Energy Reporting (NGER) scheme',
    description: 'Absolute gross Scope 1, 2 and 3 emissions with a facility breakdown.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'AASB S2 · GHG', item: 'Absolute gross Scope 1 emissions', value: c.s1 },
        { ref: 'AASB S2 · GHG', item: 'Absolute gross Scope 2 emissions (location-based)', value: c.s2 },
        ...scope3Rows(d, 'AASB S2 · Scope 3'),
        { ref: 'NGER · Energy', item: 'Energy consumed', value: c.energy },
        ...d.byOrgUnit.slice(0, 20).map((u) => ({ ref: 'NGER · Facility', item: u.name, value: t(u.co2eKg) })),
      ];
    },
    notes: [
      'AASB S2 phases in Scope 3 for later reporting periods; NGER uses Australian NGA factors — load them via the CSV importer.',
    ],
  },
  {
    code: 'SG_SGX',
    name: 'Singapore — SGX climate reporting (IFRS S2 aligned)',
    region: 'Singapore',
    framework: 'SGX-ST climate reporting rules, based on ISSB IFRS S2',
    description: 'Scope 1 and 2 (and Scope 3 where required) aligned with IFRS S2.',
    disclosures: (d) => {
      const c = common(d);
      return [
        { ref: 'IFRS S2 · GHG', item: 'Scope 1 emissions', value: c.s1 },
        { ref: 'IFRS S2 · GHG', item: 'Scope 2 emissions (location-based)', value: c.s2 },
        ...scope3Rows(d, 'IFRS S2 · Scope 3'),
        { ref: 'Total', item: 'Total GHG emissions', value: c.total },
      ];
    },
    notes: ['Singapore grid electricity should use the EMA grid emission factor — load it via the CSV importer.'],
  },
];

export const findFormat = (code: string) => REPORT_FORMATS.find((f) => f.code === code);
