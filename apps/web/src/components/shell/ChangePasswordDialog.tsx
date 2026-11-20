import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { formValues } from '../../lib/errors';

export interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void;
  isSubmitting: boolean;
  error?: string;
  success: boolean;
}

export function ChangePasswordDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  success,
}: ChangePasswordDialogProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit({ currentPassword: v.currentPassword ?? '', newPassword: v.newPassword ?? '' });
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Change password</DialogTitle>
      {success ? (
        <>
          <DialogContent>
            <Alert severity="success">Password changed. Other devices were signed out.</Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Done</Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={submit}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                name="currentPassword"
                label="Current password"
                type="password"
                required
                autoComplete="current-password"
              />
              <TextField
                name="newPassword"
                label="New password"
                type="password"
                required
                autoComplete="new-password"
                helperText="At least 10 characters, with a letter and a number."
                slotProps={{ htmlInput: { minLength: 10, maxLength: 128 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" loading={isSubmitting}>
              Change password
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
