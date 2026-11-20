import type { ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface DashboardPageProps {
  title: string;
  filters: ReactNode;
  kpis: ReactNode;
  lasagne: ReactNode;
  trend: ReactNode;
  top: ReactNode;
  tree: ReactNode;
  drawer: ReactNode;
}

export function DashboardPage(p: DashboardPageProps) {
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Typography color="text.secondary">{p.title}</Typography>
      </div>
      {p.filters}
      {p.kpis}
      {p.lasagne}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>{p.trend}</Grid>
        <Grid size={{ xs: 12, md: 5 }}>{p.top}</Grid>
      </Grid>
      {p.tree}
      {p.drawer}
    </Stack>
  );
}
