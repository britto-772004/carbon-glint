import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { OrgUnit } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { ORG_UNITS, buildMe, buildOrgUnit } from '../../test/fixtures';
import { apiError } from '../../test/mocks/handlers';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const openTable = async (user: ReturnType<typeof renderApp>['user']) => {
  await user.click(await screen.findByRole('button', { name: 'Table' }));
  return screen.findByRole('table', { name: 'Business units' });
};

describe('Org Units', () => {
  it('renders the tree in the chart view', async () => {
    signIn(buildMe());
    renderApp('/app/org-units');
    expect(
      await screen.findByText('3 business units · drag a unit onto another to move it under it'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Pune Plant')).toBeInTheDocument();
    expect(screen.getByText('Dubai, United Arab Emirates')).toBeInTheDocument();
  });

  it('shows an indented table with sub-unit counts', async () => {
    signIn(buildMe());
    const { user } = renderApp('/app/org-units');
    const table = await openTable(user);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1]!.textContent)).toEqual(['HQ', 'DXB', 'PUN']);
    expect(within(rows[0]!).getAllByRole('cell')[4]).toHaveTextContent('2');
  });

  it('adds a sub-unit under the chosen parent', async () => {
    signIn(buildMe());
    let body: unknown;
    server.use(
      http.post(apiUrl('/org-units'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<OrgUnit>(
          buildOrgUnit({ id: '10000000-0000-4000-8000-000000000009', name: 'Chennai' }),
          { status: 201 },
        );
      }),
    );
    const { user } = renderApp('/app/org-units');
    const table = await openTable(user);
    const pune = within(table).getByText('Pune Plant').closest('tr')!;
    await user.click(within(pune).getByRole('button', { name: 'Add sub-unit' }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Name/), 'Chennai Warehouse');
    await user.type(within(dialog).getByLabelText(/Code/), 'CHN-1');
    await user.type(within(dialog).getByLabelText(/City/), 'Chennai');
    await user.click(within(dialog).getByRole('button', { name: 'Add unit' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(body).toEqual({
      name: 'Chennai Warehouse',
      code: 'CHN-1',
      type: 'branch',
      parentId: ORG_UNITS[1]!.id,
      country: null,
      city: 'Chennai',
      address: null,
    });
  });

  it('shows API conflicts inside the dialog', async () => {
    signIn(buildMe());
    server.use(
      http.post(apiUrl('/org-units'), () =>
        apiError(409, { code: 'CODE_TAKEN', message: 'Code "HQ" is already used by Acme HQ.' }),
      ),
    );
    const { user } = renderApp('/app/org-units');
    await user.click(await screen.findByRole('button', { name: 'Add unit' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Name/), 'X');
    await user.type(within(dialog).getByLabelText(/Code/), 'HQ');
    await user.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    expect(await within(dialog).findByText('Code "HQ" is already used by Acme HQ.')).toBeInTheDocument();
  });

  it('edits a unit (parent options exclude its own subtree) and deletes a leaf', async () => {
    signIn(buildMe());
    let patched: unknown;
    let deleted = false;
    server.use(
      http.patch(apiUrl('/org-units/:id'), async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json<OrgUnit>(ORG_UNITS[2]!);
      }),
      http.delete(apiUrl('/org-units/:id'), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderApp('/app/org-units');
    const table = await openTable(user);

    await user.click(within(within(table).getByText('Acme HQ').closest('tr')!).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: /Parent unit/ }));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['— None (top level) —']); // HQ can't move under its own children
    await user.keyboard('{Escape}');
    await user.clear(within(dialog).getByLabelText(/City/));
    await user.type(within(dialog).getByLabelText(/City/), 'Mysuru');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(patched).toMatchObject({ city: 'Mysuru', type: 'hq', active: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(
      within(within(table).getByText('Dubai Office').closest('tr')!).getByRole('button', { name: 'Delete' }),
    );
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleted).toBe(true));
  });
});
