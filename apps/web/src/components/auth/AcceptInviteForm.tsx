import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { PasswordField } from '../common/PasswordField';
import type { InvitationPreview } from '@carbon-glint/sdk';
import { formValues } from '../../lib/errors';
import { AuthLayout } from './AuthLayout';

export interface AcceptInviteFormProps {
  invitation?: InvitationPreview;
  isLoading: boolean;
  loadError?: string;
  onSubmit: (values: { name: string; password: string }) => void;
  isSubmitting: boolean;
  error?: string;
}

export function AcceptInviteForm({
  invitation,
  isLoading,
  loadError,
  onSubmit,
  isSubmitting,
  error,
}: AcceptInviteFormProps) {
  if (isLoading) {
    return (
      <AuthLayout title="Opening your invitation">
        <CircularProgress role="status" />
      </AuthLayout>
    );
  }
  if (loadError || !invitation) {
    return (
      <AuthLayout title="Invitation unavailable">
        <Alert severity="error">{loadError ?? 'This invitation is invalid or has expired.'}</Alert>
      </AuthLayout>
    );
  }
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit({ name: v.name ?? '', password: v.password ?? '' });
  };
  return (
    <AuthLayout title={`Join ${invitation.tenantName}`} subtitle={`You're joining as ${invitation.email}.`}>
      <Stack component="form" spacing={2.5} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField name="name" label="Full name" required autoComplete="name" />
        <PasswordField
          name="password"
          label="Choose a password"
          required
          autoComplete="new-password"
          helperText="At least 10 characters, with a letter and a number."
          slotProps={{ htmlInput: { minLength: 10, maxLength: 128 } }}
        />
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          Accept invitation
        </Button>
      </Stack>
    </AuthLayout>
  );
}
