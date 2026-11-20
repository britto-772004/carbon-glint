import type { EmissionPage } from '@carbon-glint/sdk';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { STATUS_META, formatCo2e } from './format';

export interface EmissionsTableProps {
  data?: EmissionPage;
  isLoading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onOpen: (activityId: string) => void;
}

export function EmissionsTable({ data, isLoading, page, rowsPerPage, onPageChange, onOpen }: EmissionsTableProps) {
  if (isLoading) return <Skeleton role="status" variant="rectangular" height={300} />;
  return (
    <Card>
      <TableContainer>
        <Table size="small" aria-label="Emissions by activity">
          <TableHead>
            <TableRow>
              <TableCell>Activity</TableCell>
              <TableCell>Definition</TableCell>
              <TableCell>Business unit</TableCell>
              <TableCell align="right">Measure</TableCell>
              <TableCell>Emission factor</TableCell>
              <TableCell align="right">CO₂e</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.items ?? []).map((r) => (
              <TableRow key={r.activityId} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(r.activityId)}>
                <TableCell>
                  {r.description}
                  <Typography variant="caption" color="text.secondary" component="div">
                    {r.periodStart} → {r.periodEnd}
                  </Typography>
                </TableCell>
                <TableCell>
                  {r.activityDefinitionName}
                  <Typography variant="caption" color="text.secondary" component="div">
                    Scope {r.scope} · {r.categoryName}
                  </Typography>
                </TableCell>
                <TableCell>{r.orgUnitName ?? '—'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {r.measure.toLocaleString()} {r.unit}
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  {r.factor ? (
                    <>
                      <Typography variant="body2" noWrap title={r.factor.name}>
                        {r.factor.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.factor.co2ePerUnit} kg/{r.factor.unit} · {r.factor.region}
                      </Typography>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <b>{formatCo2e(r.co2eKg)}</b>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS_META[r.status].label} color={STATUS_META[r.status].color} />
                  {r.confidence !== null && r.status !== 'overridden' && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {Math.round(r.confidence * 100)}% · {r.method}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data?.total ?? 0}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
        onPageChange={(_, p) => onPageChange(p)}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} of ${count} · total ${formatCo2e(data?.totalCo2eKg ?? 0)}`
        }
      />
    </Card>
  );
}
