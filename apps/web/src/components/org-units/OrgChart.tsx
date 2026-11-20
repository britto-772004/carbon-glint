import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, type NodeChangeset } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box';
import { OrgUnitNode, type OrgUnitFlowNode } from './OrgUnitNode';

const nodeTypes = { orgUnit: OrgUnitNode };

export interface OrgChartProps {
  nodes: OrgUnitFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChangeset<OrgUnitFlowNode>) => void;
  onNodeDrag: (node: Node) => void;
  onNodeDragStop: (node: Node) => void;
}

/** Controlled React Flow canvas: positions and drag handling live in the container. */
export function OrgChart({ nodes, edges, onNodesChange, onNodeDrag, onNodeDragStop }: OrgChartProps) {
  return (
    <Box
      sx={{
        height: { xs: 520, md: 640 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDrag={(_, node) => onNodeDrag(node)}
        onNodeDragStop={(_, node) => onNodeDragStop(node)}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </Box>
  );
}
