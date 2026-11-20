import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Link as RouterLink } from 'react-router';
import { formValues } from '../../lib/errors';
import { AuthLayout } from './AuthLayout';

export interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
  sent: boolean;
  error?: string;
}

export function ForgotPasswordForm({ onSubmit, isSubmitting, sent, error }: ForgotPasswordFormProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formValues(e.currentTarget).email ?? '');
  };
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We'll email you a new password. All other sessions will be signed out."
      footer={
        <Link component={RouterLink} to="/login" variant="body2">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert severity="success">If an account exists for that email, a new password is on its way.</Alert>
      ) : (
        <Stack component="form" spacing={2.5} onSubmit={submit}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField name="email" label="Work email" type="email" required autoComplete="email" />
          <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
            Email me a new password
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
