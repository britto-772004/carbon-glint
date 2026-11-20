import { describe, expect, it } from 'vitest';
import { parseDefraFlatFile } from '../../../src/ef/defra.js';
import { parseGenericFactorCsv } from '../../../src/ef/generic-csv.js';
import { buildDefraLikeXlsx } from '../../helpers/ef-fixtures.js';

describe('DEFRA flat-file parser', () => {
  it('groups total + per-gas rows, maps units/regions, skips blanks and non-emission rows', async () => {
    const d = await parseDefraFlatFile(await buildDefraLikeXlsx(), { url: 'https://gov.uk/x' });
    expect(d.source).toMatchObject({ code: 'DEFRA_2026', year: 2026, licence: 'Open Government Licence v3.0' });
    expect(d.factors).toHaveLength(4);
    const byId = Object.fromEntries(d.factors.map((f) => [f.externalId, f]));
    expect(byId['1_1']).toMatchObject({
      unit: 'L',
      scopeHint: 1,
      region: 'GLOBAL',
      co2ePerUnit: 2.58354,
      co2PerUnit: 2.55,
      ch4PerUnit: 0.0003,
      n2oPerUnit: 0.033,
    });
    expect(byId['2_1']).toMatchObject({ unit: 'kWh', scopeHint: 2, region: 'GB' });
    expect(byId['3_1']).toMatchObject({ unit: 'room.night', region: 'United Arab Emirates' });
    expect(byId['3_2']!.co2ePerUnit).toBeCloseTo(150e-6); // per million litres → per litre
    expect(byId['3_2']!.unit).toBe('L');
  });

  it('rejects other workbooks', async () => {
    const { buildActivityTemplateXlsx } = await import('../../../src/lib/activity-template.js');
    await expect(parseDefraFlatFile(await buildActivityTemplateXlsx(), { url: 'x' })).rejects.toThrow(
      /Factors by Category/,
    );
  });
});

describe('generic factor CSV', () => {
  it('parses rows, normalizes units and reports invalid lines', () => {
    const csv =
      'external_id,name,category,scope,region,unit,co2e_per_unit\nin-grid,Grid electricity India,Electricity,2,India,kWh,0.71\nbad,,x,,,kWh,1\n';
    const { dataset, errors } = parseGenericFactorCsv(csv, {
      code: 'CEA',
      publisher: 'CEA',
      name: 'CEA',
      version: '20',
      year: 2025,
      licence: 'public',
      url: 'u',
    });
    expect(dataset.factors).toEqual([
      expect.objectContaining({ externalId: 'in-grid', unit: 'kWh', scopeHint: 2, region: 'India', co2ePerUnit: 0.71 }),
    ]);
    expect(errors).toEqual(['line 3: external_id, name, unit and co2e_per_unit are required']);
  });
});
