import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import WarningAmber from '@mui/icons-material/WarningAmber';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import Typography from '@mui/material/Typography';
import { blink, motion, slideInLeft } from '../motion';
import { surface, toneVars, type Tone } from './tokens';

/** Same card chrome for every "under the hood" panel: icon, title, one-line subtitle. */
function PanelHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: 'var(--accent)',
          bgcolor: 'var(--soft)',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
          {text}
        </Typography>
      </Box>
    </Stack>
  );
}

/** Panel shell: full height, content stretches to fill it so neighbouring panels line up. */
const panel = (tone: Tone) => ({
  ...toneVars(tone),
  ...surface(tone),
  p: 3,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
});
const fill = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1 } as const;

const ROWS = [
  { status: 'ok', text: 'Diesel · Chennai plant · 156,200 L', note: 'Valid' },
  { status: 'ok', text: 'Grid electricity · HQ · 482,000 kWh', note: 'Valid' },
  { status: 'warn', text: 'Natural gas · Pune · 9,400 ltr', note: 'Unit “ltr” converted to L' },
  { status: 'error', text: 'Flights · “Plant 9” · 12,000 km', note: 'Unknown business unit' },
  { status: 'ok', text: 'Steel · Hosur · 84 t', note: 'Valid' },
] as const;

const STATUS_ICON = {
  ok: <CheckCircle sx={{ fontSize: 18, color: 'var(--accent)' }} />,
  warn: <WarningAmber sx={{ fontSize: 18, color: 'warning.main' }} />,
  error: <ErrorOutlined sx={{ fontSize: 18, color: 'error.main' }} />,
};

/** Rows being validated on import: numbers, units, business units, dates. */
export function ImportValidation({ tone = 'light', headless = false }: { tone?: Tone; headless?: boolean }) {
  return (
    <Box aria-hidden sx={panel(tone)}>
      {!headless && (
        <PanelHeader
          icon={<UploadFileOutlined />}
          title="Validated imports"
          text="fuel_log_q3.xlsx, checked row by row"
        />
      )}
      <Box sx={fill}>
        {ROWS.map((r, i) => (
          <Stack
            key={r.text}
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: 'var(--soft)',
              ...motion(`${slideInLeft} .5s ease-out ${i * 0.18}s backwards`),
            }}
          >
            {STATUS_ICON[r.status]}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
                {r.text}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: r.status === 'ok' ? 'var(--muted)' : r.status === 'warn' ? 'warning.main' : 'error.main' }}
              >
                {r.note}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'var(--accent)',
            ...motion(`${blink} 1.4s ease-in-out infinite`),
          }}
        />
        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
          3 valid · 1 converted · 1 needs your review
        </Typography>
      </Stack>
    </Box>
  );
}
