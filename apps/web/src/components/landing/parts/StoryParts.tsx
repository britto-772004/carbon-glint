import BoltOutlined from '@mui/icons-material/BoltOutlined';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import StarsOutlined from '@mui/icons-material/StarsOutlined';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { AUDIENCES, REPORT_FORMATS, SCOPES, STANDARD_BADGES } from '../landingContent';
import { drift, fadeUp, floatSlow, growX, leafFloat, marquee, motion } from '../motion';
import { surface, toneVars, type Tone } from './tokens';

/** One standard or factor library: its logo when a file is configured, otherwise a monogram badge. */
function StandardBadge({ badge }: { badge: (typeof STANDARD_BADGES)[number] }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: { xs: 2, md: 3 }, flexShrink: 0 }}>
      {badge.logo ? (
        <Box
          component="img"
          src={badge.logo}
          alt=""
          sx={{ height: 34, width: 'auto', maxWidth: 90, objectFit: 'contain' }}
        />
      ) : (
        <Box
          sx={{
            minWidth: 38,
            height: 38,
            px: 0.75,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            fontSize: badge.mark.length > 2 ? 11 : 13,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: 'var(--accent)',
            bgcolor: 'var(--soft)',
            border: 1,
            borderColor: 'var(--line)',
          }}
        >
          {badge.mark}
        </Box>
      )}
      <Box sx={{ whiteSpace: 'nowrap' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{badge.name}</Typography>
        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
          {badge.caption}
        </Typography>
      </Box>
    </Stack>
  );
}

/** Standards and factor libraries, scrolling sideways. Pauses on hover. */
export function Marquee({ tone = 'light', fade = true }: { tone?: Tone; fade?: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        ...toneVars(tone),
        overflow: 'hidden',
        ...(fade && { maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }),
        '&:hover > div': { animationPlayState: 'paused' },
      }}
    >
      <Stack direction="row" sx={{ width: 'max-content', ...motion(`${marquee} 40s linear infinite`) }}>
        {[...STANDARD_BADGES, ...STANDARD_BADGES].map((b, i) => (
          <StandardBadge key={i} badge={b} />
        ))}
      </Stack>
    </Box>
  );
}

/** One page per country format, bobbing at different speeds. */
export function ReportSheets({ tone = 'light', limit = REPORT_FORMATS.length }: { tone?: Tone; limit?: number }) {
  return (
    <Stack
      aria-hidden
      direction="row"
      useFlexGap
      sx={{ ...toneVars(tone), flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}
    >
      {REPORT_FORMATS.slice(0, limit).map((r, i) => (
        <Box
          key={r.code}
          sx={{
            ...surface(tone),
            '--r': `${((i % 3) - 1) * 2.5}deg`,
            width: 128,
            p: 1.5,
            borderRadius: 2,
            ...motion(`${floatSlow} ${4 + (i % 4) * 0.7}s ease-in-out ${i * 0.3}s infinite`),
          }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>{r.code}</Typography>
            <Box
              sx={{
                fontSize: 9,
                fontWeight: 800,
                px: 0.6,
                borderRadius: 0.75,
                bgcolor: 'var(--soft)',
                color: 'var(--muted)',
              }}
            >
              PDF
            </Box>
          </Stack>
          {[100, 82, 92, 60, 76].map((w, li) => (
            <Box
              key={li}
              sx={{
                height: 5,
                width: `${w}%`,
                borderRadius: 3,
                bgcolor: 'var(--line)',
                mb: 0.75,
                transformOrigin: 'left',
                ...motion(`${growX} .6s ease-out ${0.3 + li * 0.1 + i * 0.05}s backwards`),
              }}
            />
          ))}
          <Typography variant="caption" sx={{ color: 'var(--muted)', fontSize: 10 }}>
            {r.place}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

const LEAVES = [
  { left: 6, size: 22, dur: 16, delay: 0, dx: 60 },
  { left: 18, size: 14, dur: 22, delay: 5, dx: -40 },
  { left: 31, size: 26, dur: 19, delay: 9, dx: 50 },
  { left: 44, size: 16, dur: 24, delay: 2, dx: -60 },
  { left: 57, size: 20, dur: 18, delay: 12, dx: 40 },
  { left: 69, size: 12, dur: 21, delay: 7, dx: -30 },
  { left: 80, size: 24, dur: 17, delay: 3, dx: 55 },
  { left: 92, size: 15, dur: 23, delay: 10, dx: -45 },
];

/**
 * Decorative leaves. `fall` drifts them down the whole section, `float` keeps them bobbing in place.
 * Put inside a `position: relative; overflow: hidden` parent.
 */
export function FloatingLeaves({
  tone = 'light',
  mode = 'fall',
  count = LEAVES.length,
}: {
  tone?: Tone;
  mode?: 'fall' | 'float';
  count?: number;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        ...toneVars(tone),
        '--leaf-vein': tone === 'dark' ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-background-default)',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {LEAVES.slice(0, count).map((l, i) => (
        <Box
          key={i}
          component="svg"
          viewBox="0 0 64 64"
          sx={{
            position: 'absolute',
            top: mode === 'fall' ? 0 : `${((i * 37) % 76) + 6}%`,
            left: `${l.left}%`,
            width: l.size,
            height: l.size,
            color: 'var(--accent)',
            opacity: mode === 'fall' ? 0 : 0.55,
            '--dx': `${l.dx}px`,
            '--r0': `${-20 + (i % 3) * 15}deg`,
            '--r1': `${15 + (i % 4) * 10}deg`,
            ...(mode === 'fall'
              ? motion(`${drift} ${l.dur}s linear ${l.delay}s infinite`)
              : motion(`${leafFloat} ${5 + (i % 4)}s ease-in-out ${-i}s infinite`)),
          }}
        >
          <path d="M8 56c0-24 15-40 48-44-1 30-17 46-42 46-2 0-4-1-6-2z" fill="currentColor" />
          <path
            d="M12 54c10-12 22-24 36-34"
            stroke="var(--leaf-vein)"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </Box>
      ))}
    </Box>
  );
}

const SCOPE_ICONS = [
  <LocalFireDepartmentOutlined key="1" />,
  <BoltOutlined key="2" />,
  <LocalShippingOutlined key="3" />,
];
const SCOPE_BARS = [78, 54, 92];

/** Scope 1 / 2 / 3 explained, each with a pulsing icon and an example bar. */
export function ScopeCards({ tone = 'light' }: { tone?: Tone }) {
  return (
    <Grid container spacing={3} sx={toneVars(tone)}>
      {SCOPES.map((s, i) => (
        <Grid key={s.name} size={{ xs: 12, md: 4 }}>
          <Stack
            spacing={1.5}
            sx={{
              ...surface(tone),
              height: '100%',
              p: 3,
              transition: (t) => t.transitions.create(['transform', 'border-color']),
              '&:hover': { transform: 'translateY(-4px)', borderColor: 'var(--accent)' },
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--accent)',
                  bgcolor: 'var(--soft)',
                }}
              >
                {SCOPE_ICONS[i]}
              </Box>
              <Chip size="small" label={s.tag} sx={{ bgcolor: 'var(--soft)', color: 'inherit' }} />
            </Stack>
            <Typography variant="h5" component="h3">
              {s.name}
            </Typography>
            <Typography sx={{ color: 'var(--muted)' }}>{s.text}</Typography>
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
                e.g. {s.example}
              </Typography>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'var(--soft)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${SCOPE_BARS[i]}%`,
                    borderRadius: 4,
                    bgcolor: 'var(--accent)',
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}

const AUDIENCE_ICONS: ReactNode[] = [
  <InsightsOutlined key="a" />,
  <GavelOutlined key="b" />,
  <VerifiedOutlined key="c" />,
  <StarsOutlined key="d" />,
];

/** Who gets what, for stakeholders skimming the page. */
export function AudienceCards({ tone = 'light' }: { tone?: Tone }) {
  return (
    <Grid container spacing={2.5} sx={toneVars(tone)}>
      {AUDIENCES.map((a, i) => (
        <Grid key={a.role} size={{ xs: 12, sm: 6, md: 3 }}>
          <Stack
            spacing={1.25}
            sx={{
              ...surface(tone),
              height: '100%',
              p: 2.75,
              transition: (t) => t.transitions.create(['transform', 'border-color']),
              '&:hover': { transform: 'translateY(-4px)', borderColor: 'var(--accent)' },
              ...motion(`${fadeUp} .6s ease-out ${i * 0.12}s backwards`),
            }}
          >
            <Box sx={{ color: 'var(--accent)' }}>{AUDIENCE_ICONS[i]}</Box>
            <Typography variant="h6" component="h3" sx={{ fontSize: 18 }}>
              {a.role}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
              {a.text}
            </Typography>
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}
