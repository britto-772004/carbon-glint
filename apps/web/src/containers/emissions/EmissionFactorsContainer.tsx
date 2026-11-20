import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmissionTraceOptions,
  getEmissionsHeatmapOptions,
  listActivityDefinitionsOptions,
  listEmissionFactorSourcesOptions,
  listEmissionsOptions,
  listOrgUnitsOptions,
  overrideEmissionMutation,
  revertEmissionOverrideMutation,
  searchEmissionFactorsOptions,
} from '@carbon-glint/sdk';
import { EmissionFactorsPage } from '../../components/emissions/EmissionFactorsPage';
import { EmissionFiltersBar, type EmissionFilterValues } from '../../components/emissions/EmissionFiltersBar';
import { EmissionsTable } from '../../components/emissions/EmissionsTable';
import { LasagneHeatmap } from '../../components/emissions/LasagneHeatmap';
import { OverrideDialog, type OverrideType } from '../../components/emissions/OverrideDialog';
import { TraceDrawer } from '../../components/emissions/TraceDrawer';
import {
  breadcrumbOf,
  canDrill,
  compact,
  currentGroupBy,
  drillFilters,
  type DrillStep,
  type GroupMode,
} from '../../lib/drill';
import { toErrorMessage } from '../../lib/errors';

const PAGE = 50;
const EMISSION_QUERIES = new Set([
  'listEmissions',
  'getEmissionsHeatmap',
  'getEmissionsSummary',
  'getEmissionsOrgTree',
  'getEmissionTrace',
]);

export function EmissionFactorsContainer() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EmissionFilterValues>({});
  const [view, setView] = useState<'heatmap' | 'table'>('heatmap');
  const [mode, setMode] = useState<GroupMode>('ghg');
  const [path, setPath] = useState<DrillStep[]>([]);
  const [bucket, setBucket] = useState<'month' | 'quarter' | 'year'>('month');
  const [showTable, setShowTable] = useState(false);
  const [page, setPage] = useState(0);
  const [traceId, setTraceId] = useState<string>();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<OverrideType>('factor');
  const [factorQuery, setFactorQuery] = useState('');
  const [selectedFactorId, setSelectedFactorId] = useState<string>();

  const effective = compact(drillFilters(filters, path));
  const groupBy = currentGroupBy(mode, path);

  const sources = useQuery(listEmissionFactorSourcesOptions());
  const definitions = useQuery(listActivityDefinitionsOptions());
  const orgUnits = useQuery(listOrgUnitsOptions());
  const heatmap = useQuery({
    ...getEmissionsHeatmapOptions({ query: { ...effective, groupBy, bucket } }),
    placeholderData: keepPreviousData,
  });
  const table = useQuery({
    ...listEmissionsOptions({ query: { ...compact(filters), limit: PAGE, offset: page * PAGE } }),
    enabled: view === 'table',
  });
  const trace = useQuery({
    ...getEmissionTraceOptions({ path: { activityId: traceId ?? '' } }),
    enabled: Boolean(traceId),
  });
  const row = trace.data?.row;
  const hits = useQuery({
    ...searchEmissionFactorsOptions({ query: { q: factorQuery, unit: row?.unit, limit: 25 } }),
    enabled: overrideOpen && factorQuery.length > 0 && Boolean(row),
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      predicate: (q) => EMISSION_QUERIES.has((q.queryKey[0] as { _id?: string })?._id ?? ''),
    });
  const override = useMutation({
    ...overrideEmissionMutation(),
    onSuccess: () => {
      setOverrideOpen(false);
      void refresh();
    },
  });
  const revert = useMutation({ ...revertEmissionOverrideMutation(), onSuccess: () => void refresh() });

  const changeFilters = (patch: Partial<EmissionFilterValues>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPath([]);
    setPage(0);
  };

  return (
    <EmissionFactorsPage
      sources={sources.data ?? []}
      error={toErrorMessage(heatmap.error ?? table.error)}
      filters={
        <EmissionFiltersBar
          values={filters}
          onChange={changeFilters}
          onReset={() =>
            changeFilters({
              scope: undefined,
              activityDefinitionId: undefined,
              orgUnitId: undefined,
              status: undefined,
              from: undefined,
              to: undefined,
            })
          }
          definitions={definitions.data ?? []}
          orgUnits={orgUnits.data ?? []}
        />
      }
      view={view}
      onView={setView}
      heatmap={
        <LasagneHeatmap
          title="Emissions over time"
          data={heatmap.data}
          isLoading={heatmap.isPending}
          breadcrumb={breadcrumbOf(mode, path)}
          onBreadcrumb={(i) => setPath(path.slice(0, i))}
          onDrill={(key, label) =>
            canDrill(mode, path) ? setPath([...path, { groupBy, key, label }]) : setTraceId(key)
          }
          groupMode={mode}
          onGroupMode={(m) => {
            setMode(m);
            setPath([]);
          }}
          bucket={bucket}
          onBucket={setBucket}
          showTable={showTable}
          onToggleTable={() => setShowTable(!showTable)}
        />
      }
      table={
        <EmissionsTable
          data={table.data}
          isLoading={table.isPending}
          page={page}
          rowsPerPage={PAGE}
          onPageChange={setPage}
          onOpen={setTraceId}
        />
      }
      drawer={
        <TraceDrawer
          open={Boolean(traceId)}
          onClose={() => setTraceId(undefined)}
          data={trace.data}
          isLoading={trace.isPending && Boolean(traceId)}
          error={toErrorMessage(trace.error ?? revert.error)}
          onOverride={() => {
            override.reset();
            setSelectedFactorId(undefined);
            setFactorQuery(row?.description ?? '');
            setOverrideOpen(true);
          }}
          onRevert={() => traceId && revert.mutate({ path: { activityId: traceId } })}
          isReverting={revert.isPending}
        />
      }
      dialog={
        <OverrideDialog
          open={overrideOpen}
          activityLabel={row ? `${row.description} — ${row.measure.toLocaleString()} ${row.unit}` : ''}
          activityUnit={row?.unit ?? ''}
          type={overrideType}
          onTypeChange={setOverrideType}
          onSearch={setFactorQuery}
          hits={hits.data}
          isSearching={hits.isFetching}
          selectedFactorId={selectedFactorId}
          onSelectFactor={setSelectedFactorId}
          onClose={() => setOverrideOpen(false)}
          onSubmit={(v) =>
            traceId &&
            override.mutate({
              path: { activityId: traceId },
              body:
                overrideType === 'factor'
                  ? { type: 'factor', factorId: selectedFactorId, reason: v.reason }
                  : { type: overrideType, ...v },
            })
          }
          isSubmitting={override.isPending}
          error={toErrorMessage(override.error)}
        />
      }
    />
  );
}
