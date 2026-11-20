import type { EmissionSummary } from '@carbon-glint/sdk';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { formatCo2e, pct } from '../emissions/format';

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card sx={{ height: '100%', borderTop: 4, borderTopColor: accent ?? 'primary.main' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ data, isLoading }: { data?: EmissionSummary; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <Grid container spacing={2} role="status">
        {[0, 1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, md: 'grow' }}>
            <Skeleton variant="rectangular" height={104} />
          </Grid>
        ))}
      </Grid>
    );
  }
  const t = data.co2eKg;
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
        <Kpi
          label="Total emissions"
          value={formatCo2e(t.total)}
          hint={`${data.activityCount.toLocaleString()} activities`}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 'grow' }}>
        <Kpi label="Scope 1" value={formatCo2e(t['1'])} hint={pct(t['1'], t.total)} accent="warning.main" />
      </Grid>
      <Grid size={{ xs: 6, md: 'grow' }}>
        <Kpi label="Scope 2" value={formatCo2e(t['2'])} hint={pct(t['2'], t.total)} accent="primary.main" />
      </Grid>
      <Grid size={{ xs: 6, md: 'grow' }}>
        <Kpi label="Scope 3" value={formatCo2e(t['3'])} hint={pct(t['3'], t.total)} accent="secondary.main" />
      </Grid>
      <Grid size={{ xs: 6, md: 'grow' }}>
        <Kpi
          label="Data quality"
          value={`${data.orgUnitsWithData}/${data.orgUnitCount} BUs`}
          hint={`${data.needsReview} need review · ${data.unmatched} unmatched · ${data.overridden} overridden`}
          accent="info.main"
        />
      </Grid>
    </Grid>
  );
}
