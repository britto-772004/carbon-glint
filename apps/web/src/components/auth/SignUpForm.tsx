import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { PasswordField } from '../common/PasswordField';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { formValues } from '../../lib/errors';
import { AuthLayout } from './AuthLayout';

export interface SignUpValues {
  name: string;
  email: string;
  password: string;
}

export interface SignUpFormProps {
  onSubmit: (values: SignUpValues) => void;
  isSubmitting: boolean;
  error?: string;
  /** Set after a successful sign-up: shows the "check your inbox" state. */
  sentTo?: string;
}

export function SignUpForm({ onSubmit, isSubmitting, error, sentTo }: SignUpFormProps) {
  const footer = (
    <Typography variant="body2">
      Already have an account?{' '}
      <Link component={RouterLink} to="/login">
        Sign in
      </Link>
    </Typography>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" footer={footer}>
        <Alert severity="success">
          We sent a verification link to <b>{sentTo}</b>. Open it to activate your account — it expires in 24 hours.
        </Alert>
      </AuthLayout>
    );
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit({ name: v.name ?? '', email: v.email ?? '', password: v.password ?? '' });
  };

  return (
    <AuthLayout
      title="Create your company account"
      subtitle="Use your work email — personal addresses aren't accepted."
      footer={footer}
    >
      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate={false}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          name="name"
          label="Full name"
          required
          autoComplete="name"
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <TextField name="email" label="Work email" type="email" required autoComplete="email" />
        <PasswordField
          name="password"
          label="Password"
          required
          autoComplete="new-password"
          helperText="At least 10 characters, with a letter and a number."
          slotProps={{ htmlInput: { minLength: 10, maxLength: 128 } }}
        />
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          Create account
        </Button>
      </Stack>
    </AuthLayout>
  );
}
