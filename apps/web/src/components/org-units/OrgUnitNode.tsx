import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { OrgUnitTypeIcon } from './OrgUnitTypeIcon';
import type { OrgUnit } from '@carbon-glint/sdk';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { countryName } from '../../lib/countries';
import { NODE_HEIGHT, NODE_WIDTH } from '../../lib/org-tree';
import { typeMeta, type OrgUnitActions } from './types';

export type OrgUnitNodeData = { unit: OrgUnit; isDropTarget: boolean } & OrgUnitActions;
export type OrgUnitFlowNode = Node<OrgUnitNodeData, 'orgUnit'>;

/** Card rendered for each unit inside React Flow. */
export function OrgUnitNode({ data }: NodeProps<OrgUnitFlowNode>) {
  const { unit } = data;
  const meta = typeMeta(unit.type);
  const location = [unit.city, countryName(unit.country)].filter(Boolean).join(', ');
  return (
    <Paper
      variant="outlined"
      sx={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        p: 1.5,
        borderWidth: 2,
        borderColor: data.isDropTarget ? 'secondary.main' : unit.type === 'hq' ? 'primary.main' : 'divider',
        opacity: unit.active ? 1 : 0.55,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: unit.type === 'hq' ? 'primary.main' : 'action.hover',
            color: unit.type === 'hq' ? 'primary.contrastText' : 'primary.main',
            flexShrink: 0,
          }}
        >
          <OrgUnitTypeIcon type={unit.type} fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap title={unit.name}>
            {unit.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {location || meta.label}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Chip size="small" label={unit.code} variant="outlined" />
        {!unit.active && <Chip size="small" label="Inactive" />}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Add sub-unit">
          <IconButton
            size="small"
            aria-label={`Add sub-unit to ${unit.name}`}
            className="nodrag"
            onClick={() => data.onAddChild(unit)}
          >
            <AddRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            aria-label={`Edit ${unit.name}`}
            className="nodrag"
            onClick={() => data.onEdit(unit)}
          >
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        {unit.type !== 'hq' && (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              aria-label={`Delete ${unit.name}`}
              className="nodrag"
              onClick={() => data.onDelete(unit)}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </Paper>
  );
}
