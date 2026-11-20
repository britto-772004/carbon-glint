import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** Layout only: composes the settings sections (each one is its own container). */
export function SettingsPage({ team, factors, system }: { team: ReactNode; factors: ReactNode; system: ReactNode }) {
  return (
    <Stack spacing={3}>
      {team}
      {factors}
      <Typography variant="h6" component="h2">
        System status
      </Typography>
      {system}
    </Stack>
  );
}
