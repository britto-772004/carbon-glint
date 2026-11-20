import type { ActivityDefinition, Scope } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { SCOPES, scopeMeta } from './scope';

export interface ActivityDefinitionsPageProps {
  definitions?: ActivityDefinition[];
  isLoading: boolean;
  error?: string;
  scopeFilter: Scope | 'all';
  onScopeFilter: (s: Scope | 'all') => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  dialog: ReactNode;
}

const STATUS_COLOR = { draft: 'default', published: 'success', archived: 'warning' } as const;

export function ActivityDefinitionsPage(props: ActivityDefinitionsPageProps) {
  const { definitions, isLoading, error } = props;
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <div>
          <Typography variant="h4" component="h1">
            Activity Definitions
          </Typography>
          <Typography color="text.secondary">
            Classify emission sources by scope and GHG category, then upload their data.
          </Typography>
        </div>
        <Button variant="contained" onClick={props.onCreate}>
          New activity definition
        </Button>
      </Stack>
      <Tabs value={props.scopeFilter} onChange={(_, v: Scope | 'all') => props.onScopeFilter(v)}>
        <Tab value="all" label="All scopes" />
        {SCOPES.map((s) => (
          <Tab key={s.value} value={s.value} label={s.short} />
        ))}
      </Tabs>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        {isLoading ? (
          <Skeleton role="status" height={200} sx={{ m: 2 }} />
        ) : (definitions ?? []).length === 0 ? (
          <Stack spacing={1} sx={{ p: 6, alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="h6">No activity definitions yet</Typography>
            <Typography color="text.secondary">
              Create one — e.g. "Grid electricity" under Scope 2 — and upload its data.
            </Typography>
            <Button onClick={props.onCreate}>Create your first definition</Button>
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="Activity definitions">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>GHG category</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Data sources</TableCell>
                  <TableCell align="right">Activities</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {definitions!.map((d) => (
                  <TableRow key={d.id} hover sx={{ cursor: 'pointer' }} onClick={() => props.onOpen(d.id)}>
                    <TableCell>
                      <Typography variant="subtitle2">{d.name}</Typography>
                      {d.description && (
                        <Typography variant="caption" color="text.secondary">
                          {d.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={scopeMeta(d.scope).short}
                        color={scopeMeta(d.scope).color}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{d.category.name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {d.periodStart} → {d.periodEnd}
                    </TableCell>
                    <TableCell align="right">{d.dataSourceCount}</TableCell>
                    <TableCell align="right">{d.activityCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip size="small" label={d.status} color={STATUS_COLOR[d.status]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      {props.dialog}
    </Stack>
  );
}
