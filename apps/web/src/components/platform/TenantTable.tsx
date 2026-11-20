import type { FormEvent } from 'react';
import type { TenantSummary } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';

import type { Pagination } from '../../lib/pagination';
import { TablePager } from '../common/TablePager';

export interface TenantTableProps {
  /** The current page of companies. */
  tenants?: TenantSummary[];
  pagination: Pagination;
  isLoading: boolean;
  error?: string;
  query: string;
  onSearch: (q: string) => void;
  onOpen: (tenantId: string) => void;
}

export function TenantTable({ tenants, pagination, isLoading, error, query, onSearch, onOpen }: TenantTableProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(formValues(e.currentTarget).q ?? '');
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <form onSubmit={submit}>
          <TextField name="q" size="small" label="Search name or domain" defaultValue={query} type="search" />
        </form>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        {isLoading ? (
          <Skeleton role="status" height={200} sx={{ m: 2 }} />
        ) : (
          <>
            <TableContainer>
              <Table aria-label="Companies">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Domain</TableCell>
                    <TableCell>Industry</TableCell>
                    <TableCell>Employees</TableCell>
                    <TableCell align="right">BUs</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tenants ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">No companies found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {(tenants ?? []).map((t) => (
                    <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(t.id)}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.emailDomain}</TableCell>
                      <TableCell>{t.industryName ?? <Chip size="small" label="Not onboarded" />}</TableCell>
                      <TableCell>{t.employeeBand ?? '—'}</TableCell>
                      <TableCell align="right">{t.businessUnitCount ?? '—'}</TableCell>
                      <TableCell align="right">{t.userCount}</TableCell>
                      <TableCell>
                        <Chip size="small" label={t.status} color={t.status === 'active' ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePager {...pagination} />
          </>
        )}
      </Card>
    </Stack>
  );
}
