import type { OrgUnit } from '@carbon-glint/sdk';
import type { Edge, Node, NodeChangeset } from '@xyflow/react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { TreeRow } from '../../lib/org-tree';
import { OrgChart } from './OrgChart';
import { OrgUnitDialog, type OrgUnitDialogProps } from './OrgUnitDialog';
import type { OrgUnitFlowNode } from './OrgUnitNode';
import { OrgUnitTable } from './OrgUnitTable';
import type { OrgUnitActions } from './types';

export type OrgView = 'chart' | 'table';

export interface OrgUnitsPageProps extends OrgUnitActions {
  isLoading: boolean;
  error?: string;
  notice?: string;
  view: OrgView;
  onViewChange: (view: OrgView) => void;
  onAddRoot: () => void;
  unitCount: number;
  rows: TreeRow[];
  nodes: OrgUnitFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChangeset<OrgUnitFlowNode>) => void;
  onNodeDrag: (node: Node) => void;
  onNodeDragStop: (node: Node) => void;
  dialog: OrgUnitDialogProps;
  deleteTarget?: OrgUnit;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function OrgUnitsPage(props: OrgUnitsPageProps) {
  const { isLoading, error, view, unitCount } = props;
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="body2" color="text.secondary">
          {unitCount} business unit{unitCount === 1 ? '' : 's'} · drag a unit onto another to move it under it
        </Typography>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v: OrgView | null) => v && props.onViewChange(v)}
          >
            <ToggleButton value="chart">Chart</ToggleButton>
            <ToggleButton value="table">Table</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={props.onAddRoot} data-tour="org-add">
            Add unit
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {props.notice && <Alert severity="success">{props.notice}</Alert>}

      {isLoading ? (
        <Skeleton role="status" variant="rectangular" height={480} />
      ) : view === 'chart' ? (
        <OrgChart
          nodes={props.nodes}
          edges={props.edges}
          onNodesChange={props.onNodesChange}
          onNodeDrag={props.onNodeDrag}
          onNodeDragStop={props.onNodeDragStop}
        />
      ) : (
        <OrgUnitTable rows={props.rows} onAddChild={props.onAddChild} onEdit={props.onEdit} onDelete={props.onDelete} />
      )}

      <OrgUnitDialog {...props.dialog} />

      <Dialog open={Boolean(props.deleteTarget)} onClose={props.onCancelDelete}>
        <DialogTitle>Delete {props.deleteTarget?.name}?</DialogTitle>
        <DialogContent>
          <Typography>This can't be undone. Units with sub-units must be emptied first.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onCancelDelete}>Cancel</Button>
          <Button color="error" variant="contained" loading={props.isDeleting} onClick={props.onConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
