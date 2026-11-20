import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Report, ReportFormat } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { ORG_UNITS, buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const FORMATS: ReportFormat[] = [
  { code: 'IN_BRSR', name: 'India — SEBI BRSR', region: 'India', framework: 'BRSR', description: 'Principle 6' },
  { code: 'SG_SGX', name: 'Singapore — SGX', region: 'Singapore', framework: 'IFRS S2', description: 'Scope 1 & 2' },
];
const report = (o: Partial<Report>): Report => ({
  id: 'r0000000-0000-4000-8000-000000000001',
  orgUnitId: ORG_UNITS[0]!.id,
  orgUnitName: 'Acme HQ',
  format: 'IN_BRSR',
  formatName: 'India — SEBI BRSR',
  periodStart: '2025-04-01',
  periodEnd: '2026-03-31',
  status: 'queued',
  error: null,
  createdAt: '2026-11-20T00:00:00.000Z',
  generatedAt: null,
  ...o,
});

describe('Reports', () => {
  it('generates a report and offers the PDF once ready', async () => {
    signIn(buildMe());
    let body: unknown;
    let polls = 0;
    server.use(
      http.get(apiUrl('/reports/formats'), () => HttpResponse.json(FORMATS)),
      http.get(apiUrl('/reports'), () => {
        if (!body) return HttpResponse.json<Report[]>([]);
        polls += 1;
        return HttpResponse.json<Report[]>([report({ status: polls > 1 ? 'ready' : 'generating' })]);
      }),
      http.post(apiUrl('/reports'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<Report>(report({}), { status: 202 });
      }),
    );
    const { user } = renderApp('/app/reports');
    expect(await screen.findByText('India — SEBI BRSR')).toBeInTheDocument(); // defaults loaded
    await screen.findByText('Acme HQ');
    await user.click(screen.getByRole('button', { name: 'Generate PDF' }));
    await waitFor(() => expect(body).toMatchObject({ orgUnitId: ORG_UNITS[0]!.id, format: 'IN_BRSR' }));
    const table = await screen.findByRole('table', { name: 'Reports' });
    const link = await within(table).findByRole('link', { name: 'Download PDF' }, { timeout: 5000 });
    expect(link).toHaveAttribute('href', '/api/reports/r0000000-0000-4000-8000-000000000001/download');
  });
});
