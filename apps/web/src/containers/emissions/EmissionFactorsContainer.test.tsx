import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { EmissionRow, EmissionTrace, FactorSearchHit, Heatmap } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const ROW: EmissionRow = {
  activityId: 'a0000000-0000-4000-8000-000000000001',
  activityDefinitionId: 'ad',
  activityDefinitionName: 'Q1 fuels',
  scope: 1,
  categoryId: 'c1',
  categoryName: 'Stationary combustion',
  orgUnitId: null,
  orgUnitName: 'Acme HQ',
  description: 'Diesel – DG set',
  measure: 1200,
  unit: 'L',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  factor: {
    id: 'f1',
    name: 'Liquid fuels › Diesel (average biofuel blend) › (litres)',
    sourceCode: 'DEFRA_2026',
    unit: 'L',
    co2ePerUnit: 2.58354,
    region: 'GLOBAL',
  },
  method: 'ai',
  status: 'matched',
  confidence: 0.93,
  co2eKg: 3100.248,
};
const heat = (groupBy: Heatmap['groupBy'], rows: Heatmap['rows']): Heatmap => ({
  groupBy,
  columns: ['2026-01', '2026-02', '2026-03'],
  rows,
  columnTotals: [1, 1, 1],
  total: rows.reduce((s, r) => s + r.total, 0),
});

describe('Emission Factors tab', () => {
  it('drills scope → category in the heatmap (table view)', async () => {
    signIn(buildMe());
    const seen: string[] = [];
    server.use(
      http.get(apiUrl('/emission-factors/sources'), () =>
        HttpResponse.json([
          {
            id: 's1',
            code: 'DEFRA_2026',
            publisher: 'DESNZ',
            name: 'UK factors 2026',
            version: '2026',
            year: 2026,
            licence: 'OGL v3',
            url: 'https://gov.uk',
            factorCount: 2622,
            importedAt: '2026-11-20T00:00:00.000Z',
          },
        ]),
      ),
      http.get(apiUrl('/emissions/heatmap'), ({ request }) => {
        const q = new URL(request.url).searchParams;
        seen.push(`${q.get('groupBy')}:${q.get('scope') ?? ''}`);
        return HttpResponse.json<Heatmap>(
          q.get('groupBy') === 'scope'
            ? heat('scope', [
                { key: '1', label: 'Scope 1', total: 3100, cells: [1033, 1033, 1034] },
                { key: '2', label: 'Scope 2', total: 900, cells: [300, 300, 300] },
              ])
            : heat('category', [{ key: 'c1', label: 'Stationary combustion', total: 3100, cells: [1033, 1033, 1034] }]),
        );
      }),
    );
    const { user } = renderApp('/app/emission-factors');
    expect(await screen.findByText('DESNZ 2026 · 2,622 factors')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'View as table' }));
    const table = await screen.findByRole('table', { name: 'Heatmap data' });
    expect(within(table).getByText('Scope 2')).toBeInTheDocument();
    await user.click(within(table).getByText('Scope 1'));
    expect(await screen.findByText('Stationary combustion')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Drill-down path' })).getByText('Scope 1'),
    ).toBeInTheDocument();
    expect(seen).toEqual(expect.arrayContaining(['scope:', 'category:1']));
  });

  it('opens the traceability drawer and overrides with a library factor', async () => {
    signIn(buildMe());
    let body: unknown;
    server.use(
      http.get(apiUrl('/emission-factors/sources'), () => HttpResponse.json([])),
      http.get(apiUrl('/emissions/heatmap'), () => HttpResponse.json<Heatmap>(heat('scope', []))),
      http.get(apiUrl('/emissions'), () => HttpResponse.json({ items: [ROW], total: 1, totalCo2eKg: 3100.248 })),
      http.get(apiUrl('/emissions/:id/trace'), () =>
        HttpResponse.json<EmissionTrace>({
          row: ROW,
          overrides: [],
          trace: {
            input: {
              rowNumber: 3,
              description: 'Diesel – DG set',
              measure: 1200,
              unit: 'L',
              location: 'Bengaluru',
              periodStart: '2026-01-01',
              periodEnd: '2026-03-31',
            },
            classification: { scope: 1, categoryName: 'Stationary combustion' },
            match: {
              method: 'ai',
              confidence: 0.93,
              rationale: 'Diesel combustion factor.',
              query: 'diesel',
              alternatives: [],
            },
            factor: {
              sourceCode: 'DEFRA_2026',
              sourceName: 'UK factors 2026',
              publisher: 'DESNZ',
              licence: 'OGL v3',
              externalId: '1_100',
              name: 'Diesel (average biofuel blend)',
              category: 'Fuels',
              region: 'GLOBAL',
              year: 2026,
              unit: 'L',
              co2ePerUnit: 2.58354,
              gases: { co2: null, ch4: null, n2o: null },
              citationUrl: 'https://gov.uk',
            },
            conversion: { from: 'L', to: 'L', factor: 1, normalizedQuantity: 1200 },
            gwp: 'CO2e as published',
            result: { co2eKg: 3100.248, formula: '1200 L × 1 = 1200 L × 2.58354 kg CO2e/L' },
          },
        }),
      ),
      http.get(apiUrl('/emission-factors/search'), () =>
        HttpResponse.json<FactorSearchHit[]>([
          {
            score: 0.9,
            factor: {
              id: 'f2000000-0000-4000-8000-000000000002',
              sourceCode: 'DEFRA_2026',
              sourceName: 'x',
              externalId: '2',
              name: 'Diesel (100% mineral diesel) (litres)',
              category: 'Fuels',
              scopeHint: 1,
              region: 'GLOBAL',
              year: 2026,
              unit: 'L',
              unitLabel: 'litres',
              co2ePerUnit: 2.66,
              co2PerUnit: null,
              ch4PerUnit: null,
              n2oPerUnit: null,
              citationUrl: 'u',
            },
          },
        ]),
      ),
      http.post(apiUrl('/emissions/:id/override'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<EmissionRow>({ ...ROW, status: 'overridden', method: 'override' });
      }),
    );
    const { user } = renderApp('/app/emission-factors');
    await user.click(await screen.findByRole('tab', { name: 'Activities' }));
    await user.click(await screen.findByText('Diesel – DG set'));

    const drawer = await screen.findByRole('presentation');
    expect(await within(drawer).findByText(/Result —/)).toBeInTheDocument();
    expect(within(drawer).getByText(/2.58354 kg CO₂e \/ L/)).toBeInTheDocument();
    expect(within(drawer).getByText(/Confidence 93%/)).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Override' }));
    const dialog = await screen.findByRole('dialog', { name: 'Override emission factor' });
    await user.click(await within(dialog).findByText('Diesel (100% mineral diesel) (litres)'));
    await user.type(within(dialog).getByLabelText(/Reason/), 'Supplier invoice says mineral diesel');
    await user.click(within(dialog).getByRole('button', { name: 'Apply override' }));
    await waitFor(() =>
      expect(body).toEqual({
        type: 'factor',
        factorId: 'f2000000-0000-4000-8000-000000000002',
        reason: 'Supplier invoice says mineral diesel',
      }),
    );
  });
});
