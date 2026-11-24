import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { PasswordField } from '../common/PasswordField';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { formValues } from '../../lib/errors';
import { AuthLayout } from './AuthLayout';

export interface LoginFormProps {
  onSubmit: (values: { email: string; password: string }) => void;
  isSubmitting: boolean;
  error?: string;
  /** Show the "resend verification" action (server said EMAIL_NOT_VERIFIED). */
  needsVerification: boolean;
  onResendVerification: () => void;
  resendSent: boolean;
  notice?: string;
  /** Start the no-signup sample-data demo. */
  onDemo?: () => void;
}

export function LoginForm({
  onSubmit,
  isSubmitting,
  error,
  needsVerification,
  onResendVerification,
  resendSent,
  notice,
  onDemo,
}: LoginFormProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit({ email: v.email ?? '', password: v.password ?? '' });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Carbon Glint workspace."
      footer={
        <Typography variant="body2">
          New here?{' '}
          <Link component={RouterLink} to="/signup">
            Create a company account
          </Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={submit}>
        {notice && <Alert severity="info">{notice}</Alert>}
        {error && (
          <Alert
            severity={needsVerification ? 'warning' : 'error'}
            action={
              needsVerification && !resendSent ? (
                <Button color="inherit" size="small" onClick={onResendVerification}>
                  Resend link
                </Button>
              ) : undefined
            }
          >
            {resendSent ? 'A new verification link is on its way.' : error}
          </Alert>
        )}
        <TextField name="email" label="Work email" type="email" required autoComplete="email" />
        <PasswordField name="password" label="Password" required autoComplete="current-password" />
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          Sign in
        </Button>
        <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ alignSelf: 'center' }}>
          Forgot password?
        </Link>
        {onDemo && (
          <>
            <Divider>or</Divider>
            <Button variant="outlined" size="large" onClick={onDemo}>
              Try the live demo
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              No sign-up. Explore a sample company with data under every scope. Stored only in your browser.
            </Typography>
          </>
        )}
      </Stack>
    </AuthLayout>
  );
}
