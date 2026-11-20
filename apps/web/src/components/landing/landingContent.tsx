import type { ReactNode } from 'react';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Why Carbon Glint', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

/** The product flow, in order. Every landing variant explains these same five stages. */
export const STEPS: { icon: ReactNode; short: string; title: string; text: string }[] = [
  {
    icon: <AccountTreeOutlined />,
    short: 'Organisation',
    title: 'Map your organisation',
    text: 'Add your business units once: HQ, regions, sites and plants.',
  },
  {
    icon: <UploadFileOutlined />,
    short: 'Upload',
    title: 'Upload activity data',
    text: 'Fuel, electricity, travel, purchases. Any CSV or Excel layout works.',
  },
  {
    icon: <AutoAwesomeOutlined />,
    short: 'AI mapping',
    title: 'Let AI map the columns',
    text: 'Gemini suggests which column is which. You confirm before anything is calculated.',
  },
  {
    icon: <ScienceOutlined />,
    short: 'Calculate',
    title: 'Match factors and calculate',
    text: 'AI picks among real factors; the maths is deterministic: quantity × conversion × factor.',
  },
  {
    icon: <DescriptionOutlined />,
    short: 'Report',
    title: 'Trace and report',
    text: 'Drill into any number, then export a country-format ESG report your auditors can follow.',
  },
];

export const STATS = [
  { value: '3', label: 'Scopes covered: 1, 2 and 3' },
  { value: '15', label: 'Scope 3 categories supported' },
  { value: '2,600+', label: 'DEFRA emission factors built in' },
  { value: '7', label: 'Country report formats' },
];

export const FAQ = [
  {
    q: 'Which emissions does Carbon Glint cover?',
    a: 'Scope 1 (direct), Scope 2 (purchased energy) and Scope 3 (value chain) emissions, organised by the GHG Protocol categories.',
  },
  {
    q: 'Where do the emission factors come from?',
    a: 'From public databases such as DEFRA, ADEME, US EPA, IPCC and national electricity grid factors. You can see exactly which factor was used for every calculation.',
  },
  {
    q: 'Do I need to reformat my spreadsheets?',
    a: 'No. Upload your existing CSV or Excel files and the AI suggests how each column maps to a GHG field. You confirm the mapping before anything is calculated.',
  },
  {
    q: 'Does the AI make up the numbers?',
    a: 'Never. AI only picks which real emission factor fits an activity. The calculation itself is deterministic, and you can override any pick with a recorded reason.',
  },
  {
    q: 'Which report formats can I export?',
    a: 'Country formats including BRSR (India), SB 253 (California), AASB S2 (Australia), SGX (Singapore), Saudi Tadawul and UAE, exported as PDF.',
  },
];

export const AUDIENCES = [
  {
    role: 'Sustainability lead',
    text: 'Upload once, see Scope 1, 2 and 3 roll up across every site, and spot the biggest emitters in a click.',
  },
  {
    role: 'Finance and compliance',
    text: 'Country-format reports for BRSR, SB 253, AASB S2 and more, built from numbers you can defend.',
  },
  {
    role: 'Auditors',
    text: 'Every tonne links to a source row, an emission factor and an audit trail of overrides.',
  },
  {
    role: 'Leadership',
    text: 'One dashboard and an AI assistant that answers questions about your own data, with sources.',
  },
];

export const SCOPES = [
  {
    n: 1,
    name: 'Scope 1',
    tag: 'Direct',
    text: 'Fuel burned in your boilers, generators and fleet.',
    example: 'Diesel · Chennai plant',
  },
  {
    n: 2,
    name: 'Scope 2',
    tag: 'Purchased energy',
    text: 'Electricity, steam and cooling you buy.',
    example: 'Grid electricity · HQ',
  },
  {
    n: 3,
    name: 'Scope 3',
    tag: 'Value chain',
    text: 'Travel, purchases, logistics and waste across 15 categories.',
    example: 'Business travel · Sales',
  },
];

export const REPORT_FORMATS = [
  {
    slug: 'brsr',
    code: 'BRSR',
    place: 'India · SEBI',
    title: 'Business Responsibility & Sustainability Report',
    section: 'Section C · Principle 6 · Environment',
  },
  {
    slug: 'nirf-naac',
    code: 'NIRF / NAAC',
    place: 'India · colleges',
    title: 'NIRF / NAAC Environmental Annex',
    section: 'Campus carbon footprint',
  },
  {
    slug: 'sb-253',
    code: 'SB 253',
    place: 'USA · California',
    title: 'Climate Corporate Data Accountability Act',
    section: 'GHG Protocol · Scopes 1, 2 and 3',
  },
  {
    slug: 'aasb-s2',
    code: 'AASB S2',
    place: 'Australia',
    title: 'Climate-related Disclosures',
    section: 'Metrics and targets · GHG emissions',
  },
  {
    slug: 'sgx',
    code: 'SGX',
    place: 'Singapore · IFRS S2',
    title: 'Sustainability Report',
    section: 'Climate · Cross-industry metrics',
  },
  {
    slug: 'tadawul',
    code: 'Tadawul',
    place: 'Saudi Arabia',
    title: 'Tadawul ESG Disclosure',
    section: 'Environment · Emissions',
  },
  {
    slug: 'uae',
    code: 'UAE',
    place: 'Climate law',
    title: 'UAE Climate Law Emissions Report',
    section: 'Corporate emissions reporting',
  },
];

/**
 * Standards and factor libraries shown as badges. Drop the official logo files into `public/logos/` and set `logo`
 * (e.g. `logo: '/logos/defra.svg'`) to show them instead of the monogram.
 */
export const STANDARD_BADGES: { name: string; mark: string; caption: string; logo?: string }[] = [
  { name: 'GHG Protocol', mark: 'GHG', caption: 'WRI · WBCSD standard' },
  { name: 'BRSR', mark: 'BR', caption: 'SEBI · India' },
  { name: 'SB 253', mark: 'SB', caption: 'California' },
  { name: 'AASB S2', mark: 'S2', caption: 'Australia' },
  { name: 'SGX', mark: 'SGX', caption: 'Singapore Exchange' },
  { name: 'UAE', mark: 'UAE', caption: 'Climate law' },
  { name: 'DEFRA', mark: 'DF', caption: 'UK factor library' },
  { name: 'ADEME', mark: 'AD', caption: 'France factor library' },
  { name: 'US EPA', mark: 'EPA', caption: 'USA factor library' },
  { name: 'IPCC', mark: 'IP', caption: 'UN climate science' },
];
