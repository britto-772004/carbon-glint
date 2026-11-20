import type { EmissionFactorSource, EmissionFactorSyncStatus } from '@carbon-glint/sdk';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Pagination } from '../../lib/pagination';
import { intervalLabel } from '../../lib/interval-label';
import { TablePager } from '../common/TablePager';

export interface EmissionFactorSourcesProps {
  /** The current page of sources. */
  sources?: EmissionFactorSource[];
  totalSources: number;
  pagination: Pagination;
  status?: EmissionFactorSyncStatus;
  isLoading: boolean;
  error?: string;
  onSync: () => void;
  isSyncing: boolean;
}

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Which factor databases the calculations use, and when the library was last checked for new editions. */
export function EmissionFactorSources(p: EmissionFactorSourcesProps) {
  const last = p.status?.lastRun;
  return (
    <Card data-tour="settings-factors">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
        >
          <div>
            <Typography variant="h6" component="h2">
              Emission factor databases
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Public factor libraries used to calculate CO₂e. New editions are imported automatically; existing ones are
              never overwritten.
            </Typography>
          </div>
          <Button
            variant="outlined"
            startIcon={<SyncRounded />}
            onClick={p.onSync}
            loading={p.isSyncing}
            sx={{ flexShrink: 0 }}
          >
            Sync now
          </Button>
        </Stack>

        {p.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {p.error}
          </Alert>
        )}

        {p.status && (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1, md: 4 }}
            sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
          >
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Last sync
              </Typography>
              {last ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {last.status === 'ok' ? (
                    <CheckCircleOutlined fontSize="small" color="success" />
                  ) : (
                    <ErrorOutlined fontSize="small" color="error" />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {when(last.finishedAt ?? last.startedAt)}
                  </Typography>
                  <Chip size="small" label={last.trigger === 'manual' ? 'manual' : 'scheduled'} variant="outlined" />
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Not run yet
                </Typography>
              )}
              {last?.message && (
                <Typography variant="caption" color={last.status === 'failed' ? 'error' : 'text.secondary'}>
                  {last.message}
                </Typography>
              )}
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Next automatic check
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {p.status.nextRunAt ? when(p.status.nextRunAt) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {intervalLabel(p.status.intervalHours)}
              </Typography>
            </Stack>
          </Stack>
        )}

        {p.isLoading ? (
          <Skeleton role="status" variant="rectangular" height={120} />
        ) : p.totalSources === 0 ? (
          <Typography color="text.secondary">
            No factor databases are loaded yet. Use “Sync now” to fetch the latest published edition.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Emission factor databases">
                <TableHead>
                  <TableRow>
                    <TableCell>Database</TableCell>
                    <TableCell>Publisher</TableCell>
                    <TableCell>Edition</TableCell>
                    <TableCell align="right">Factors</TableCell>
                    <TableCell>Licence</TableCell>
                    <TableCell>Loaded</TableCell>
                    <TableCell align="right">Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(p.sources ?? []).map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.publisher}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {s.version} · {s.year}
                      </TableCell>
                      <TableCell align="right">{s.factorCount.toLocaleString()}</TableCell>
                      <TableCell>{s.licence}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(s.importedAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={`Open ${s.publisher} publication`}>
                          <IconButton
                            size="small"
                            component="a"
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${s.name} source`}
                          >
                            <OpenInNewRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePager {...p.pagination} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
