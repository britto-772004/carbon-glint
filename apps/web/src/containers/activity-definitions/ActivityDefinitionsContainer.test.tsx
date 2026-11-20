import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ActivityDefinition, GhgCategory } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { CATEGORIES, buildActivityDefinition, buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

describe('Activity Definitions list', () => {
  it('lists definitions and filters by scope', async () => {
    signIn(buildMe());
    const { user } = renderApp('/app/activity-definitions');
    const table = await screen.findByRole('table', { name: 'Activity definitions' });
    expect(within(table).getByText('Grid electricity')).toBeInTheDocument();
    expect(within(table).getByText('1,200')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Scope 3' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('table', { name: 'Activity definitions' })).queryByText('Grid electricity'),
      ).not.toBeInTheDocument(),
    );
  });

  it('creates a definition with a recommended category and opens it', async () => {
    signIn(buildMe());
    let body: unknown;
    server.use(
      http.post(apiUrl('/activity-definitions'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<ActivityDefinition>(
          buildActivityDefinition({ id: 'ad000000-0000-4000-8000-000000000009' }),
          { status: 201 },
        );
      }),
      http.get(apiUrl('/activity-definitions/:id'), () =>
        HttpResponse.json({ definition: buildActivityDefinition(), dataSources: [] }),
      ),
      http.get(apiUrl('/activity-definitions/:id/activities'), () => HttpResponse.json({ items: [], total: 0 })),
    );
    const { user, router } = renderApp('/app/activity-definitions');
    await user.click(await screen.findByRole('button', { name: 'New activity definition' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Name/), 'Grid electricity');
    await user.click(within(dialog).getByRole('combobox', { name: /GHG category/ }));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Recommended for your industry')).toBeInTheDocument();
    await user.click(within(listbox).getByRole('option', { name: 'Purchased electricity' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/app/activity-definitions/ad000000-0000-4000-8000-000000000009'),
    );
    expect(body).toMatchObject({
      name: 'Grid electricity',
      scope: 2,
      categoryId: CATEGORIES[1]!.id,
      defaultOrgUnitId: null,
    });
  });

  it('adds a custom category for the selected scope', async () => {
    signIn(buildMe());
    let body: unknown;
    server.use(
      http.post(apiUrl('/ghg-categories'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<GhgCategory>(
          {
            ...CATEGORIES[3]!,
            id: 'cc000000-0000-4000-8000-000000000001',
            custom: true,
            recommended: false,
            rank: null,
          },
          { status: 201 },
        );
      }),
    );
    const { user } = renderApp('/app/activity-definitions');
    await user.click(await screen.findByRole('button', { name: 'New activity definition' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: 'Scope' }));
    await user.click(await screen.findByRole('option', { name: /Scope 3/ }));
    await user.type(within(dialog).getByLabelText(/Category name/), 'Data centre colocation');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(body).toEqual({ scope: 3, name: 'Data centre colocation' }));
  });
});
