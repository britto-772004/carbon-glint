import type { ActivityDefinition, Scope } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { SCOPES, scopeMeta } from './scope';

import type { Pagination } from '../../lib/pagination';
import { TablePager } from '../common/TablePager';

export interface ActivityDefinitionsPageProps {
  /** The current page of definitions. */
  definitions?: ActivityDefinition[];
  pagination: Pagination;
  isLoading: boolean;
  error?: string;
  scopeFilter: Scope | 'all';
  onScopeFilter: (s: Scope | 'all') => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  /** Scope → category board shown above the list. */
  board?: ReactNode;
  /** Name of the category the list is filtered to (from the board). */
  categoryFilterName?: string;
  onClearCategoryFilter?: () => void;
  dialog: ReactNode;
}

const STATUS_COLOR = { draft: 'default', published: 'success', archived: 'warning' } as const;

export function ActivityDefinitionsPage(props: ActivityDefinitionsPageProps) {
  const { definitions, isLoading, error } = props;
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={props.onCreate} data-tour="ad-new">
          New activity definition
        </Button>
      </Stack>
      {props.board}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 1 }}>
          Your definitions
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={props.scopeFilter}
          onChange={(_, v: Scope | 'all' | null) => v !== null && props.onScopeFilter(v)}
          aria-label="Filter by scope"
        >
          <ToggleButton value="all">All</ToggleButton>
          {SCOPES.map((s) => (
            <ToggleButton key={s.value} value={s.value}>
              {s.short}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {props.categoryFilterName && (
          <Chip size="small" label={props.categoryFilterName} onDelete={props.onClearCategoryFilter} color="primary" />
        )}
      </Stack>
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
          <>
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
            <TablePager {...props.pagination} />
          </>
        )}
      </Card>
      {props.dialog}
    </Stack>
  );
}
