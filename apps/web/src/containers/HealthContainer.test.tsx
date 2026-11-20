import { screen } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/mocks/server';
import { apiError } from '../test/mocks/handlers';
import { apiUrl } from '../test/constants';
import { buildHealth } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { HealthContainer } from './HealthContainer';

/**
 * Container tests: real SDK + React Query, API mocked at the network layer with MSW.
 * Assert what the user sees for each API outcome.
 */
describe('HealthContainer', () => {
  it('shows loading, then the health report from the API', async () => {
    renderWithProviders(<HealthContainer />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('shows the API error message and recovers on retry', async () => {
    server.use(
      http.get(apiUrl('/health'), () => apiError(500, { code: 'INTERNAL_ERROR', message: 'Database exploded' }), {
        once: true,
      }),
    );
    const { user } = renderWithProviders(<HealthContainer />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Database exploded');

    server.use(http.get(apiUrl('/health'), () => Response.json(buildHealth({ version: '2.0.0' }))));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('2.0.0')).toBeInTheDocument();
  });
});
