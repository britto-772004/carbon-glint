import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
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

/**
 * Hero first: business units and the lasagne heatmap side by side, sized to fit the screen,
 * then the headline numbers and the trend / top-activity charts.
 */
export function DashboardPage(p: DashboardPageProps) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {p.title}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>{p.filters}</Box>
      </Stack>
      <Box data-tour="dash-kpis">{p.kpis}</Box>
      <Grid container spacing={2} sx={{ height: { lg: 'calc(100vh - 290px)' }, minHeight: { lg: 480 } }}>
        <Grid size={{ xs: 12, lg: 5 }} sx={{ height: { xs: 460, lg: '100%' } }}>
          {p.tree}
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }} sx={{ height: { xs: 520, lg: '100%' } }}>
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
