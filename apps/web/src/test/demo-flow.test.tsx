import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { client } from '@carbon-glint/sdk';
import { resetDemoStore } from '../demo/handler';
import { switchingFetch } from '../demo/fetch';
import { setDemoMode } from '../demo/session';
import { TEST_API_BASE_URL } from './constants';
import { renderApp } from './render';

/** Demo mode: the login button switches the SDK to the in-browser store (no MSW handlers needed). */
describe('demo login', () => {
  beforeEach(() => client.setConfig({ baseUrl: TEST_API_BASE_URL, fetch: switchingFetch }));
  afterEach(() => {
    setDemoMode(false);
    resetDemoStore();
  });

  it('opens the dashboard with sample data and leaves cleanly', async () => {
    const { user, router } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Try the live demo' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/dashboard'));
    expect((await screen.findAllByText('Aurora Manufacturing Pvt Ltd')).length).toBeGreaterThan(0);
    expect(screen.getByText(/exploring the demo with sample data/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exit demo' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
