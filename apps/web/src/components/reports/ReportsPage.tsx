import type { FormEvent } from 'react';
import type { OrgUnit, Report, ReportFormat } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import ListItemText from '@mui/material/ListItemText';
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
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';
import { reportDownloadUrl } from '../../lib/api-urls';

export interface ReportsPageProps {
  formats: ReportFormat[];
  orgUnits: OrgUnit[];
  reports?: Report[];
  isLoading: boolean;
  onGenerate: (v: { orgUnitId: string; format: string; periodStart: string; periodEnd: string }) => void;
  isGenerating: boolean;
  error?: string;
  onDelete: (id: string) => void;
}

const STATUS = { queued: 'default', generating: 'info', ready: 'success', failed: 'error' } as const;
const year = new Date().getFullYear() - 1;

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
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h1">
          Reports
        </Typography>
        <Typography color="text.secondary">
          Export an ESG / GHG report for a business unit in your country's format.
        </Typography>
      </div>
      <Card>
        <CardHeader title="Generate a report" subheader="The PDF is built in the background — usually a few seconds." />
        <CardContent>
          <Grid container spacing={2} component="form" onSubmit={submit} key={`${hq?.id}-${p.formats.length}`}>
            {p.error && (
              <Grid size={12}>
                <Alert severity="error">{p.error}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="orgUnitId"
                label="Business unit (includes sub-units)"
                select
                required
                fullWidth
                defaultValue={hq?.id ?? ''}
              >
                {p.orgUnits.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                name="format"
                label="Country / framework format"
                select
                required
                fullWidth
                defaultValue={p.formats[0]?.code ?? ''}
              >
                {p.formats.map((f) => (
                  <MenuItem key={f.code} value={f.code}>
                    <ListItemText primary={f.name} secondary={f.description} />
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                name="periodStart"
                label="Period start"
                type="date"
                required
                fullWidth
                defaultValue={`${year}-04-01`}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                name="periodEnd"
                label="Period end"
                type="date"
                required
                fullWidth
                defaultValue={`${year + 1}-03-31`}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button type="submit" variant="contained" size="large" loading={p.isGenerating}>
                Generate PDF
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Report history" />
        {p.isLoading ? (
          <Skeleton role="status" height={160} sx={{ m: 2 }} />
        ) : (p.reports ?? []).length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            No reports yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Reports">
              <TableHead>
                <TableRow>
                  <TableCell>Format</TableCell>
                  <TableCell>Business unit</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.reports!.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.formatName}</TableCell>
                    <TableCell>{r.orgUnitName}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {r.periodStart} → {r.periodEnd}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={STATUS[r.status]} title={r.error ?? undefined} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'ready' && (
                        <Button size="small" variant="outlined" href={reportDownloadUrl(r.id)}>
                          Download PDF
                        </Button>
                      )}
                      <Button size="small" color="error" onClick={() => p.onDelete(r.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
