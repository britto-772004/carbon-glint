import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReportMutation,
  deleteReportMutation,
  listOrgUnitsOptions,
  listReportFormatsOptions,
  listReportsOptions,
  listReportsQueryKey,
} from '@carbon-glint/sdk';
import { ReportsPage } from '../../components/reports/ReportsPage';
import { toErrorMessage } from '../../lib/errors';
import { paginate, usePagination } from '../../lib/pagination';

export function ReportsContainer() {
  const queryClient = useQueryClient();
  const formats = useQuery(listReportFormatsOptions());
  const orgUnits = useQuery(listOrgUnitsOptions());
  const reports = useQuery({
    ...listReportsOptions(),
    // poll while anything is still being generated
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === 'queued' || r.status === 'generating') ? 2000 : false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: listReportsQueryKey() });
  const create = useMutation({ ...createReportMutation(), onSuccess: refresh });
  const remove = useMutation({ ...deleteReportMutation(), onSuccess: refresh });

  const pagination = usePagination(reports.data?.length ?? 0, 5);

  return (
    <ReportsPage
      formats={formats.data ?? []}
      orgUnits={orgUnits.data ?? []}
      reports={reports.data}
      pageRows={paginate(reports.data ?? [], pagination)}
      pagination={pagination}
      isLoading={reports.isPending}
      onGenerate={(body) => create.mutate({ body })}
      isGenerating={create.isPending}
      error={toErrorMessage(create.error ?? remove.error ?? reports.error)}
      onDelete={(reportId) => remove.mutate({ path: { reportId } })}
    />
  );
}
