import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { AuthLayout } from './AuthLayout';

export interface VerifyEmailStatusProps {
  isVerifying: boolean;
  error?: string;
}

export function VerifyEmailStatus({ isVerifying, error }: VerifyEmailStatusProps) {
  return (
    <AuthLayout title="Verifying your email">
      {isVerifying && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="status">
          <CircularProgress size={22} />
          <Typography>Confirming your link…</Typography>
        </Stack>
      )}
      {!isVerifying && error && (
        <Stack spacing={2}>
          <Alert severity="error">{error}</Alert>
          <Button component={RouterLink} to="/login" variant="outlined">
            Go to sign in to request a new link
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
