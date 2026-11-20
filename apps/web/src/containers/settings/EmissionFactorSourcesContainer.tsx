import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getEmissionFactorSyncStatusOptions,
  listEmissionFactorSourcesOptions,
  syncEmissionFactorsMutation,
  type EmissionFactorSyncStatus,
} from '@carbon-glint/sdk';
import { EmissionFactorSources } from '../../components/settings/EmissionFactorSources';
import { toErrorMessage } from '../../lib/errors';
import { paginate, usePagination } from '../../lib/pagination';

const WATCH_MS = 90_000;

/** Emission factor databases in use + last/next sync, with a manual "Sync now". */
export function EmissionFactorSourcesContainer() {
  const [requestedAt, setRequestedAt] = useState<number>();
  // After "Sync now" the worker runs the job in the background: poll until a newer run shows up (max 90 s).
  const waiting = (data?: EmissionFactorSyncStatus) =>
    requestedAt !== undefined &&
    Date.now() - requestedAt < WATCH_MS &&
    !(data?.lastRun && Date.parse(data.lastRun.startedAt) >= requestedAt - 60_000);

  const status = useQuery({
    ...getEmissionFactorSyncStatusOptions(),
    refetchInterval: (q) => (waiting(q.state.data) ? 2_000 : false),
  });
  const sources = useQuery({
    ...listEmissionFactorSourcesOptions(),
    refetchInterval: () => (waiting(status.data) ? 2_000 : false),
  });
  const pagination = usePagination(sources.data?.length ?? 0, 5);
  const sync = useMutation({ ...syncEmissionFactorsMutation(), onSuccess: () => setRequestedAt(Date.now()) });

  return (
    <EmissionFactorSources
      sources={sources.data ? paginate(sources.data, pagination) : undefined}
      totalSources={sources.data?.length ?? 0}
      pagination={pagination}
      status={status.data}
      isLoading={sources.isPending}
      error={toErrorMessage(sources.error ?? status.error ?? sync.error)}
      onSync={() => sync.mutate({})}
      isSyncing={sync.isPending}
    />
  );
}
