import type { Health } from '@carbon-glint/sdk';

export interface HealthStatusProps {
  health?: Health;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}

/**
 * Component: props in, markup out. Only conditional rendering — no state, effects or API calls.
 */
export function HealthStatus({ health, isLoading, error, onRetry }: HealthStatusProps) {
  if (isLoading) return <p role="status">Checking API…</p>;

  if (error || !health) {
    return (
      <div role="alert" className="health health--error">
        <p>API unavailable: {error ?? 'unknown error'}</p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <dl className={`health health--${health.status}`}>
      <dt>Status</dt>
      <dd>{health.status}</dd>
      <dt>Database</dt>
      <dd>{health.checks.database}</dd>
      <dt>Version</dt>
      <dd>{health.version}</dd>
    </dl>
  );
}
