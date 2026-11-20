import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthStatus } from './HealthStatus';

const health = { status: 'ok', version: '0.1.0', uptimeSeconds: 1, checks: { database: 'up' } } as const;

describe('HealthStatus', () => {
  it('renders loading state', () => {
    render(<HealthStatus isLoading onRetry={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking API');
  });

  it('renders error state and retries', () => {
    const onRetry = vi.fn();
    render(<HealthStatus isLoading={false} error="boom" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders health details', () => {
    render(<HealthStatus isLoading={false} health={health} onRetry={() => {}} />);
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('up')).toBeInTheDocument();
  });
});
