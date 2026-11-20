import type { ReactNode } from 'react';
import type { TenantDetail } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

export interface TenantDetailPanelProps {
  detail?: TenantDetail;
  isLoading: boolean;
  error?: string;
  onBack: () => void;
  onSetTenantStatus: (status: 'active' | 'disabled') => void;
  onSetUserStatus: (userId: string, status: 'active' | 'disabled') => void;
  onResendVerification: (userId: string) => void;
  notice?: string;
}

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography>{value ?? '—'}</Typography>
  </Grid>
);

export function TenantDetailPanel({ detail, isLoading, error, onBack, ...actions }: TenantDetailPanelProps) {
  if (isLoading) return <Skeleton role="status" height={300} />;
  if (error || !detail) return <Alert severity="error">{error ?? 'Company not found.'}</Alert>;
  const { tenant, users } = detail;
  const active = tenant.status === 'active';

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Button onClick={onBack}>← Companies</Button>
          <Typography variant="h4" component="h2">
            {tenant.name}
          </Typography>
          <Chip label={tenant.status} color={active ? 'success' : 'default'} />
        </Stack>
        <Button
          variant="outlined"
          color={active ? 'error' : 'primary'}
          onClick={() => actions.onSetTenantStatus(active ? 'disabled' : 'active')}
        >
          {active ? 'Disable company' : 'Enable company'}
        </Button>
      </Stack>
      {actions.notice && <Alert severity="success">{actions.notice}</Alert>}
      <Card>
        <CardHeader title="Onboarding" />
        <CardContent>
          <Grid container spacing={2}>
            <Field label="Domain" value={tenant.emailDomain} />
            <Field label="Industry" value={tenant.industry?.name} />
            <Field label="Employees" value={tenant.employeeBand} />
            <Field label="Business units" value={tenant.businessUnitCount} />
            <Field
              label="Website"
              value={
                tenant.website && (
                  <Link href={tenant.website} target="_blank" rel="noreferrer">
                    {tenant.website}
                  </Link>
                )
              }
            />
            <Field
              label="LinkedIn"
              value={
                tenant.linkedinUrl && (
                  <Link href={tenant.linkedinUrl} target="_blank" rel="noreferrer">
                    Company page
                  </Link>
                )
              }
            />
            <Field label="Created" value={new Date(tenant.createdAt).toLocaleString()} />
            <Field label="Onboarded" value={tenant.onboarded ? 'Yes' : 'No'} />
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title={`Users (${users.length})`} />
        <Table size="small" aria-label="Company users">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.status} />
                </TableCell>
                <TableCell align="right">
                  {u.status === 'pending' ? (
                    <Button size="small" onClick={() => actions.onResendVerification(u.id)}>
                      Resend verification
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      color={u.status === 'active' ? 'error' : 'primary'}
                      onClick={() => actions.onSetUserStatus(u.id, u.status === 'active' ? 'disabled' : 'active')}
                    >
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}
