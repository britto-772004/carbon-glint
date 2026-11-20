import type { ReactNode } from 'react';
import type { Health } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface HealthStatusProps {
  health?: Health;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}

/**
 * Component: props in, markup out. Only conditional rendering — no state, effects or API calls.
 */
export function HealthStatus({ health, isLoading, error, onRetry }: HealthStatusProps) {
  if (isLoading) {
    return (
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="status">
        <CircularProgress size={20} />
        <Typography>Checking API…</Typography>
      </Stack>
    );
  }

  if (error || !health) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        API unavailable: {error ?? 'unknown error'}
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Row label="Status">
            <Chip size="small" label={health.status} color={health.status === 'ok' ? 'success' : 'warning'} />
          </Row>
          <Row label="Database">
            <Chip
              size="small"
              label={health.checks.database}
              color={health.checks.database === 'up' ? 'success' : 'error'}
            />
          </Row>
          <Row label="Version">
            <Typography variant="body2">{health.version}</Typography>
          </Row>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
