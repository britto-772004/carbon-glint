import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

export interface DashboardPageProps {
  filters: ReactNode;
  kpis: ReactNode;
  lasagne: ReactNode;
  trend: ReactNode;
  top: ReactNode;
  tree: ReactNode;
  drawer: ReactNode;
}

/**
 * Headline numbers on top, then business units and the lasagne heatmap side by side — all three fit one screen —
 * followed by the trend / top-activity charts.
 */
export function DashboardPage(p: DashboardPageProps) {
  return (
    <Stack spacing={2}>
      {p.filters}
      <Box data-tour="dash-kpis">{p.kpis}</Box>
      {/* KPIs + business units + lasagne share one screen: the hero row takes what's left of the viewport. */}
      <Grid container spacing={2} sx={{ height: { lg: 'calc(100vh - 340px)' }, minHeight: { lg: 400 } }}>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ height: { xs: 520, lg: '100%' } }}>
          {p.tree}
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ height: { xs: 520, lg: '100%' } }}>
          {p.lasagne}
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>{p.trend}</Grid>
        <Grid size={{ xs: 12, md: 5 }}>{p.top}</Grid>
      </Grid>
      {p.drawer}
    </Stack>
  );
}
