import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Activity, ActivityDefinition, ActivityDefinitionDetail } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { buildActivityDefinition, buildMe, CATEGORIES } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const PUBLISHED = buildActivityDefinition({ status: 'published', activityCount: 2, dataSourceCount: 1 });
const activity = (n: number): Activity => ({
  id: `ac000000-0000-4000-8000-00000000000${n}`,
  dataSourceId: 'ds000000-0000-4000-8000-000000000001',
  rowNumber: n,
  description: `Grid electricity row ${n}`,
  measure: 1000 * n,
  unit: 'kWh',
  location: null,
  orgUnitId: null,
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  spend: null,
  currency: null,
});

describe('Activity Definitions — scope category board', () => {
  it('shows categories under every scope (recommended first) and pre-fills a new definition', async () => {
    signIn(buildMe());
    server.use(
      http.post(apiUrl('/activity-definitions'), () =>
        HttpResponse.json<ActivityDefinition>(buildActivityDefinition({ scope: 3 }), { status: 201 }),
      ),
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json({ definition: buildActivityDefinition(), dataSources: [] }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () => HttpResponse.json({ items: [], total: 0 })),
    );
    const { user } = renderApp('/app/activity-definitions');
    expect(await screen.findByText('Scope 1 — direct emissions')).toBeInTheDocument();
    expect(screen.getByText('Scope 2 — purchased energy')).toBeInTheDocument();
    expect(screen.getByText('Scope 3 — value chain')).toBeInTheDocument();
    expect(await screen.findByText('Stationary combustion')).toBeInTheDocument();
    expect(screen.getByText('6. Business travel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create definition for 6. Business travel' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: /GHG category/ })).toHaveTextContent('6. Business travel');
    expect(within(dialog).getByRole('combobox', { name: /Scope/ })).toHaveTextContent('Scope 3');
  });

  it('filters the list by clicking a category', async () => {
    signIn(buildMe());
    const { user } = renderApp('/app/activity-definitions');
    const table = await screen.findByRole('table', { name: 'Activity definitions' });
    expect(within(table).getByText('Grid electricity')).toBeInTheDocument();
    await user.click(await screen.findByText(CATEGORIES[3]!.name));
    await waitFor(() => expect(screen.queryByRole('table', { name: 'Activity definitions' })).not.toBeInTheDocument());
    expect(screen.getByText('No activity definitions yet')).toBeInTheDocument();
  });
});

describe('Activity Definition — delete activities + recalculate', () => {
  it('deletes the selected rows and recalculates with optional override reset', async () => {
    signIn(buildMe());
    let rows = [activity(1), activity(2)];
    let deleteBody: unknown;
    let recalcBody: unknown;
    server.use(
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json<ActivityDefinitionDetail>({
          definition: { ...PUBLISHED, activityCount: rows.length },
          dataSources: [],
        }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () =>
        HttpResponse.json({ items: rows, total: rows.length }),
      ),
      http.post(apiUrl('/activity-definitions/:id/activities/bulk-delete'), async ({ request }) => {
        deleteBody = await request.json();
        const ids = (deleteBody as { activityIds: string[] }).activityIds;
        rows = rows.filter((r) => !ids.includes(r.id));
        return HttpResponse.json({ deleted: ids.length });
      }),
      http.post(apiUrl('/activity-definitions/:id/recalculate'), async ({ request }) => {
        recalcBody = await request.json();
        return HttpResponse.json<ActivityDefinition>(PUBLISHED, { status: 202 });
      }),
    );
    const { user } = renderApp(`/app/activity-definitions/${PUBLISHED.id}`);
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 1' }));
    await user.click(screen.getByRole('button', { name: 'Delete selected (1)' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete 1 activities?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteBody).toEqual({ activityIds: [activity(1).id] }));
    expect(await screen.findByText(/1 activity deleted\. Press Recalculate/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Grid electricity row 1')).not.toBeInTheDocument());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Recalculate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Recalculate emissions' });
    await user.click(within(dialog).getByRole('checkbox', { name: 'Also reset manual overrides' }));
    await user.click(within(dialog).getByRole('button', { name: 'Recalculate' }));
    await waitFor(() => expect(recalcBody).toEqual({ resetOverrides: true }));
    expect(await screen.findByText(/Recalculation started/)).toBeInTheDocument();
  });
});
