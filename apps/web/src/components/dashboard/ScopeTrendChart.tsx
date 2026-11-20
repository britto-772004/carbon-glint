import type { Heatmap } from '@carbon-glint/sdk';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts } from '../../lib/echarts';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { chartTooltip } from '../../lib/chart-tooltip';
import { useChartColors } from '../common/useChartColors';
import { formatCo2e } from '../emissions/format';

const COLORS: Record<string, string> = { '1': '#d97706', '2': '#0f766e', '3': '#65a30d' };

/** Monthly emissions stacked by scope (from the scope heatmap). */
export function ScopeTrendChart({ data, isLoading }: { data?: Heatmap; isLoading: boolean }) {
  const c = useChartColors();
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
            echarts={echarts}
            style={{ height: 280 }}
            notMerge
            option={{
              textStyle: { fontFamily: c.fontFamily },
              tooltip: { ...chartTooltip(c), trigger: 'axis', valueFormatter: (v: number) => formatCo2e(v) },
              legend: { bottom: 0, textStyle: { color: c.textSecondary } },
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
