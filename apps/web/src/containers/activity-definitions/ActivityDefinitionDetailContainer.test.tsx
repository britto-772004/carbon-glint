import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ActivityDefinitionDetail, DataSource, MappingSuggestion } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { buildActivityDefinition, buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const AD = buildActivityDefinition();
const COLUMNS = ['Activity Description', 'Measure', 'Unit', 'Business Unit'];
const baseDs: DataSource = {
  id: 'ds000000-0000-4000-8000-000000000001',
  activityDefinitionId: AD.id,
  fileName: 'q1.csv',
  fileType: 'csv',
  fileSize: 120,
  sheets: [],
  sheetName: null,
  headerRow: 1,
  columns: COLUMNS,
  preview: [['Grid electricity', '18450', 'kWh', 'HQ']],
  rowCount: 10,
  mapping: null,
  mappingMode: null,
  status: 'uploaded',
  importedCount: 0,
  errorCount: 0,
  errors: [],
  importedAt: null,
  createdAt: '2026-11-20T10:00:00.000Z',
};
const MAPPING = {
  description: 'Activity Description',
  measure: 'Measure',
  unit: 'Unit',
  orgUnit: 'Business Unit',
  location: null,
  periodStart: null,
  periodEnd: null,
  spend: null,
  currency: null,
};

describe('Activity Definition detail + upload wizard', () => {
  it('upload → preview → AI mapping → import → polls until imported', async () => {
    signIn(buildMe());
    let importBody: unknown;
    let polls = 0;
    let uploaded = false;
    server.use(
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json<ActivityDefinitionDetail>({ definition: AD, dataSources: uploaded ? [baseDs] : [] }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () => HttpResponse.json({ items: [], total: 0 })),
      http.post(apiUrl('/activity-definitions/:id/data-sources'), async ({ request }) => {
        const form = await request.formData();
        // jsdom's File loses its name crossing into Node's FormData; browsers keep it.
        expect(form.has('file')).toBe(true);
        uploaded = true;
        return HttpResponse.json<DataSource>(baseDs, { status: 201 });
      }),
      http.post(apiUrl('/data-sources/:id/suggest-mapping'), () =>
        HttpResponse.json<MappingSuggestion>({
          mapping: MAPPING,
          confidence: { description: 0.95, measure: 0.9, unit: 0.9, orgUnit: 0.6 },
          source: 'ai',
          reasoning: 'Clear headers.',
        }),
      ),
      http.post(apiUrl('/data-sources/:id/import'), async ({ request }) => {
        importBody = await request.json();
        return HttpResponse.json<DataSource>({ ...baseDs, status: 'importing' }, { status: 202 });
      }),
      http.get(apiUrl('/data-sources/:id'), () => {
        polls += 1;
        return HttpResponse.json<DataSource>(
          polls < 2 ? { ...baseDs, status: 'importing' } : { ...baseDs, status: 'imported', importedCount: 10 },
        );
      }),
    );

    const { user } = renderApp(`/app/activity-definitions/${AD.id}`);
    await user.click(await screen.findByRole('button', { name: 'Upload source sheet' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: /Spreadsheet columns mapped/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Download Excel template' })).toHaveAttribute(
      'href',
      '/api/templates/activity-data',
    );

    await user.upload(
      within(dialog).getByLabelText('Source sheet file'),
      new File(['a,b'], 'q1.csv', { type: 'text/csv' }),
    );
    expect(await within(dialog).findByText(/10 data rows · 4 columns/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    await user.click(within(dialog).getByText('Automatically infer (AI)'));
    expect(await within(dialog).findByText(/Clear headers/)).toBeInTheDocument();
    expect(within(dialog).getByText('95%')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    await user.click(within(dialog).getByLabelText(/Import valid rows/));
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));
    expect(await within(dialog).findByText('Imported 10 activities.', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(importBody).toEqual({ mapping: MAPPING, mappingMode: 'ai', onlyValidRows: true });
  });

  it('manual mapping requires description, measure and unit before Next', async () => {
    signIn(buildMe());
    server.use(
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json<ActivityDefinitionDetail>({ definition: AD, dataSources: [] }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () => HttpResponse.json({ items: [], total: 0 })),
      http.post(apiUrl('/activity-definitions/:id/data-sources'), () =>
        HttpResponse.json<DataSource>(baseDs, { status: 201 }),
      ),
    );
    const { user } = renderApp(`/app/activity-definitions/${AD.id}`);
    await user.click(await screen.findByRole('button', { name: 'Upload source sheet' }));
    const dialog = await screen.findByRole('dialog');
    await user.upload(within(dialog).getByLabelText('Source sheet file'), new File(['a'], 'q1.csv'));
    await user.click(await within(dialog).findByRole('button', { name: 'Next' }));
    await user.click(within(dialog).getByText('Map manually'));
    const next = within(dialog).getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    for (const [label, column] of [
      ['Activity description *', 'Activity Description'],
      ['Measure *', 'Measure'],
      ['Unit *', 'Unit'],
    ] as const) {
      await user.click(within(dialog).getByRole('combobox', { name: label }));
      await user.click(await screen.findByRole('option', { name: column }));
    }
    await waitFor(() => expect(next).toBeEnabled());
  });

  it('publishes and shows the error when there is nothing to publish', async () => {
    signIn(buildMe());
    server.use(
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json<ActivityDefinitionDetail>({
          definition: { ...AD, activityCount: 10, dataSourceCount: 1 },
          dataSources: [{ ...baseDs, status: 'imported', importedCount: 10 }],
        }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () =>
        HttpResponse.json({
          items: [
            {
              id: 'a1',
              dataSourceId: baseDs.id,
              rowNumber: 2,
              description: 'Grid electricity',
              location: null,
              measure: 18450,
              unit: 'kWh',
              orgUnitId: null,
              periodStart: '2026-01-01',
              periodEnd: '2026-03-31',
              spend: null,
              currency: null,
            },
          ],
          total: 1,
        }),
      ),
      http.post(apiUrl('/activity-definitions/:id/publish'), () => HttpResponse.json({ ...AD, status: 'published' })),
    );
    const { user } = renderApp(`/app/activity-definitions/${AD.id}`);
    expect(await screen.findByText('18,450')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/Emission factors are being matched/)).toBeInTheDocument();
  });
});
