import type { ChartSpec } from '@carbon-glint/sdk';
import ReactECharts from 'echarts-for-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { chartToCsv } from './chat-utils';

const PALETTE = ['#0f766e', '#d97706', '#65a30d', '#0369a1', '#be123c', '#7c3aed'];

/** Renders an assistant chart answer (validated ChartSpec) with a table view and CSV download. */
export function ChatChart({
  chart,
  showTable,
  onToggleTable,
}: {
  chart: ChartSpec;
  showTable: boolean;
  onToggleTable: () => void;
}) {
  const theme = useTheme();
  const isPie = chart.type === 'pie';
  const option = {
    color: PALETTE,
    textStyle: { fontFamily: theme.typography.fontFamily },
    tooltip: { trigger: isPie ? 'item' : 'axis' },
    legend: { bottom: 0, textStyle: { color: theme.palette.text.secondary } },
    grid: { left: 8, right: 8, top: 16, bottom: 40, containLabel: true },
    ...(isPie
      ? {
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              data: chart.categories.map((name, i) => ({ name, value: chart.series[0]?.data[i] ?? 0 })),
            },
          ],
        }
      : {
          xAxis: { type: 'category', data: chart.categories },
          yAxis: { type: 'value', name: chart.unit },
          series: chart.series.map((s) => ({
            name: s.name,
            type: chart.type === 'line' ? 'line' : 'bar',
            stack: chart.type === 'stacked-bar' ? 'all' : undefined,
            data: s.data,
          })),
        }),
  };
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(chartToCsv(chart))}`;
  return (
    <Box sx={{ mt: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2">{chart.title}</Typography>
        <Stack direction="row" spacing={1}>
          {chart.type !== 'table' && (
            <Button size="small" onClick={onToggleTable}>
              {showTable ? 'Chart' : 'View data'}
            </Button>
          )}
          <Button size="small" href={csvHref} download={`${chart.title || 'chart'}.csv`}>
            CSV
          </Button>
        </Stack>
      </Stack>
      {chart.type === 'table' || showTable ? (
        <Table size="small" aria-label={chart.title || 'Chart data'}>
          <TableHead>
            <TableRow>
              <TableCell />
              {chart.series.map((s) => (
                <TableCell key={s.name} align="right">
                  {s.name} ({chart.unit})
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {chart.categories.map((c, i) => (
              <TableRow key={c}>
                <TableCell>{c}</TableCell>
                {chart.series.map((s) => (
                  <TableCell key={s.name} align="right">
                    {(s.data[i] ?? 0).toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ReactECharts option={option} notMerge style={{ height: 260 }} />
      )}
    </Box>
  );
}
