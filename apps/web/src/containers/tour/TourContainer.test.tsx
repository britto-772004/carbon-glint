import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildMe } from '../../test/fixtures';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';
import { exampleCsv, INDUSTRY_EXAMPLES } from '../../lib/industry-examples';
import { placeCard, TOUR_STEPS } from '../../lib/tour';

describe('guided tour', () => {
  it('offers itself on the first visit, then walks across pages with industry examples', async () => {
    window.localStorage.removeItem('cg.tour.v1.seen');
    signIn(buildMe());
    const { user, router } = renderApp('/app/dashboard');
    const menu = await screen.findByRole('dialog', { name: 'Guided tour' });
    await user.click(within(menu).getByRole('combobox', { name: 'Show examples for' }));
    await user.click(await screen.findByRole('option', { name: 'Manufacturing' }));
    await user.click(within(menu).getByRole('button', { name: 'Start full tour (start to end)' }));

    const card = await screen.findByRole('dialog', { name: 'Guided tour: Welcome to Carbon Glint' });
    expect(within(card).getByText('GK Plastics')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Next' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: /Guided tour: Everything/ })).getByRole('button', {
        name: 'Next',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/org-units'));
    expect(window.localStorage.getItem('cg.tour.v1.seen')).toBe('1');
  });

  it('replays any chapter from the sidebar', async () => {
    signIn(buildMe());
    const { user, router } = renderApp('/app/dashboard');
    const [button] = await screen.findAllByRole('button', { name: 'Guided tour' });
    await user.click(button!);
    const menu = await screen.findByRole('dialog', { name: 'Guided tour' });
    await user.click(within(menu).getByRole('button', { name: /Reports/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/reports'));
    expect(
      await screen.findByRole('dialog', { name: /Guided tour: Export a country-format report/ }),
    ).toBeInTheDocument();
  });
});

describe('tour data', () => {
  it('has an example for every industry with all three scopes and uploadable CSVs', () => {
    expect(INDUSTRY_EXAMPLES).toHaveLength(18);
    for (const ex of INDUSTRY_EXAMPLES) {
      expect(new Set(ex.definitions.map((d) => d.scope))).toEqual(new Set([1, 2, 3]));
      const codes = new Set(ex.orgUnits.map((u) => u.code));
      for (const d of ex.definitions) for (const r of d.rows) expect(codes.has(r.orgUnit)).toBe(true);
    }
    const csv = exampleCsv(INDUSTRY_EXAMPLES[0]!.definitions[0]!);
    expect(csv.split('\n')[0]).toBe('Activity Description,Location,Measure,Unit,Period Start,Period End');
  });

  it('every step has a route inside the tenant app', () => {
    for (const s of TOUR_STEPS) expect(s.route.startsWith('/app/')).toBe(true);
  });

  it('places the card beside the target and on screen', () => {
    expect(placeCard({ top: 100, left: 20, width: 200, height: 40 }, { width: 1400, height: 900 })).toEqual({
      top: 100,
      left: 236,
    });
    const p = placeCard({ top: 850, left: 1200, width: 180, height: 40 }, { width: 1400, height: 900 });
    expect(p.left + 400).toBeLessThanOrEqual(1400);
    expect(p.top).toBeGreaterThanOrEqual(16);
    expect(placeCard(null, { width: 1400, height: 900 })).toEqual({ top: 260, left: 500 });
  });
});
