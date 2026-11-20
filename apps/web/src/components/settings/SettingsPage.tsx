import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** Layout only: composes the settings sections (each one is its own container). */
export function SettingsPage({ team, system }: { team: ReactNode; system: ReactNode }) {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Settings
      </Typography>
      {team}
      <Typography variant="h6" component="h2">
        System status
      </Typography>
      {system}
    </Stack>
  );
}
