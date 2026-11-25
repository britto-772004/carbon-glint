import type { FormEvent } from 'react';
import type { OrgUnit, Report, ReportFormat } from '@carbon-glint/sdk';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';
import { downloadDemoReport } from '../../demo/blobs';
import { isDemoMode } from '../../demo/session';
import { reportDownloadUrl } from '../../lib/api-urls';
import type { Pagination } from '../../lib/pagination';
import { TablePager } from '../common/TablePager';

export interface ReportsPageProps {
  formats: ReportFormat[];
  orgUnits: OrgUnit[];
  /** All reports (for the summary tiles). */
  reports?: Report[];
  /** The current page of reports shown in the table. */
  pageRows?: Report[];
  pagination: Pagination;
  isLoading: boolean;
  onGenerate: (v: { orgUnitId: string; format: string; periodStart: string; periodEnd: string }) => void;
  isGenerating: boolean;
  error?: string;
  onDelete: (id: string) => void;
}

const STATUS = { queued: 'default', generating: 'info', ready: 'success', failed: 'error' } as const;
const year = new Date().getFullYear() - 1;
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsPage(p: ReportsPageProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    p.onGenerate({
      orgUnitId: v.orgUnitId ?? '',
      format: v.format ?? '',
      periodStart: v.periodStart ?? '',
      periodEnd: v.periodEnd ?? '',
    });
  };
  const hq = p.orgUnits.find((u) => u.type === 'hq') ?? p.orgUnits[0];
  const all = p.reports ?? [];
  const ready = all.filter((r) => r.status === 'ready');
  const inProgress = all.filter((r) => r.status === 'queued' || r.status === 'generating').length;
  const latest = ready
    .map((r) => r.generatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const rows = p.pageRows ?? [];

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Reports" value={all.length} hint="generated so far" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Ready to download" value={ready.length} hint="PDF available" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat
            label="In progress"
            value={inProgress}
            hint={inProgress ? 'building in the background' : 'none queued'}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Last generated" value={latest ? when(latest).split(',')[0]! : '—'} hint={when(latest)} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <PictureAsPdfOutlined color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Generate a report
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
                The PDF is built in the background, usually in a few seconds.
              </Typography>
              <Stack spacing={1.75} component="form" onSubmit={submit} key={`${hq?.id}-${p.formats.length}`}>
                {p.error && <Alert severity="error">{p.error}</Alert>}
                <TextField
                  name="orgUnitId"
                  label="Business unit"
                  helperText="Includes its sub-units"
                  select
                  required
                  fullWidth
                  size="small"
                  defaultValue={hq?.id ?? ''}
                >
                  {p.orgUnits.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  name="format"
                  label="Country / framework"
                  select
                  required
                  fullWidth
                  size="small"
                  defaultValue={p.formats[0]?.code ?? ''}
                  slotProps={{
                    select: { renderValue: (v) => p.formats.find((f) => f.code === v)?.name ?? String(v) },
                  }}
                >
                  {p.formats.map((f) => (
                    <MenuItem key={f.code} value={f.code} sx={{ whiteSpace: 'normal' }}>
                      <Box>
                        <Typography variant="body2">{f.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {f.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    name="periodStart"
                    label="Period start"
                    type="date"
                    required
                    fullWidth
                    size="small"
                    defaultValue={`${year}-04-01`}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    name="periodEnd"
                    label="Period end"
                    type="date"
                    required
                    fullWidth
                    size="small"
                    defaultValue={`${year + 1}-03-31`}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Button type="submit" variant="contained" loading={p.isGenerating} fullWidth>
                  Generate PDF
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
          <Card>
            <Stack direction="row" sx={{ px: 2, py: 1.5, alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Report history
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Newest first
              </Typography>
            </Stack>
            {p.isLoading ? (
              <Skeleton role="status" height={160} sx={{ mx: 2, mb: 2 }} />
            ) : all.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3, pt: 1 }}>
                No reports yet. Choose a business unit and framework, then generate your first PDF.
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" aria-label="Reports">
                    <TableHead>
                      <TableRow>
                        <TableCell>Format</TableCell>
                        <TableCell>Business unit</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Generated</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{r.formatName}</TableCell>
                          <TableCell>{r.orgUnitName}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {r.periodStart} → {r.periodEnd}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }} color="text.secondary">
                            {when(r.generatedAt ?? r.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.status}
                              color={STATUS[r.status]}
                              variant={r.status === 'ready' ? 'filled' : 'outlined'}
                              title={r.error ?? undefined}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {r.status === 'ready' && (
                              <Button
                                size="small"
                                variant="outlined"
                                href={reportDownloadUrl(r.id)}
                                onClick={(e) => {
                                  if (!isDemoMode()) return;
                                  e.preventDefault();
                                  void downloadDemoReport(
                                    r.id,
                                    `${r.formatName} - ${r.orgUnitName}.pdf`.replace(/[\\/:*?"<>|]/g, '-'),
                                  );
                                }}
                                startIcon={<DownloadRounded fontSize="small" />}
                              >
                                Download PDF
                              </Button>
                            )}
                            <Tooltip title="Delete report">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Delete ${r.formatName} report`}
                                onClick={() => p.onDelete(r.id)}
                              >
                                <DeleteOutline fontSize="small" />
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
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
