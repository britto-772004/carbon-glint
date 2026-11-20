import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { EmissionFactorSource, EmissionFactorSyncStatus } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const SOURCE: EmissionFactorSource = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'DEFRA_2026',
  publisher: 'UK DESNZ / DEFRA',
  name: 'UK Government GHG Conversion Factors 2026',
  version: '2026',
  year: 2026,
  licence: 'Open Government Licence v3.0',
  url: 'https://www.gov.uk/defra',
  factorCount: 2622,
  importedAt: '2026-11-20T10:00:00.000Z',
};
const STATUS: EmissionFactorSyncStatus = {
  intervalHours: 168,
  nextRunAt: '2026-11-27T10:00:00.000Z',
  lastRun: {
    trigger: 'schedule',
    status: 'ok',
    startedAt: '2026-11-20T10:00:00.000Z',
    finishedAt: '2026-11-20T10:01:00.000Z',
    imported: [],
    message: 'All known databases are up to date.',
  },
};

describe('Settings → Emission factor databases', () => {
  it('lists the databases in use with the last and next sync', async () => {
    signIn(buildMe());
    server.use(
      http.get(apiUrl('/emission-factors/sources'), () => HttpResponse.json([SOURCE])),
      http.get(apiUrl('/emission-factors/sync'), () => HttpResponse.json(STATUS)),
    );
    renderApp('/app/settings');
    const table = await screen.findByRole('table', { name: 'Emission factor databases' });
    expect(within(table).getByText('UK Government GHG Conversion Factors 2026')).toBeInTheDocument();
    expect(within(table).getByText('2,622')).toBeInTheDocument();
    expect(await screen.findByText('All known databases are up to date.')).toBeInTheDocument();
    expect(screen.getByText('every 7 days')).toBeInTheDocument();
  });

  it('shows a failed sync with its reason', async () => {
    signIn(buildMe());
    server.use(
      http.get(apiUrl('/emission-factors/sync'), () =>
        HttpResponse.json({ ...STATUS, lastRun: { ...STATUS.lastRun!, status: 'failed', message: 'network down' } }),
      ),
    );
    renderApp('/app/settings');
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });

  it('Sync now queues a manual sync', async () => {
    signIn(buildMe());
    let queued = 0;
    server.use(
      http.post(apiUrl('/emission-factors/sync'), () => {
        queued += 1;
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const { user } = renderApp('/app/settings');
    await user.click(await screen.findByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(queued).toBe(1));
  });
});
