import type { ActivityDefinition, Scope } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import AddRounded from '@mui/icons-material/AddRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
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
  /** Every definition (summary tiles). */
  summary?: ActivityDefinition[];
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

function Tile({ label, value, hint, color }: { label: string; value: string | number; hint: string; color: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderLeft: 4, borderLeftColor: color }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

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
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            Activity definitions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Each definition groups the data for one emission source, such as grid electricity or business flights.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={props.onCreate}
          data-tour="ad-new"
          sx={{ flexShrink: 0 }}
        >
          New activity definition
        </Button>
      </Stack>
      {props.summary && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Tile label="Definitions" value={props.summary.length} hint="across all scopes" color="#0f766e" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Tile
              label="Published"
              value={props.summary.filter((d) => d.status === 'published').length}
              hint="calculating emissions"
              color="#16a34a"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Tile
              label="Drafts"
              value={props.summary.filter((d) => d.status === 'draft').length}
              hint="waiting to be published"
              color="#94a3b8"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Tile
              label="Activities"
              value={props.summary.reduce((n, d) => n + d.activityCount, 0).toLocaleString()}
              hint="rows imported"
              color="#ca8a04"
            />
          </Grid>
        </Grid>
      )}
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
      <Card sx={{ overflow: 'hidden' }}>
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
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>GHG category</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Data sources</TableCell>
                    <TableCell align="right">Activities</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell padding="checkbox" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {definitions!.map((d) => (
                    <TableRow key={d.id} hover sx={{ cursor: 'pointer' }} onClick={() => props.onOpen(d.id)}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Box
                            aria-hidden
                            sx={{
                              width: 4,
                              alignSelf: 'stretch',
                              minHeight: 32,
                              borderRadius: 2,
                              bgcolor: `${scopeMeta(d.scope).color}.main`,
                            }}
                          />
                          <div>
                            <Typography variant="subtitle2">{d.name}</Typography>
                            {d.description && (
                              <Typography variant="caption" color="text.secondary">
                                {d.description}
                              </Typography>
                            )}
                          </div>
                        </Stack>
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
                        <Chip
                          size="small"
                          label={d.status}
                          color={STATUS_COLOR[d.status]}
                          variant={d.status === 'published' ? 'filled' : 'outlined'}
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell padding="checkbox">
                        <ChevronRightRounded fontSize="small" color="disabled" aria-hidden />
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
