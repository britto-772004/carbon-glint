import type { ReactNode } from 'react';
import type { ActivityDefinitionDetail, ActivityPage, OrgUnit } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { scopeMeta } from './scope';

export interface ActivityDefinitionDetailPageProps {
  detail?: ActivityDefinitionDetail;
  isLoading: boolean;
  error?: string;
  orgUnits: OrgUnit[];
  activities?: ActivityPage;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  /** Recalculate (published definitions): dialog with an option to reset manual overrides. */
  recalcOpen: boolean;
  onOpenRecalc: () => void;
  onCloseRecalc: () => void;
  resetOverrides: boolean;
  onToggleResetOverrides: (v: boolean) => void;
  onRecalculate: () => void;
  isRecalculating: boolean;
  /** Row selection + bulk delete. */
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectPage: () => void;
  deleteOpen: boolean;
  onOpenDelete: () => void;
  onCloseDelete: () => void;
  onDeleteSelected: () => void;
  isDeleting: boolean;
  actionError?: string;
  notice?: string;
  /** Delete the whole definition (with confirmation). */
  deleteDefinitionOpen: boolean;
  onOpenDeleteDefinition: () => void;
  onCloseDeleteDefinition: () => void;
  onDelete: () => void;
  isDeletingDefinition: boolean;
  onAddDataSource: () => void;
  onDeleteDataSource: (id: string) => void;
  wizard: ReactNode;
}

const DS_COLOR = { uploaded: 'default', importing: 'info', imported: 'success', failed: 'error' } as const;

export function ActivityDefinitionDetailPage(p: ActivityDefinitionDetailPageProps) {
  if (p.isLoading) return <Skeleton role="status" variant="rectangular" height={400} />;
  if (p.error || !p.detail) return <Alert severity="error">{p.error ?? 'Not found'}</Alert>;
  const { definition: d, dataSources } = p.detail;
  const unitName = (id: string | null) => p.orgUnits.find((u) => u.id === id)?.name ?? '—';
  const scope = scopeMeta(d.scope);
  const pageItems = p.activities?.items ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Stack spacing={1}>
          <Button onClick={p.onBack} sx={{ alignSelf: 'flex-start' }}>
            ← Activity Definitions
          </Button>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h4" component="h2">
              {d.name}
            </Typography>
            <Chip label={d.status} color={d.status === 'published' ? 'success' : 'default'} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" variant="outlined" color={scope.color} label={scope.short} />
            <Chip size="small" variant="outlined" label={d.category.name} />
            <Chip size="small" variant="outlined" label={`${d.periodStart} → ${d.periodEnd}`} />
            {d.defaultOrgUnitId && (
              <Chip size="small" variant="outlined" label={`Default BU: ${unitName(d.defaultOrgUnitId)}`} />
            )}
          </Stack>
          {d.description && <Typography color="text.secondary">{d.description}</Typography>}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Button color="error" onClick={p.onOpenDeleteDefinition}>
            Delete
          </Button>
          <Button variant="outlined" onClick={p.onAddDataSource}>
            Add data source
          </Button>
          {d.status === 'published' ? (
            <Button variant="contained" onClick={p.onOpenRecalc} loading={p.isRecalculating}>
              Recalculate
            </Button>
          ) : (
            <Button variant="contained" onClick={p.onPublish} loading={p.isPublishing} disabled={d.activityCount === 0}>
              Publish
            </Button>
          )}
        </Stack>
      </Stack>

      {p.actionError && <Alert severity="error">{p.actionError}</Alert>}
      {p.notice && <Alert severity="success">{p.notice}</Alert>}

      <Card>
        <CardHeader
          title="Data sources"
          subheader={`${dataSources.length} uploaded · ${d.activityCount.toLocaleString()} activities`}
        />
        {dataSources.length === 0 ? (
          <Stack spacing={1} sx={{ p: 4, alignItems: 'center' }}>
            <Typography color="text.secondary">Upload a CSV or Excel sheet with one row per activity.</Typography>
            <Button variant="contained" onClick={p.onAddDataSource}>
              Upload source sheet
            </Button>
          </Stack>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Data sources">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Mapping</TableCell>
                  <TableCell align="right">Rows</TableCell>
                  <TableCell align="right">Imported</TableCell>
                  <TableCell align="right">Errors</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {dataSources.map((ds) => (
                  <TableRow key={ds.id}>
                    <TableCell>
                      {ds.fileName}
                      {ds.sheetName && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}
                          · {ds.sheetName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {ds.mappingMode === 'ai' ? 'AI' : ds.mappingMode === 'manual' ? 'Manual' : '—'}
                    </TableCell>
                    <TableCell align="right">{ds.rowCount.toLocaleString()}</TableCell>
                    <TableCell align="right">{ds.importedCount.toLocaleString()}</TableCell>
                    <TableCell align="right">{ds.errorCount}</TableCell>
                    <TableCell>
                      <Chip size="small" label={ds.status} color={DS_COLOR[ds.status]} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" color="error" onClick={() => p.onDeleteDataSource(ds.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Activities"
          subheader={
            p.selectedIds.length > 0
              ? `${p.selectedIds.length} selected`
              : 'Select rows to delete them, then recalculate to refresh emissions.'
          }
          action={
            p.selectedIds.length > 0 && (
              <Button color="error" variant="outlined" size="small" onClick={p.onOpenDelete} sx={{ mt: 1, mr: 1 }}>
                Delete selected ({p.selectedIds.length})
              </Button>
            )
          }
        />
        <TableContainer>
          <Table size="small" aria-label="Activities">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={pageItems.length > 0 && pageItems.every((a) => p.selectedIds.includes(a.id))}
                    indeterminate={
                      pageItems.some((a) => p.selectedIds.includes(a.id)) &&
                      !pageItems.every((a) => p.selectedIds.includes(a.id))
                    }
                    onChange={p.onToggleSelectPage}
                    slotProps={{ input: { 'aria-label': 'Select all activities on this page' } }}
                  />
                </TableCell>
                <TableCell>Row</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Business unit</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Measure</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Period</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((a) => (
                <TableRow key={a.id} selected={p.selectedIds.includes(a.id)} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={p.selectedIds.includes(a.id)}
                      onChange={() => p.onToggleSelect(a.id)}
                      slotProps={{ input: { 'aria-label': `Select row ${a.rowNumber}` } }}
                    />
                  </TableCell>
                  <TableCell>{a.rowNumber}</TableCell>
                  <TableCell>{a.description}</TableCell>
                  <TableCell>{unitName(a.orgUnitId)}</TableCell>
                  <TableCell>{a.location ?? '—'}</TableCell>
                  <TableCell align="right">{a.measure.toLocaleString()}</TableCell>
                  <TableCell>{a.unit}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {a.periodStart} → {a.periodEnd}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={p.activities?.total ?? 0}
          page={p.page}
          rowsPerPage={p.rowsPerPage}
          rowsPerPageOptions={[p.rowsPerPage]}
          onPageChange={(_, page) => p.onPageChange(page)}
        />
      </Card>
      {p.wizard}

      <Dialog open={p.deleteDefinitionOpen} onClose={p.onCloseDeleteDefinition} maxWidth="xs" fullWidth>
        <DialogTitle>Delete “{d.name}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently removes the definition, its {d.dataSourceCount} data source
            {d.dataSourceCount === 1 ? '' : 's'} and {d.activityCount.toLocaleString()} activities
            {d.status === 'published' ? ', and its calculated emissions disappear from the dashboard and reports' : ''}.
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={p.onCloseDeleteDefinition}>Cancel</Button>
          <Button color="error" variant="contained" onClick={p.onDelete} loading={p.isDeletingDefinition}>
            Delete definition
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={p.deleteOpen} onClose={p.onCloseDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {p.selectedIds.length} activities?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The rows and their calculated emissions (including any overrides) are removed permanently.
            {d.status === 'published' && ' Recalculate afterwards to refresh the definition.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={p.onCloseDelete}>Cancel</Button>
          <Button color="error" variant="contained" onClick={p.onDeleteSelected} loading={p.isDeleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={p.recalcOpen} onClose={p.onCloseRecalc} maxWidth="xs" fullWidth>
        <DialogTitle>Recalculate emissions</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Re-runs emission factor matching and the CO2e calculation for all {d.activityCount.toLocaleString()}{' '}
            activities of this definition.
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox checked={p.resetOverrides} onChange={(e) => p.onToggleResetOverrides(e.target.checked)} />
            }
            label="Also reset manual overrides"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={p.onCloseRecalc}>Cancel</Button>
          <Button variant="contained" onClick={p.onRecalculate} loading={p.isRecalculating}>
            Recalculate
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
