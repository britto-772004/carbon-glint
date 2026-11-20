/**
 * Example ("mock") data per industry, used by the guided tour so people can see — and copy — realistic
 * inputs at every step: onboarding answers, a business-unit tree, Activity Definitions with sample rows,
 * and the report format to pick. Pure data + pure helpers (no React, no SDK).
 */

export interface ExampleOrgUnit {
  name: string;
  code: string;
  type: 'hq' | 'branch' | 'plant' | 'office' | 'warehouse' | 'campus' | 'store' | 'other';
  country: string;
  city: string;
  parent?: string;
}

export interface ExampleRow {
  description: string;
  orgUnit: string;
  location: string;
  measure: number;
  unit: string;
}

export interface ExampleDefinition {
  name: string;
  scope: 1 | 2 | 3;
  /** GHG category code (matches the seeded taxonomy, e.g. S2_ELECTRICITY). */
  categoryCode: string;
  categoryName: string;
  rows: ExampleRow[];
}

export interface IndustryExample {
  industryCode: string;
  industryName: string;
  company: string;
  website: string;
  linkedinUrl: string;
  employeeBand: string;
  orgUnits: ExampleOrgUnit[];
  definitions: ExampleDefinition[];
  reportFormat: string;
  assistantQuestion: string;
}

const CAT: Record<string, string> = {
  S1_STATIONARY: 'Stationary combustion',
  S1_MOBILE: 'Mobile combustion',
  S1_PROCESS: 'Process emissions',
  S1_FUGITIVE: 'Fugitive emissions',
  S2_ELECTRICITY: 'Purchased electricity',
  S2_HEAT_STEAM: 'Purchased heat & steam',
  S2_COOLING: 'Purchased cooling',
  S3_C1: '1. Purchased goods & services',
  S3_C3: '3. Fuel- & energy-related activities',
  S3_C4: '4. Upstream transportation & distribution',
  S3_C5: '5. Waste generated in operations',
  S3_C6: '6. Business travel',
  S3_C7: '7. Employee commuting',
  S3_C9: '9. Downstream transportation & distribution',
};

const def = (name: string, scope: 1 | 2 | 3, categoryCode: string, rows: ExampleRow[]): ExampleDefinition => ({
  name,
  scope,
  categoryCode,
  categoryName: CAT[categoryCode] ?? categoryCode,
  rows,
});
const row = (description: string, orgUnit: string, location: string, measure: number, unit: string): ExampleRow => ({
  description,
  orgUnit,
  location,
  measure,
  unit,
});
const hq = (name: string, city: string, country = 'IN'): ExampleOrgUnit => ({
  name,
  code: 'HQ',
  type: 'hq',
  country,
  city,
});
const unit = (
  name: string,
  code: string,
  type: ExampleOrgUnit['type'],
  city: string,
  country = 'IN',
): ExampleOrgUnit => ({ name, code, type, country, city, parent: 'HQ' });

export const INDUSTRY_EXAMPLES: IndustryExample[] = [
  {
    industryCode: 'it_software',
    industryName: 'IT & software services',
    company: 'Softworth Solutions',
    website: 'https://softworth.example',
    linkedinUrl: 'https://www.linkedin.com/company/softworth',
    employeeBand: '251-1000',
    orgUnits: [
      hq('Softworth HQ', 'Bengaluru'),
      unit('Chennai Delivery Centre', 'CHN', 'office', 'Chennai'),
      unit('Pune Development Centre', 'PUN', 'office', 'Pune'),
      unit('Dubai Sales Office', 'DXB', 'office', 'Dubai', 'AE'),
    ],
    definitions: [
      def('Office electricity FY26', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – office floors', 'HQ', 'Bengaluru, IN', 48200, 'kWh'),
        row('Grid electricity – server room', 'CHN', 'Chennai, IN', 21600, 'kWh'),
        row('Grid electricity – office', 'PUN', 'Pune, IN', 18900, 'kWh'),
      ]),
      def('DG sets & refrigerants', 1, 'S1_STATIONARY', [
        row('Diesel – DG set backup power', 'HQ', 'Bengaluru, IN', 1450, 'L'),
        row('Diesel – DG set backup power', 'CHN', 'Chennai, IN', 980, 'L'),
      ]),
      def('Business travel Q1', 3, 'S3_C6', [
        row('Flight – economy BLR→DXB return', 'HQ', 'Bengaluru–Dubai', 12400, 'passenger.km'),
        row('Hotel stay – Dubai', 'DXB', 'Dubai, AE', 18, 'room.night'),
        row('Taxi – client visits', 'PUN', 'Pune, IN', 2300, 'km'),
      ]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Which office has the highest Scope 2 emissions per quarter?',
  },
  {
    industryCode: 'manufacturing',
    industryName: 'Manufacturing',
    company: 'GK Plastics',
    website: 'https://gkplastics.example',
    linkedinUrl: 'https://www.linkedin.com/company/gk-plastics',
    employeeBand: '251-1000',
    orgUnits: [
      hq('GK Plastics HQ', 'Coimbatore'),
      unit('Moulding Plant 1', 'PL1', 'plant', 'Coimbatore'),
      unit('Moulding Plant 2', 'PL2', 'plant', 'Hosur'),
      unit('Central Warehouse', 'WH1', 'warehouse', 'Salem'),
    ],
    definitions: [
      def('Plant electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – injection moulding', 'PL1', 'Coimbatore, IN', 312000, 'kWh'),
        row('Grid electricity – extrusion line', 'PL2', 'Hosur, IN', 254000, 'kWh'),
      ]),
      def('Boilers & forklifts', 1, 'S1_STATIONARY', [
        row('Natural gas – process boiler', 'PL1', 'Coimbatore, IN', 42000, 'm3'),
        row('LPG – forklifts', 'WH1', 'Salem, IN', 3200, 'kg'),
        row('Diesel – DG set', 'PL2', 'Hosur, IN', 5400, 'L'),
      ]),
      def('Raw material freight', 3, 'S3_C4', [
        row('Road freight – HGV diesel, polymer resin', 'PL1', 'Chennai port–Coimbatore', 185000, 'tonne.km'),
        row('Road freight – HGV diesel, finished goods', 'WH1', 'Salem–Bengaluru', 96000, 'tonne.km'),
      ]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Show me monthly emissions per plant as a chart.',
  },
  {
    industryCode: 'oil_gas',
    industryName: 'Oil & gas',
    company: 'Deltaflow Energy',
    website: 'https://deltaflow.example',
    linkedinUrl: 'https://www.linkedin.com/company/deltaflow-energy',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Deltaflow HQ', 'Abu Dhabi', 'AE'),
      unit('Onshore Field A', 'FLA', 'plant', 'Ruwais', 'AE'),
      unit('Gas Processing Plant', 'GPP', 'plant', 'Habshan', 'AE'),
    ],
    definitions: [
      def('Flaring & combustion', 1, 'S1_STATIONARY', [
        row('Natural gas – turbine fuel', 'GPP', 'Habshan, AE', 1850000, 'm3'),
        row('Diesel – drilling rig generators', 'FLA', 'Ruwais, AE', 64000, 'L'),
      ]),
      def('Imported power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – compressor station', 'GPP', 'Habshan, AE', 920000, 'kWh'),
      ]),
      def('Product shipping', 3, 'S3_C9', [
        row('Sea freight – tanker, crude', 'FLA', 'Ruwais–Singapore', 5400000, 'tonne.km'),
      ]),
    ],
    reportFormat: 'UAE — Climate law GHG report',
    assistantQuestion: 'What share of our footprint is Scope 1?',
  },
  {
    industryCode: 'power_utilities',
    industryName: 'Power & utilities',
    company: 'Brightgrid Power',
    website: 'https://brightgrid.example',
    linkedinUrl: 'https://www.linkedin.com/company/brightgrid',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Brightgrid HQ', 'Mumbai'),
      unit('Thermal Station', 'TPS', 'plant', 'Nagpur'),
      unit('Solar Park', 'SOL', 'plant', 'Jodhpur'),
    ],
    definitions: [
      def('Generation fuel', 1, 'S1_STATIONARY', [
        row('Coal – power station boiler', 'TPS', 'Nagpur, IN', 42000, 't'),
        row('Diesel – start-up fuel', 'TPS', 'Nagpur, IN', 18000, 'L'),
      ]),
      def('Auxiliary power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – substation', 'SOL', 'Jodhpur, IN', 64000, 'kWh'),
      ]),
      def('Fuel supply chain', 3, 'S3_C3', [row('Rail freight – coal', 'TPS', 'Korba–Nagpur', 9100000, 'tonne.km')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'How much did coal contribute last quarter?',
  },
  {
    industryCode: 'mining_metals',
    industryName: 'Mining & metals',
    company: 'Redstone Minerals',
    website: 'https://redstone.example',
    linkedinUrl: 'https://www.linkedin.com/company/redstone-minerals',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Redstone HQ', 'Perth', 'AU'),
      unit('Pilbara Mine', 'PIL', 'plant', 'Port Hedland', 'AU'),
      unit('Smelter', 'SME', 'plant', 'Kwinana', 'AU'),
    ],
    definitions: [
      def('Haul trucks & generators', 1, 'S1_MOBILE', [
        row('Diesel – haul trucks', 'PIL', 'Port Hedland, AU', 820000, 'L'),
        row('Diesel – site generators', 'PIL', 'Port Hedland, AU', 140000, 'L'),
      ]),
      def('Smelter electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – smelter', 'SME', 'Kwinana, AU', 3100000, 'kWh'),
      ]),
      def('Ore haulage', 3, 'S3_C4', [
        row('Rail freight – iron ore', 'PIL', 'Pilbara–Port Hedland', 26000000, 'tonne.km'),
      ]),
    ],
    reportFormat: 'Australia — AASB S2',
    assistantQuestion: 'Compare Scope 1 between the mine and the smelter.',
  },
  {
    industryCode: 'chemicals',
    industryName: 'Chemicals',
    company: 'Nuvochem Industries',
    website: 'https://nuvochem.example',
    linkedinUrl: 'https://www.linkedin.com/company/nuvochem',
    employeeBand: '251-1000',
    orgUnits: [
      hq('Nuvochem HQ', 'Vadodara'),
      unit('Dahej Plant', 'DAH', 'plant', 'Dahej'),
      unit('R&D Lab', 'LAB', 'office', 'Vadodara'),
    ],
    definitions: [
      def('Process heat', 1, 'S1_STATIONARY', [
        row('Natural gas – reactor heating', 'DAH', 'Dahej, IN', 260000, 'm3'),
        row('Fuel oil – thermic fluid heater', 'DAH', 'Dahej, IN', 48000, 'L'),
      ]),
      def('Purchased steam & power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – plant', 'DAH', 'Dahej, IN', 540000, 'kWh'),
      ]),
      def('Waste disposal', 3, 'S3_C5', [row('Hazardous waste – incineration', 'DAH', 'Dahej, IN', 86, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Which plant consumes the most natural gas?',
  },
  {
    industryCode: 'construction_real_estate',
    industryName: 'Construction & real estate',
    company: 'Skyline Builders',
    website: 'https://skyline.example',
    linkedinUrl: 'https://www.linkedin.com/company/skyline-builders',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Skyline HQ', 'Dubai', 'AE'),
      unit('Marina Tower Site', 'MTS', 'branch', 'Dubai', 'AE'),
      unit('Riyadh Mall Site', 'RMS', 'branch', 'Riyadh', 'SA'),
    ],
    definitions: [
      def('Site plant & machinery', 1, 'S1_MOBILE', [
        row('Diesel – excavators and cranes', 'MTS', 'Dubai, AE', 46000, 'L'),
        row('Diesel – site generators', 'RMS', 'Riyadh, SA', 38000, 'L'),
      ]),
      def('Site offices power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – site cabins', 'MTS', 'Dubai, AE', 72000, 'kWh'),
      ]),
      def('Construction materials', 3, 'S3_C1', [
        row('Concrete – ready mix', 'MTS', 'Dubai, AE', 5400, 't'),
        row('Steel – rebar', 'RMS', 'Riyadh, SA', 820, 't'),
      ]),
    ],
    reportFormat: 'Saudi Arabia — Tadawul ESG',
    assistantQuestion: 'What are our biggest Scope 3 sources?',
  },
  {
    industryCode: 'transport_logistics',
    industryName: 'Transportation & logistics',
    company: 'Swiftmove Logistics',
    website: 'https://swiftmove.example',
    linkedinUrl: 'https://www.linkedin.com/company/swiftmove',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Swiftmove HQ', 'Singapore', 'SG'),
      unit('Jurong Hub', 'JUR', 'warehouse', 'Singapore', 'SG'),
      unit('Johor Depot', 'JHB', 'warehouse', 'Johor Bahru', 'MY'),
    ],
    definitions: [
      def('Fleet fuel', 1, 'S1_MOBILE', [
        row('Diesel – HGV fleet', 'JUR', 'Singapore, SG', 410000, 'L'),
        row('Diesel – vans last mile', 'JHB', 'Johor Bahru, MY', 92000, 'L'),
      ]),
      def('Warehouse electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – cold storage', 'JUR', 'Singapore, SG', 680000, 'kWh'),
      ]),
      def('Subcontracted freight', 3, 'S3_C4', [
        row('Sea freight – container ship', 'JUR', 'Singapore–Chennai', 3200000, 'tonne.km'),
      ]),
    ],
    reportFormat: 'Singapore — SGX climate reporting',
    assistantQuestion: 'What is our fuel use trend month by month?',
  },
  {
    industryCode: 'retail_ecommerce',
    industryName: 'Retail & e-commerce',
    company: 'Cartly Retail',
    website: 'https://cartly.example',
    linkedinUrl: 'https://www.linkedin.com/company/cartly',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Cartly HQ', 'Gurugram'),
      unit('Delhi Fulfilment Centre', 'DFC', 'warehouse', 'Delhi'),
      unit('Mumbai Stores', 'MUM', 'branch', 'Mumbai'),
    ],
    definitions: [
      def('Store & FC electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – fulfilment centre', 'DFC', 'Delhi, IN', 390000, 'kWh'),
        row('Grid electricity – stores', 'MUM', 'Mumbai, IN', 210000, 'kWh'),
      ]),
      def('Refrigerants', 1, 'S1_FUGITIVE', [row('R-410A refrigerant top-up – HVAC', 'MUM', 'Mumbai, IN', 42, 'kg')]),
      def('Last-mile delivery', 3, 'S3_C9', [
        row('Road freight – van, parcels', 'DFC', 'Delhi NCR', 640000, 'tonne.km'),
      ]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'How much do deliveries add to our footprint?',
  },
  {
    industryCode: 'food_agriculture',
    industryName: 'Food & agriculture',
    company: 'Greenfield Foods',
    website: 'https://greenfield.example',
    linkedinUrl: 'https://www.linkedin.com/company/greenfield-foods',
    employeeBand: '251-1000',
    orgUnits: [
      hq('Greenfield HQ', 'Nashik'),
      unit('Processing Plant', 'PRC', 'plant', 'Nashik'),
      unit('Cold Store', 'CLD', 'warehouse', 'Pune'),
    ],
    definitions: [
      def('Boilers & dryers', 1, 'S1_STATIONARY', [
        row('LPG – dryers', 'PRC', 'Nashik, IN', 21000, 'kg'),
        row('Diesel – DG set', 'CLD', 'Pune, IN', 6400, 'L'),
      ]),
      def('Cold chain electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – cold storage', 'CLD', 'Pune, IN', 280000, 'kWh'),
      ]),
      def('Packaging', 3, 'S3_C1', [row('Plastic packaging – average', 'PRC', 'Nashik, IN', 64, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Which site uses the most electricity?',
  },
  {
    industryCode: 'hospitality_tourism',
    industryName: 'Hospitality & tourism',
    company: 'Azure Bay Hotels',
    website: 'https://azurebay.example',
    linkedinUrl: 'https://www.linkedin.com/company/azure-bay-hotels',
    employeeBand: '251-1000',
    orgUnits: [
      hq('Azure Bay HQ', 'Goa'),
      unit('Goa Resort', 'GOA', 'branch', 'Goa'),
      unit('Kochi Hotel', 'KOC', 'branch', 'Kochi'),
    ],
    definitions: [
      def('Hotel electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – resort', 'GOA', 'Goa, IN', 460000, 'kWh'),
        row('Grid electricity – hotel', 'KOC', 'Kochi, IN', 310000, 'kWh'),
      ]),
      def('Kitchens & laundry', 1, 'S1_STATIONARY', [row('LPG – kitchens', 'GOA', 'Goa, IN', 18000, 'kg')]),
      def('Waste', 3, 'S3_C5', [row('Food waste – composting', 'KOC', 'Kochi, IN', 42, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'What are emissions per property?',
  },
  {
    industryCode: 'healthcare_pharma',
    industryName: 'Healthcare & pharma',
    company: 'Medisure Pharma',
    website: 'https://medisure.example',
    linkedinUrl: 'https://www.linkedin.com/company/medisure',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Medisure HQ', 'Hyderabad'),
      unit('API Plant', 'API', 'plant', 'Hyderabad'),
      unit('Formulation Plant', 'FRM', 'plant', 'Baddi'),
    ],
    definitions: [
      def('Plant power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – clean rooms', 'API', 'Hyderabad, IN', 720000, 'kWh'),
        row('Grid electricity – formulation', 'FRM', 'Baddi, IN', 410000, 'kWh'),
      ]),
      def('Boilers', 1, 'S1_STATIONARY', [row('Natural gas – steam boiler', 'API', 'Hyderabad, IN', 88000, 'm3')]),
      def('Business travel', 3, 'S3_C6', [
        row('Flight – domestic economy', 'HQ', 'Hyderabad–Delhi', 64000, 'passenger.km'),
      ]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Show Scope 2 by plant by month.',
  },
  {
    industryCode: 'financial_services',
    industryName: 'Financial services',
    company: 'Northstar Capital',
    website: 'https://northstar.example',
    linkedinUrl: 'https://www.linkedin.com/company/northstar-capital',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Northstar HQ', 'New York', 'US'),
      unit('London Office', 'LON', 'office', 'London', 'GB'),
      unit('Mumbai Office', 'BOM', 'office', 'Mumbai'),
    ],
    definitions: [
      def('Office electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – office', 'HQ', 'New York, US', 380000, 'kWh'),
        row('Grid electricity – office', 'LON', 'London, GB', 160000, 'kWh'),
      ]),
      def('Backup generators', 1, 'S1_STATIONARY', [row('Diesel – backup generator', 'BOM', 'Mumbai, IN', 2200, 'L')]),
      def('Business travel', 3, 'S3_C6', [
        row('Flight – long haul business class', 'HQ', 'New York–London', 280000, 'passenger.km'),
        row('Hotel stay – London', 'LON', 'London, GB', 120, 'room.night'),
      ]),
    ],
    reportFormat: 'United States — GHG Protocol',
    assistantQuestion: 'How much of our footprint is business travel?',
  },
  {
    industryCode: 'telecom',
    industryName: 'Telecommunications',
    company: 'Wavelink Telecom',
    website: 'https://wavelink.example',
    linkedinUrl: 'https://www.linkedin.com/company/wavelink',
    employeeBand: '5000+',
    orgUnits: [
      hq('Wavelink HQ', 'Noida'),
      unit('North Network', 'NTH', 'branch', 'Delhi'),
      unit('Data Centre', 'DC1', 'plant', 'Navi Mumbai'),
    ],
    definitions: [
      def('Network & DC power', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – cell towers', 'NTH', 'Delhi, IN', 2400000, 'kWh'),
        row('Grid electricity – data centre', 'DC1', 'Navi Mumbai, IN', 1800000, 'kWh'),
      ]),
      def('Tower generators', 1, 'S1_STATIONARY', [row('Diesel – tower DG sets', 'NTH', 'Delhi, IN', 160000, 'L')]),
      def('Network equipment', 3, 'S3_C1', [
        row('Electrical equipment – network hardware', 'DC1', 'Navi Mumbai, IN', 180, 't'),
      ]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'How much diesel do towers burn per month?',
  },
  {
    industryCode: 'higher_education',
    industryName: 'Higher education (colleges & universities)',
    company: 'Riverside Institute of Technology',
    website: 'https://riverside.example',
    linkedinUrl: 'https://www.linkedin.com/school/riverside-institute',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Riverside Main Campus', 'Coimbatore'),
      unit('Engineering Block', 'ENG', 'campus', 'Coimbatore'),
      unit('Hostels', 'HOS', 'campus', 'Coimbatore'),
    ],
    definitions: [
      def('Campus electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – academic blocks', 'ENG', 'Coimbatore, IN', 520000, 'kWh'),
        row('Grid electricity – hostels', 'HOS', 'Coimbatore, IN', 310000, 'kWh'),
      ]),
      def('Campus buses & kitchens', 1, 'S1_MOBILE', [
        row('Diesel – college buses', 'HQ', 'Coimbatore, IN', 38000, 'L'),
        row('LPG – hostel kitchens', 'HOS', 'Coimbatore, IN', 12000, 'kg'),
      ]),
      def('Staff & student commuting', 3, 'S3_C7', [
        row('Car – average petrol, commuting', 'HQ', 'Coimbatore, IN', 420000, 'km'),
      ]),
    ],
    reportFormat: 'India — Colleges: NIRF / NAAC',
    assistantQuestion: 'What are our emissions per hostel vs academic blocks?',
  },
  {
    industryCode: 'public_sector',
    industryName: 'Government & public sector',
    company: 'City Municipal Corporation',
    website: 'https://citycorp.example',
    linkedinUrl: 'https://www.linkedin.com/company/city-municipal',
    employeeBand: '5000+',
    orgUnits: [
      hq('Civic Centre', 'Pune'),
      unit('Water Works', 'WTR', 'plant', 'Pune'),
      unit('Transport Depot', 'TRN', 'warehouse', 'Pune'),
    ],
    definitions: [
      def('Pumping & street lights', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – water pumping', 'WTR', 'Pune, IN', 1600000, 'kWh'),
        row('Grid electricity – street lights', 'HQ', 'Pune, IN', 900000, 'kWh'),
      ]),
      def('Municipal fleet', 1, 'S1_MOBILE', [row('Diesel – buses and refuse trucks', 'TRN', 'Pune, IN', 520000, 'L')]),
      def('Waste to landfill', 3, 'S3_C5', [row('Mixed waste to landfill', 'TRN', 'Pune, IN', 8200, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Break down Scope 1 by department.',
  },
  {
    industryCode: 'textiles_apparel',
    industryName: 'Textiles & apparel',
    company: 'Loomcraft Textiles',
    website: 'https://loomcraft.example',
    linkedinUrl: 'https://www.linkedin.com/company/loomcraft',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Loomcraft HQ', 'Tiruppur'),
      unit('Dyeing Unit', 'DYE', 'plant', 'Tiruppur'),
      unit('Stitching Unit', 'STI', 'plant', 'Erode'),
    ],
    definitions: [
      def('Dyeing steam', 1, 'S1_STATIONARY', [row('Coal – boiler for dyeing', 'DYE', 'Tiruppur, IN', 2400, 't')]),
      def('Unit electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – dyeing', 'DYE', 'Tiruppur, IN', 410000, 'kWh'),
        row('Grid electricity – stitching', 'STI', 'Erode, IN', 230000, 'kWh'),
      ]),
      def('Cotton & yarn', 3, 'S3_C1', [row('Textiles – cotton yarn', 'STI', 'Erode, IN', 620, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'How much does coal contribute to our total?',
  },
  {
    industryCode: 'automotive',
    industryName: 'Automotive',
    company: 'Torque Auto Components',
    website: 'https://torqueauto.example',
    linkedinUrl: 'https://www.linkedin.com/company/torque-auto',
    employeeBand: '1001-5000',
    orgUnits: [
      hq('Torque HQ', 'Chennai'),
      unit('Forging Plant', 'FRG', 'plant', 'Sriperumbudur'),
      unit('Assembly Plant', 'ASM', 'plant', 'Pune'),
    ],
    definitions: [
      def('Furnaces & ovens', 1, 'S1_STATIONARY', [
        row('Natural gas – forging furnaces', 'FRG', 'Sriperumbudur, IN', 320000, 'm3'),
        row('LPG – paint shop ovens', 'ASM', 'Pune, IN', 26000, 'kg'),
      ]),
      def('Plant electricity', 2, 'S2_ELECTRICITY', [
        row('Grid electricity – assembly', 'ASM', 'Pune, IN', 890000, 'kWh'),
      ]),
      def('Steel & aluminium', 3, 'S3_C1', [row('Steel – hot rolled coil', 'FRG', 'Sriperumbudur, IN', 4200, 't')]),
    ],
    reportFormat: 'India — SEBI BRSR',
    assistantQuestion: 'Which plant has the most Scope 1 emissions?',
  },
];

export const exampleFor = (industryCode?: string | null): IndustryExample =>
  INDUSTRY_EXAMPLES.find((e) => e.industryCode === industryCode) ?? INDUSTRY_EXAMPLES[0]!;

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A ready-to-upload CSV (same headers as the official template) for one example definition. */
export function exampleCsv(d: ExampleDefinition, periodStart = '2026-01-01', periodEnd = '2026-03-31'): string {
  const header = ['Activity Description', 'Location', 'Measure', 'Unit', 'Period Start', 'Period End'];
  const lines = d.rows.map((r) =>
    [r.description, r.location, r.measure, r.unit, periodStart, periodEnd].map(csvCell).join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
