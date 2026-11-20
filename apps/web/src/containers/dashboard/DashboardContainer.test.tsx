import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { EmissionSummary, Heatmap, OrgEmissionNode } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { ORG_UNITS, buildMe } from '../../test/fixtures';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const totals = (s1: number, s2: number, s3: number) => ({ '1': s1, '2': s2, '3': s3, total: s1 + s2 + s3 });

describe('Dashboard', () => {
  it('shows KPIs, top activities and filters everything by a clicked business unit', async () => {
    signIn(buildMe());
    const summaryCalls: string[] = [];
    server.use(
      http.get(apiUrl('/emissions/summary'), ({ request }) => {
        const bu = new URL(request.url).searchParams.get('orgUnitId');
        summaryCalls.push(bu ?? 'all');
        return HttpResponse.json<EmissionSummary>({
          co2eKg: bu ? totals(1000, 0, 0) : totals(3100, 12000, 900),
          activityCount: 10,
          needsReview: 2,
          unmatched: 1,
          overridden: 0,
          orgUnitsWithData: 3,
          orgUnitCount: 3,
        });
      }),
      http.get(apiUrl('/emissions/heatmap'), ({ request }) => {
        const g = new URL(request.url).searchParams.get('groupBy');
        return HttpResponse.json<Heatmap>(
          g === 'activity'
            ? {
                groupBy: 'activity',
                columns: ['2026'],
                rows: [
                  { key: 'a1', label: 'Grid electricity – office', total: 12000, cells: [12000] },
                  { key: 'a2', label: 'Diesel – DG set', total: 3100, cells: [3100] },
                ],
                columnTotals: [15100],
                total: 15100,
              }
            : { groupBy: 'scope', columns: ['2026-01'], rows: [], columnTotals: [0], total: 0 },
        );
      }),
      http.get(apiUrl('/emissions/org-tree'), () =>
        HttpResponse.json<OrgEmissionNode[]>(
          ORG_UNITS.map((u, i) => ({
            orgUnitId: u.id,
            parentId: u.parentId,
            name: u.name,
            code: u.code,
            own: totals(i * 10, 0, 0),
            rollup: totals(i === 0 ? 16000 : 1000, 0, 0),
          })),
        ),
      ),
    );
    renderApp('/app/dashboard');
    expect(await screen.findAllByText('16 t CO₂e')).toHaveLength(2); // total KPI + HQ roll-up in the BU tree
    expect(screen.getAllByText('12 t CO₂e').length).toBeGreaterThanOrEqual(1); // scope 2 KPI (+ top activity)
    expect(screen.getByText('2 need review · 1 unmatched · 0 overridden')).toBeInTheDocument();
    const top = screen.getByRole('list', { name: 'Top emitting activities' });
    expect(within(top).getAllByRole('listitem')[0]).toHaveTextContent('Grid electricity – office');

    // fireEvent: React Flow's d3-drag listens for mousedown, which jsdom's user-event can't complete (no `view`).
    fireEvent.click(await screen.findByText('Pune Plant'));
    await waitFor(() => expect(summaryCalls).toContain(ORG_UNITS[1]!.id));
    expect(await screen.findByText(/Filtered to Pune Plant/)).toBeInTheDocument();
  });
});
