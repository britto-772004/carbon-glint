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
        borderWidth: 2,
        borderColor: selected ? 'secondary.main' : 'divider',
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Typography variant="subtitle2" noWrap>
        {node.name}
      </Typography>
      <Typography variant="h6">{formatCo2e(t.total)}</Typography>
      <Box
        sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover', my: 0.5 }}
        aria-label="Scope split"
      >
        {(['1', '2', '3'] as const).map((s, i) => (
          <Box key={s} sx={{ width: t.total ? `${(t[s] / t.total) * 100}%` : 0, bgcolor: SCOPE_COLORS[i] }} />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        S1 {formatCo2e(t['1'], { unit: false })} · S2 {formatCo2e(t['2'], { unit: false })} · S3{' '}
        {formatCo2e(t['3'], { unit: false })}
      </Typography>
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
}

/** Business-unit tree with emissions rolled up per scope; clicking a unit filters the dashboard. */
export function BuEmissionsTree({ nodes, edges, isLoading, selectedName }: BuEmissionsTreeProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Business units</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedName
              ? `Filtered to ${selectedName} (click again to clear)`
              : 'Click a unit to filter the dashboard'}
          </Typography>
        </Stack>
        {isLoading ? (
          <Skeleton role="status" variant="rectangular" height={360} />
        ) : (
          <Box sx={{ height: 420, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
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
