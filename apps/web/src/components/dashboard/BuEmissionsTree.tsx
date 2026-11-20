import type { OrgEmissionNode } from '@carbon-glint/sdk';
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NODE_HEIGHT, NODE_WIDTH } from '../../lib/org-tree';
import { formatCo2e } from '../emissions/format';

export type BuNodeData = { node: OrgEmissionNode; selected: boolean; onSelect: (id: string) => void };
export type BuFlowNode = Node<BuNodeData, 'bu'>;
const SCOPE_COLORS = ['#d97706', '#0f766e', '#65a30d'];

function BuNode({ data }: NodeProps<BuFlowNode>) {
  const { node, selected } = data;
  const t = node.rollup;
  return (
    <Paper
      variant="outlined"
      className="nopan nodrag"
      onClick={() => data.onSelect(node.orgUnitId)}
      sx={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        p: 1.5,
        cursor: 'pointer',
        borderRadius: 2.5,
        borderWidth: 2,
        borderColor: selected ? 'secondary.main' : 'divider',
        boxShadow: selected ? 6 : 1,
        transition: 'box-shadow 150ms ease, transform 150ms ease',
        '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' },
        background: node.parentId ? undefined : 'linear-gradient(135deg, rgba(20,184,166,0.10), rgba(101,163,13,0.06))',
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" noWrap title={node.name} sx={{ minWidth: 0 }}>
          {node.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {node.code}
        </Typography>
      </Stack>
      <Typography variant="h6" color="primary" sx={{ lineHeight: 1.3 }}>
        {formatCo2e(t.total)}
      </Typography>
      <Box
        sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover', my: 0.75 }}
        aria-label="Scope split"
      >
        {(['1', '2', '3'] as const).map((s, i) => (
          <Box key={s} sx={{ width: t.total ? `${(t[s] / t.total) * 100}%` : 0, bgcolor: SCOPE_COLORS[i] }} />
        ))}
      </Box>
      <Stack direction="row" spacing={1.25}>
        {(['1', '2', '3'] as const).map((s, i) => (
          <Stack key={s} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: SCOPE_COLORS[i] }} />
            <Typography variant="caption" color="text.secondary">
              S{s} {formatCo2e(t[s], { unit: false })}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </Paper>
  );
}
const nodeTypes = { bu: BuNode };

export interface BuEmissionsTreeProps {
  nodes: BuFlowNode[];
  edges: Edge[];
  isLoading: boolean;
  selectedName?: string;
  /** Stretch to the parent's height (dashboard hero). */
  fill?: boolean;
}

/** Business-unit tree with emissions rolled up per scope; clicking a unit filters the dashboard. */
export function BuEmissionsTree({ nodes, edges, isLoading, selectedName, fill }: BuEmissionsTreeProps) {
  return (
    <Card data-tour="dash-bu" sx={fill ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      <CardContent
        sx={
          fill
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1.5 } }
            : undefined
        }
      >
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="h6">Business units</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {selectedName
              ? `Filtered to ${selectedName} (click again to clear)`
              : 'Click a unit to filter the dashboard'}
          </Typography>
        </Stack>
        {isLoading ? (
          <Skeleton
            role="status"
            variant="rectangular"
            height={fill ? '100%' : 360}
            sx={{ flex: fill ? 1 : undefined }}
          />
        ) : (
          <Box
            sx={{
              height: fill ? undefined : 420,
              flex: fill ? 1 : undefined,
              minHeight: fill ? 0 : undefined,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.default',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
