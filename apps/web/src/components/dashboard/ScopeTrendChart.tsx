import type { Heatmap } from '@carbon-glint/sdk';
import ReactECharts from 'echarts-for-react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatCo2e } from '../emissions/format';

const COLORS: Record<string, string> = { '1': '#d97706', '2': '#0f766e', '3': '#65a30d' };

/** Monthly emissions stacked by scope (from the scope heatmap). */
export function ScopeTrendChart({ data, isLoading }: { data?: Heatmap; isLoading: boolean }) {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6">Trend by scope</Typography>
        {isLoading ? (
          <Skeleton role="status" variant="rectangular" height={260} />
        ) : !data?.rows.length ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
            No data yet.
          </Typography>
        ) : (
          <ReactECharts
            style={{ height: 280 }}
            notMerge
            option={{
              textStyle: { fontFamily: theme.typography.fontFamily },
              tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatCo2e(v) },
              legend: { bottom: 0, textStyle: { color: theme.palette.text.secondary } },
              grid: { left: 8, right: 8, top: 16, bottom: 40, containLabel: true },
              xAxis: { type: 'category', data: data.columns },
              yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatCo2e(v, { unit: false }) } },
              series: data.rows.map((r) => ({
                name: r.label,
                type: 'bar',
                stack: 'scope',
                data: r.cells,
                itemStyle: { color: COLORS[r.key] },
              })),
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
