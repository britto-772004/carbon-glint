import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { cellPulse, fadeUp, growY, motion, ping, slideInLeft } from '../motion';
import { surface, toneVars, type Tone } from './tokens';

const HEAT_ROWS = [
  { label: 'Scope 1', cells: [0.9, 0.5, 0.3, 0.2, 0.6, 0.15, 0.1, 0.35] },
  { label: 'Scope 2', cells: [0.4, 0.95, 0.2, 0.1, 0.15, 0.3, 0.1, 0.1] },
  { label: 'Scope 3', cells: [0.2, 0.3, 0.85, 0.7, 0.5, 0.9, 0.4, 0.6] },
];
const DRILL = ['Scope', 'Category', 'Definition', 'Activity'];

/** The "lasagne" heatmap: layers by scope, cells shimmer, and the drill-down path is shown below. */
export function HeatmapLasagne({ tone = 'light' }: { tone?: Tone }) {
  return (
    <Box
      aria-hidden
      sx={{
        ...toneVars(tone),
        ...surface(tone),
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700 }}>
        Emissions by scope and category
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(8, 1fr)',
          gap: 0.75,
          alignItems: 'center',
        }}
      >
        {HEAT_ROWS.map((row, r) => [
          <Typography key={row.label} variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700, pr: 1 }}>
            {row.label}
          </Typography>,
          ...row.cells.map((o, c) => (
            <Box
              key={`${row.label}-${c}`}
              sx={{
                '--o': o,
                height: { xs: 30, md: 44 },
                borderRadius: 1,
                bgcolor: r === 1 ? 'var(--accent2)' : 'var(--accent)',
                opacity: 'var(--o)',
                ...motion(`${cellPulse} ${3 + ((r * 8 + c) % 5) * 0.6}s ease-in-out ${(r * 8 + c) * 0.17}s infinite`),
              }}
            />
          )),
        ])}
      </Box>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {DRILL.map((d, i) => (
          <Stack key={d} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Chip
              size="small"
              label={d}
              variant="outlined"
              sx={{
                color: 'inherit',
                borderColor: 'var(--line)',
                ...motion(`${fadeUp} .5s ease-out ${0.8 + i * 0.2}s backwards`),
              }}
            />
            {i < DRILL.length - 1 && (
              <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
                →
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
          Lower
        </Typography>
        {[0.15, 0.35, 0.55, 0.8, 1].map((o) => (
          <Box key={o} sx={{ width: 22, height: 10, borderRadius: 0.5, bgcolor: 'var(--accent)', opacity: o }} />
        ))}
        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
          Higher
        </Typography>
      </Stack>
    </Box>
  );
}

const TRACE = [
  { k: 'Reported', v: '418.6 tCO₂e · Scope 1 · Stationary combustion' },
  { k: 'Calculated from', v: '156,200 L diesel × 2.68 kgCO₂e/L' },
  { k: 'Factor source', v: 'DEFRA 2025 · Diesel (average biofuel blend)' },
  { k: 'Source row', v: 'fuel_log_q3.xlsx · row 214 · Chennai plant' },
];

/** Traceability chain: from the reported number back to the source row. */
export function TraceChain({ tone = 'light' }: { tone?: Tone }) {
  return (
    <Box aria-hidden sx={{ ...toneVars(tone), ...surface(tone), p: { xs: 2.5, md: 3.5 }, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: 'var(--muted)', mb: 2 }}>
        Trace a number
      </Typography>
      {TRACE.map((r, i) => (
        <Stack key={r.k} direction="row" spacing={2}>
          <Stack sx={{ alignItems: 'center' }}>
            <Box sx={{ position: 'relative', width: 12, height: 12, mt: 0.75, flexShrink: 0 }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  bgcolor: 'var(--accent)',
                  ...motion(`${ping} 2.4s ease-out ${i * 0.6}s infinite`),
                }}
              />
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'var(--accent)' }} />
            </Box>
            {i < TRACE.length - 1 && (
              <Box
                sx={{
                  width: 2,
                  flex: 1,
                  bgcolor: 'var(--accent)',
                  opacity: 0.45,
                  transformOrigin: 'top',
                  ...motion(`${growY} .6s ease-out ${0.35 + i * 0.5}s backwards`),
                }}
              />
            )}
          </Stack>
          <Box
            sx={{ pb: i < TRACE.length - 1 ? 2.5 : 0, ...motion(`${slideInLeft} .6s ease-out ${i * 0.5}s backwards`) }}
          >
            <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
              {r.k}
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>{r.v}</Typography>
          </Box>
        </Stack>
      ))}
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 2.5 }}>
        {['Override with a reason', 'Audit history', 'Revert anytime'].map((c) => (
          <Chip key={c} size="small" label={c} sx={{ bgcolor: 'var(--soft)', color: 'inherit' }} />
        ))}
      </Stack>
    </Box>
  );
}
