import type { Heatmap } from '@carbon-glint/sdk';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts } from '../../lib/echarts';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatCo2e, pct } from './format';

export interface LasagneHeatmapProps {
  title: string;
  data?: Heatmap;
  isLoading: boolean;
  breadcrumb: string[];
  onBreadcrumb: (index: number) => void;
  /** Called with the row key when a row can be drilled into; undefined = deepest level. */
  onDrill?: (rowKey: string, label: string) => void;
  groupMode: 'ghg' | 'bu';
  onGroupMode: (mode: 'ghg' | 'bu') => void;
  bucket: 'month' | 'quarter' | 'year';
  onBucket: (b: 'month' | 'quarter' | 'year') => void;
  showTable: boolean;
  onToggleTable: () => void;
  /** Stretch to the parent's height (dashboard hero); otherwise height follows the row count. */
  fill?: boolean;
  /** Hide the "By scope / By business unit" switch (e.g. when space is tight). */
  compactControls?: boolean;
}

const MAX_ROWS = 25;

/** Lasagna plot: rows = entities at the current drill level, columns = time, colour = t CO₂e. */
export function LasagneHeatmap(p: LasagneHeatmapProps) {
  const theme = useTheme();
  const data = p.data;
  const rows = (data?.rows ?? []).slice(0, MAX_ROWS);
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  const option = data && {
    textStyle: { fontFamily: theme.typography.fontFamily },
    grid: { left: 8, right: 16, top: 8, bottom: 48, containLabel: true },
    tooltip: {
      formatter: (params: { data: [number, number, number | '-'] }) => {
        const [x, y, v] = params.data;
        const row = rows[rows.length - 1 - y]!;
        const value = v === '-' ? 0 : v;
        return `<b>${row.label}</b><br/>${data.columns[x]}: ${formatCo2e(value)}<br/>${pct(value, row.total)} of row · ${pct(value, data.columnTotals[x] ?? 0)} of ${data.columns[x]}`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.columns,
      splitArea: { show: true },
      axisLabel: { color: theme.palette.text.secondary },
    },
    yAxis: {
      type: 'category',
      data: [...rows]
        .reverse()
        .map(
          (r) =>
            `${r.label.length > 34 ? `${r.label.slice(0, 33)}…` : r.label}  ·  ${formatCo2e(r.total, { unit: false })}`,
        ),
      axisLabel: { color: theme.palette.text.primary },
    },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#ecfdf5', '#a7f3d0', '#34d399', '#0f766e', '#134e4a'] },
      formatter: (v: number) => formatCo2e(v, { unit: false }),
      textStyle: { color: theme.palette.text.secondary },
    },
    series: [
      {
        type: 'heatmap',
        data: [...rows]
          .reverse()
          .flatMap((r, y) => r.cells.map((v, x) => [x, y, v > 0 ? Math.round(v * 100) / 100 : '-'])),
        itemStyle: { borderColor: theme.palette.background.paper, borderWidth: 2 },
        emphasis: { itemStyle: { borderColor: theme.palette.secondary.main } },
      },
    ],
  };

  const fill = Boolean(p.fill);
  return (
    <Card data-tour="dash-lasagne" sx={fill ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      <CardContent
        sx={
          fill
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1.5 } }
            : undefined
        }
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', mb: 1 }}>
          <div>
            <Typography variant="h6">{p.title}</Typography>
            <Breadcrumbs aria-label="Drill-down path">
              {p.breadcrumb.map((label, i) =>
                i < p.breadcrumb.length - 1 ? (
                  <Link key={i} component="button" underline="hover" onClick={() => p.onBreadcrumb(i)}>
                    {label}
                  </Link>
                ) : (
                  <Typography key={i} color="text.primary">
                    {label}
                  </Typography>
                ),
              )}
            </Breadcrumbs>
          </div>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={p.groupMode}
              onChange={(_, v) => v && p.onGroupMode(v)}
              sx={{ display: p.compactControls ? 'none' : undefined }}
            >
              <ToggleButton value="ghg">By scope</ToggleButton>
              <ToggleButton value="bu">By business unit</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup size="small" exclusive value={p.bucket} onChange={(_, v) => v && p.onBucket(v)}>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="quarter">Quarter</ToggleButton>
              <ToggleButton value="year">Year</ToggleButton>
            </ToggleButtonGroup>
            <Button size="small" onClick={p.onToggleTable}>
              {p.showTable ? 'Show chart' : 'View as table'}
            </Button>
          </Stack>
        </Stack>

        {p.isLoading ? (
          <Skeleton
            role="status"
            variant="rectangular"
            height={fill ? '100%' : 320}
            sx={{ flex: fill ? 1 : undefined }}
          />
        ) : !data || rows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No emissions for these filters yet. Publish an Activity Definition to calculate them.
            </Typography>
          </Box>
        ) : p.showTable ? (
          <TableContainer sx={fill ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}>
            <Table size="small" stickyHeader={fill} aria-label="Heatmap data">
              <TableHead>
                <TableRow>
                  <TableCell>{p.breadcrumb.at(-1)}</TableCell>
                  {data.columns.map((c) => (
                    <TableCell key={c} align="right">
                      {c}
                    </TableCell>
                  ))}
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.key}
                    hover={Boolean(p.onDrill)}
                    sx={{ cursor: p.onDrill ? 'pointer' : undefined }}
                    onClick={() => p.onDrill?.(r.key, r.label)}
                  >
                    <TableCell>{r.label}</TableCell>
                    {r.cells.map((v, i) => (
                      <TableCell key={i} align="right">
                        {v ? formatCo2e(v, { unit: false }) : '—'}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <b>{formatCo2e(r.total, { unit: false })}</b>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <b>Total</b>
                  </TableCell>
                  {data.columnTotals.map((v, i) => (
                    <TableCell key={i} align="right">
                      <b>{formatCo2e(v, { unit: false })}</b>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <b>{formatCo2e(data.total, { unit: false })}</b>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <>
            <ReactECharts
              echarts={echarts}
              option={option}
              notMerge
              style={{
                height: fill ? '100%' : Math.max(220, rows.length * 34 + 90),
                width: '100%',
                flex: fill ? 1 : undefined,
                minHeight: 0,
              }}
              onEvents={{
                click: (params: { data?: [number, number, unknown] }) => {
                  if (!params.data || !p.onDrill) return;
                  const row = rows[rows.length - 1 - params.data[1]];
                  if (row) p.onDrill(row.key, row.label);
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Total {formatCo2e(data.total)} · {p.onDrill ? 'click a row to drill down' : 'deepest level'}
              {(data.rows.length ?? 0) > MAX_ROWS ? ` · showing top ${MAX_ROWS} of ${data.rows.length}` : ''}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
