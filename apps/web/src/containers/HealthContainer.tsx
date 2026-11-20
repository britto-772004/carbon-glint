import { useQuery } from '@tanstack/react-query';
import { getHealthOptions } from '@carbon-glint/sdk';
import { HealthStatus } from '../components/HealthStatus/HealthStatus';
import { toErrorMessage } from '../lib/errors';

/**
 * Container: owns state and SDK calls only. No markup beyond rendering its component.
 */
export function HealthContainer() {
  const { data, isPending, error, refetch } = useQuery(getHealthOptions());

  return (
    <HealthStatus health={data} isLoading={isPending} error={toErrorMessage(error)} onRetry={() => void refetch()} />
  );
}
