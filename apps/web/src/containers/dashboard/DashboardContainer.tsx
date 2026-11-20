import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getEmissionTraceOptions,
  getEmissionsHeatmapOptions,
  getEmissionsOrgTreeOptions,
  getEmissionsSummaryOptions,
  listActivityDefinitionsOptions,
  listOrgUnitsOptions,
} from '@carbon-glint/sdk';
import type { Edge, NodeChangeset } from '@xyflow/react';
import { BuEmissionsTree, type BuFlowNode } from '../../components/dashboard/BuEmissionsTree';
import { DashboardPage } from '../../components/dashboard/DashboardPage';
import { KpiCards } from '../../components/dashboard/KpiCards';
import { ScopeTrendChart } from '../../components/dashboard/ScopeTrendChart';
import { TopActivities } from '../../components/dashboard/TopActivities';
import { EmissionFiltersBar, type EmissionFilterValues } from '../../components/emissions/EmissionFiltersBar';
import { LasagneHeatmap } from '../../components/emissions/LasagneHeatmap';
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
import { layoutTree } from '../../lib/org-tree';

export function DashboardContainer() {
  const [filters, setFilters] = useState<EmissionFilterValues>({});
  const [mode, setMode] = useState<GroupMode>('ghg');
  const [path, setPath] = useState<DrillStep[]>([]);
  const [bucket, setBucket] = useState<'month' | 'quarter' | 'year'>('month');
  const [showTable, setShowTable] = useState(false);
  const [traceId, setTraceId] = useState<string>();

  const base = compact(filters);
  const groupBy = currentGroupBy(mode, path);
  const definitions = useQuery(listActivityDefinitionsOptions());
  const orgUnits = useQuery(listOrgUnitsOptions());
  const summary = useQuery({ ...getEmissionsSummaryOptions({ query: base }), placeholderData: keepPreviousData });
  const lasagne = useQuery({
    ...getEmissionsHeatmapOptions({ query: { ...compact(drillFilters(filters, path)), groupBy, bucket } }),
    placeholderData: keepPreviousData,
  });
  const trend = useQuery(getEmissionsHeatmapOptions({ query: { ...base, groupBy: 'scope', bucket: 'month' } }));
  const top = useQuery(getEmissionsHeatmapOptions({ query: { ...base, groupBy: 'activity', bucket: 'year' } }));
  const tree = useQuery(getEmissionsOrgTreeOptions({ query: { ...base, orgUnitId: undefined } }));
  const trace = useQuery({
    ...getEmissionTraceOptions({ path: { activityId: traceId ?? '' } }),
    enabled: Boolean(traceId),
  });

  const change = (patch: Partial<EmissionFilterValues>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPath([]);
  };

  // Auto-layout (top → bottom) for the tree; cards the user dragged keep their position afterwards.
  const { baseNodes, edges } = useMemo(() => {
    const list = tree.data ?? [];
    const pos = layoutTree(
      list.map((n) => ({
        id: n.orgUnitId,
        parentId: n.parentId,
        name: n.name,
        code: n.code,
        type: 'branch',
        country: null,
        city: null,
        address: null,
        active: true,
        createdAt: '',
      })),
      'TB',
    );
    const ns: BuFlowNode[] = list.map((n) => ({
      id: n.orgUnitId,
      type: 'bu',
      position: pos[n.orgUnitId] ?? { x: 0, y: 0 },
      data: {
        node: n,
        selected: filters.orgUnitId === n.orgUnitId,
        onSelect: (id: string) => change({ orgUnitId: filters.orgUnitId === id ? undefined : id }),
      },
    }));
    const es: Edge[] = list
      .filter((n) => n.parentId)
      .map((n) => ({
        id: `${n.parentId}-${n.orgUnitId}`,
        source: n.parentId!,
        target: n.orgUnitId,
        type: 'smoothstep',
      }));
    return { baseNodes: ns, edges: es };
  }, [tree.data, filters.orgUnitId]);

  // Node state lives here so React Flow can move cards; refreshed data/selection keeps their dragged positions.
  const [nodes, setNodes] = useState<BuFlowNode[]>([]);
  const [syncedFrom, setSyncedFrom] = useState<BuFlowNode[]>();
  if (syncedFrom !== baseNodes) {
    setSyncedFrom(baseNodes);
    setNodes((prev) =>
      baseNodes.map((b) => {
        const existing = prev.find((n) => n.id === b.id);
        return existing ? { ...existing, data: b.data } : b;
      }),
    );
  }

  return (
    <DashboardPage
      filters={
        <EmissionFiltersBar
          values={filters}
          onChange={change}
          onReset={() =>
            change({
              scope: undefined,
              activityDefinitionId: undefined,
              orgUnitId: undefined,
              from: undefined,
              to: undefined,
            })
          }
          definitions={definitions.data ?? []}
          orgUnits={orgUnits.data ?? []}
          showStatus={false}
        />
      }
      kpis={<KpiCards data={summary.data} isLoading={summary.isPending} />}
      lasagne={
        <LasagneHeatmap
          title="Lasagne view"
          data={lasagne.data}
          isLoading={lasagne.isPending}
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
          fill
        />
      }
      trend={<ScopeTrendChart data={trend.data} isLoading={trend.isPending} />}
      top={<TopActivities data={top.data} isLoading={top.isPending} onOpen={setTraceId} />}
      tree={
        <BuEmissionsTree
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes: NodeChangeset<BuFlowNode>) => setNodes((ns) => changes.applyTo(ns))}
          isLoading={tree.isPending}
          selectedName={tree.data?.find((n) => n.orgUnitId === filters.orgUnitId)?.name}
          fill
        />
      }
      drawer={
        <TraceDrawer
          open={Boolean(traceId)}
          onClose={() => setTraceId(undefined)}
          data={trace.data}
          isLoading={trace.isPending && Boolean(traceId)}
          onOverride={() => setTraceId(undefined)}
          onRevert={() => setTraceId(undefined)}
          isReverting={false}
        />
      }
    />
  );
}
