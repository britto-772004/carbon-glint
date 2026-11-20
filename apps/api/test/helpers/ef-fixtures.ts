import ExcelJS from 'exceljs';
import type { ParsedDataset } from '../../src/ef/types.js';

/** A small DEFRA-like factor set (values are test fixtures, not authoritative). */
export const TEST_DATASET: ParsedDataset = {
  source: {
    code: 'TEST_2026',
    publisher: 'Test publisher',
    name: 'Test factors 2026',
    version: '2026',
    year: 2026,
    licence: 'test',
    url: 'https://example.test/factors',
  },
  factors: [
    {
      externalId: 'f1',
      name: 'Liquid fuels › Diesel (average biofuel blend) › (litres)',
      category: 'Fuels',
      scopeHint: 1,
      region: 'GLOBAL',
      unit: 'L',
      unitLabel: 'litres',
      co2ePerUnit: 2.5,
      co2PerUnit: 2.45,
      ch4PerUnit: 0.01,
      n2oPerUnit: 0.04,
    },
    {
      externalId: 'f2',
      name: 'Liquid fuels › Petrol (average biofuel blend) › (litres)',
      category: 'Fuels',
      scopeHint: 1,
      region: 'GLOBAL',
      unit: 'L',
      unitLabel: 'litres',
      co2ePerUnit: 2.1,
      co2PerUnit: null,
      ch4PerUnit: null,
      n2oPerUnit: null,
    },
    {
      externalId: 'f3',
      name: 'Electricity generated › Grid electricity › (kWh)',
      category: 'Electricity',
      scopeHint: 2,
      region: 'GLOBAL',
      unit: 'kWh',
      unitLabel: 'kWh',
      co2ePerUnit: 0.5,
      co2PerUnit: null,
      ch4PerUnit: null,
      n2oPerUnit: null,
    },
    {
      externalId: 'f4',
      name: 'Gaseous fuels › Natural gas › (cubic metres)',
      category: 'Fuels',
      scopeHint: 1,
      region: 'GLOBAL',
      unit: 'm3',
      unitLabel: 'cubic metres',
      co2ePerUnit: 2.0,
      co2PerUnit: null,
      ch4PerUnit: null,
      n2oPerUnit: null,
    },
    {
      externalId: 'f5',
      name: 'Flights › Long-haul › Economy class › (passenger.km)',
      category: 'Business travel- air',
      scopeHint: 3,
      region: 'GLOBAL',
      unit: 'passenger.km',
      unitLabel: 'passenger.km',
      co2ePerUnit: 0.1,
      co2PerUnit: null,
      ch4PerUnit: null,
      n2oPerUnit: null,
    },
  ],
};

/** Builds an xlsx in the official DEFRA flat-file layout for parser tests. */
export async function buildDefraLikeXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Front page').addRow(['UK Government GHG Conversion Factors for Company Reporting']);
  const ws = wb.addWorksheet('Factors by Category');
  ws.addRow(['UK Government GHG Conversion Factors for Company Reporting']);
  ws.addRow(['Factors by Category']);
  ws.addRow(['Freeze panes are active']);
  ws.addRow([]);
  ws.addRow([null, null, 'Category', 'Category', 'Category', 'Category']);
  ws.addRow([
    'ID',
    'Scope',
    'Level 1',
    'Level 2',
    'Level 3',
    'Level 4',
    'Column Text',
    'UOM',
    'GHG/Unit',
    'GHG Conversion Factor 2026',
  ]);
  const rows = [
    [
      '1_1_1',
      'Scope 1',
      'Fuels',
      'Liquid fuels',
      'Diesel (average biofuel blend)',
      null,
      null,
      'litres',
      'kg CO2e',
      2.58354,
    ],
    [
      '1_1_2',
      'Scope 1',
      'Fuels',
      'Liquid fuels',
      'Diesel (average biofuel blend)',
      null,
      null,
      'litres',
      'kg CO2e of CO2 per unit',
      2.55,
    ],
    [
      '1_1_3',
      'Scope 1',
      'Fuels',
      'Liquid fuels',
      'Diesel (average biofuel blend)',
      null,
      null,
      'litres',
      'kg CO2e of CH4 per unit',
      0.0003,
    ],
    [
      '1_1_4',
      'Scope 1',
      'Fuels',
      'Liquid fuels',
      'Diesel (average biofuel blend)',
      null,
      null,
      'litres',
      'kg CO2e of N2O per unit',
      0.033,
    ],
    [
      '2_1_1',
      'Scope 2',
      'UK electricity',
      'Electricity generated',
      'Electricity: UK',
      'kWh',
      null,
      'kWh',
      'kg CO2e',
      0.13096,
    ],
    [
      '3_1_1',
      'Scope 3',
      'Hotel stay',
      'Hotel stay',
      'United Arab Emirates',
      null,
      null,
      'Room per night',
      'kg CO2e',
      40,
    ],
    ['3_2_1', 'Scope 3', 'Water supply', 'Water supply', null, null, null, 'million litres', 'kg CO2e', 150],
    ['9_9_1', 'Scope 1', 'Passenger vehicles', 'Cars', 'Hybrid', null, 'Unknown', 'km', 'kg CO2e', null],
    ['9_9_2', 'Scope 1', 'SECR kWh', 'Cars', null, null, null, 'km', 'kWh (Net CV)', 0.5],
  ];
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
