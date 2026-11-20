import type { Heatmap } from '@carbon-glint/sdk';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatCo2e } from '../emissions/format';

export function TopActivities({
  data,
  isLoading,
  onOpen,
}: {
  data?: Heatmap;
  isLoading: boolean;
  onOpen: (activityId: string) => void;
}) {
  const rows = (data?.rows ?? []).slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Top emitting activities
        </Typography>
        {isLoading ? (
          <Skeleton role="status" variant="rectangular" height={260} />
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No data yet.</Typography>
        ) : (
          <Stack
            spacing={1.25}
            component="ol"
            sx={{ pl: 0, m: 0, listStyle: 'none' }}
            aria-label="Top emitting activities"
          >
            {rows.map((r) => (
              <Box component="li" key={r.key} onClick={() => onOpen(r.key)} sx={{ cursor: 'pointer' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }} title={r.label}>
                    {r.label}
                  </Typography>
                  <Typography variant="body2">{formatCo2e(r.total)}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(r.total / max) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
