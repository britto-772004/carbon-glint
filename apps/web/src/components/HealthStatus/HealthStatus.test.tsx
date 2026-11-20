import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { buildHealth } from '../../test/fixtures';
import { HealthStatus } from './HealthStatus';

/** Component tests: render each conditional branch from props alone. No network, no mocks. */
describe('HealthStatus', () => {
  it('renders the loading branch', () => {
    renderWithProviders(<HealthStatus isLoading onRetry={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking API');
  });

  it('renders the error branch and calls onRetry', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(<HealthStatus isLoading={false} error="boom" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('API unavailable: boom');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders the healthy branch', () => {
    renderWithProviders(<HealthStatus isLoading={false} health={buildHealth()} onRetry={() => {}} />);
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('up')).toBeInTheDocument();
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
  });

  it('renders the degraded branch', () => {
    renderWithProviders(
      <HealthStatus
        isLoading={false}
        health={buildHealth({ status: 'degraded', checks: { database: 'down' } })}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText('degraded')).toBeInTheDocument();
    expect(screen.getByText('down')).toBeInTheDocument();
  });
});
