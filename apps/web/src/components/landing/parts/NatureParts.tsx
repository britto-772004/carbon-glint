import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import TimelineOutlined from '@mui/icons-material/TimelineOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';
import { BrandLogo } from '../../common/BrandMark';
import { STATS, STEPS } from '../landingContent';
import {
  bubbleRise,
  drawLine,
  growX,
  growY,
  ping,
  fadeUp,
  firefly,
  float,
  glowText,
  motion,
  popIn,
  onScroll,
  slideInSoft,
  slot5Bar,
  slot5Card,
  slot5Fade,
  splashOut,
  spin,
  statFloat,
  trackFill,
} from '../motion';
import { SectionHeading } from './LandingChrome';
import { surface, toneVars } from './tokens';

/** Full-screen intro: a brush ring draws itself around the logo, then the whole thing fades away (about 3s). */
export function SplashIntro() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (t) => t.zIndex.modal,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        ...motion(`${splashOut} 3.4s ease-in forwards`),
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    >
      <Box sx={{ position: 'relative', width: { xs: 220, md: 280 }, height: { xs: 220, md: 280 } }}>
        <Box
          component="svg"
          viewBox="0 0 200 200"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {[
            { w: 9, o: 0.9, delay: 0.1 },
            { w: 3, o: 0.5, delay: 0.35 },
          ].map((s) => (
            <Box
              key={s.w}
              component="circle"
              cx={100}
              cy={100}
              r={82}
              pathLength={100}
              transform="rotate(-110 100 100)"
              sx={{
                fill: 'none',
                stroke: 'var(--mui-palette-primary-main)',
                strokeOpacity: s.o,
                strokeWidth: s.w,
                strokeLinecap: 'round',
                strokeDasharray: 100,
                ...motion(`${drawLine} 1.5s ease-in-out ${s.delay}s backwards`),
              }}
            />
          ))}
        </Box>
        <Stack
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            ...motion(`${popIn} .7s cubic-bezier(.3,1.6,.5,1) 1.1s backwards`),
          }}
        >
          <BrandLogo size={84} />
          <Typography sx={{ mt: 1.5, fontWeight: 800, letterSpacing: 4, fontSize: 13, color: 'primary.main' }}>
            CARBON GLINT
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

/** Glowing dots wandering through the section, like fireflies at dusk. */
export function Fireflies({ count = 14 }: { count?: number }) {
  return (
    <Box
      aria-hidden
      sx={{ ...toneVars('dark'), position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: `${(i * 71) % 96}%`,
            top: `${18 + ((i * 37) % 62)}%`,
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: 'var(--accent)',
            boxShadow: '0 0 12px 3px var(--glow)',
            opacity: 0,
            '--fx': `${((i % 5) - 2) * 18}px`,
            '--fy': `${-20 - (i % 4) * 14}px`,
            ...motion(`${firefly} ${7 + (i % 6)}s ease-in-out ${-i * 1.3}s infinite`),
          }}
        />
      ))}
    </Box>
  );
}

/** CO₂ bubbles rising and fading away. */
export function RisingBubbles({ count = 8 }: { count?: number }) {
  return (
    <Box
      aria-hidden
      sx={{ ...toneVars('dark'), position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {Array.from({ length: count }, (_, i) => {
        const size = 28 + ((i * 13) % 22);
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              bottom: '12%',
              left: `${(i * 13 + 8) % 92}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 800,
              color: 'var(--accent)',
              border: '1.5px solid var(--accent)',
              opacity: 0,
              ...motion(`${bubbleRise} ${8 + (i % 4) * 1.5}s ease-in ${i * 1.1}s infinite`),
            }}
          >
            CO₂
          </Box>
        );
      })}
    </Box>
  );
}

/** Round badge for the hero: logo in a ring of slowly turning text. */
export function HeroBadge() {
  const id = useId();
  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 200, sm: 240, md: 280, lg: 340 },
        height: { xs: 200, sm: 240, md: 280, lg: 340 },
        mx: 'auto',
        ...motion(`${float} 6s ease-in-out infinite`),
      }}
    >
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 240 240"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          color: 'secondary.light',
          ...motion(`${spin} 40s linear infinite`),
        }}
      >
        <defs>
          <path id={`${id}ring`} d="M120 120 m-104 0 a104 104 0 1 1 208 0 a104 104 0 1 1 -208 0" />
        </defs>
        <Box component="text" sx={{ fontSize: 13, fontWeight: 800, letterSpacing: 6, fill: 'currentColor' }}>
          <textPath href={`#${id}ring`}>SCOPE 1 · SCOPE 2 · SCOPE 3 · SCOPE 1 · SCOPE 2 · SCOPE 3 ·</textPath>
        </Box>
      </Box>
      <Stack
        sx={{
          position: 'absolute',
          inset: { xs: 28, md: 36, lg: 44 },
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          border: 3,
          borderColor: 'secondary.light',
          boxShadow: (t) => `0 0 40px ${t.alpha(t.palette.secondary.light, 0.35)}`,
        }}
      >
        <BrandLogo size={84} />
        <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 12, letterSpacing: 2, color: 'primary.dark' }}>
          CARBON GLINT
        </Typography>
        <Typography sx={{ fontSize: 11, letterSpacing: 3, color: 'text.secondary' }}>— 2026 —</Typography>
      </Stack>
    </Box>
  );
}

const HERO_STATS = [...STATS, { value: '5', label: 'Steps from upload to report' }];

/** Glass bar of headline numbers. They float in a wave and every other one glows. */
export function StatsBar() {
  return (
    <Box
      sx={{
        ...toneVars('dark'),
        borderRadius: 4,
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 3 },
        bgcolor: (t) => t.alpha(t.palette.common.black, 0.38),
        backdropFilter: 'blur(10px)',
        border: 1,
        borderColor: (t) => t.alpha(t.palette.common.white, 0.14),
        ...motion(`${fadeUp} .9s ease-out .5s backwards`),
      }}
    >
      <Grid container spacing={{ xs: 2.5, md: 0 }}>
        {HERO_STATS.map((s, i) => (
          <Grid
            key={s.label}
            size={{ xs: 6, md: 'grow' }}
            sx={{
              textAlign: 'center',
              borderLeft: { md: i ? 1 : 0 },
              borderColor: (t) => t.alpha(t.palette.common.white, 0.14),
              px: 1,
            }}
          >
            <Typography
              component="p"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 28, md: 38 },
                lineHeight: 1.1,
                color: i % 2 ? 'secondary.light' : 'common.white',
                ...motion(`${statFloat} 4s ease-in-out ${i * 0.35}s infinite`),
                ...(i % 2
                  ? motion(
                      `${statFloat} 4s ease-in-out ${i * 0.35}s infinite, ${glowText} 3s ease-in-out ${i * 0.5}s infinite`,
                    )
                  : {}),
              }}
            >
              {s.value}
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.300', mt: 0.5 }}>
              {s.label}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/** Fades its content up as it scrolls into view (plays on load where scroll-driven animation isn't supported). */
export function Reveal({ children, range = 'entry 5% entry 55%' }: { children: ReactNode; range?: string }) {
  return <Box sx={{ ...motion(`${fadeUp} .8s ease-out backwards`), ...onScroll(range) }}>{children}</Box>;
}

const ROOT_NODES = [
  {
    x: 640,
    y: 90,
    icon: <AccountTreeOutlined />,
    a: 'ORG UNITS',
    b: 'YOUR BUSINESS TREE',
    d: 'M360 280 C 460 280, 500 90, 640 90',
    leaf: { x: 485, y: 185, r: -55 },
  },
  {
    x: 700,
    y: 215,
    icon: <UploadFileOutlined />,
    a: 'ACTIVITY DATA',
    b: 'CSV AND EXCEL',
    d: 'M360 280 C 470 280, 540 215, 700 215',
    leaf: { x: 511, y: 247, r: -25 },
  },
  {
    x: 700,
    y: 345,
    icon: <ScienceOutlined />,
    a: 'EMISSION FACTORS',
    b: 'PUBLIC LIBRARIES',
    d: 'M360 280 C 470 280, 540 345, 700 345',
    leaf: { x: 511, y: 313, r: 25 },
  },
  {
    x: 640,
    y: 470,
    icon: <DescriptionOutlined />,
    a: 'AUDIT-READY',
    b: 'COUNTRY REPORTS',
    d: 'M360 280 C 460 280, 500 470, 640 470',
    leaf: { x: 485, y: 375, r: 55 },
  },
];

/** Everything in the roots scene follows this wrapper's progress through the viewport. */
const roots = (from: number, to: number) => onScroll(`cover ${from}% cover ${to}%`, '--roots');

/**
 * Pinned scroll scene. The wrapper is much taller than the screen and its content sticks while you scroll through it:
 * the logo appears, a root grows out of it, splits into four branches, and each branch connects to a node as you
 * scroll. Where scroll-driven animation isn't supported the wrapper keeps its normal height and everything plays
 * once on load.
 */
export function RootsStage() {
  return (
    <Box
      component="section"
      aria-label="How your data connects"
      sx={{
        ...toneVars('light'),
        position: 'relative',
        viewTimelineName: '--roots',
        overflowX: 'clip',
        '@supports (animation-timeline: view())': { height: '270vh' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          '@supports (animation-timeline: view())': { position: 'sticky' },
          top: 72,
          minHeight: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', mb: { xs: 2, md: 3 } }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 3 }}>
              How the roots connect
            </Typography>
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: 28, md: 46 },
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              See the footprint.
              <br />
              <Box component="span" sx={{ color: 'secondary.dark' }}>
                Trace its trail.
              </Box>
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%', maxWidth: 620 }}>
              <Box sx={{ flex: 1, height: 1, bgcolor: 'secondary.main', opacity: 0.6 }} />
              <Typography sx={{ color: 'primary.main', fontWeight: 700, fontSize: { xs: 14, md: 18 } }}>
                Discover where your footprint really comes from.
              </Typography>
              <Box sx={{ flex: 1, height: 1, bgcolor: 'secondary.main', opacity: 0.6 }} />
            </Stack>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--muted)',
                ...motion(`${fadeUp} .6s ease-out 1s backwards`),
                ...roots(28, 34),
              }}
            >
              Keep scrolling and watch the roots grow.
            </Typography>
          </Stack>
          <Box
            sx={{
              position: 'relative',
              mx: 'auto',
              width: '100%',
              maxWidth: 1000,
              aspectRatio: '1000 / 560',
              maxHeight: 'calc(100vh - 340px)',
            }}
          >
            <Stack
              sx={{
                position: 'absolute',
                left: '2%',
                top: '50%',
                width: '22%',
                alignItems: 'center',
                transform: 'translateY(-50%)',
              }}
            >
              <Box sx={{ width: '100%', '& svg': { width: '100%', height: 'auto' } }}>
                <BrandLogo size={200} />
              </Box>
              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 800,
                  letterSpacing: 3,
                  fontSize: { xs: 9, md: 14 },
                  color: 'primary.dark',
                  textAlign: 'center',
                }}
              >
                CARBON GLINT
              </Typography>
            </Stack>
            <Box
              aria-hidden
              component="svg"
              viewBox="0 0 1000 560"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            >
              {/* Faint outline of the finished graphic, so the scene never looks empty before the roots grow. */}
              <g color="inherit" opacity={0.2}>
                <path
                  d="M240 285 C 290 270, 320 295, 360 280"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={5}
                  strokeDasharray="3 10"
                  strokeLinecap="round"
                />
                <circle cx={360} cy={280} r={9} fill="none" stroke="currentColor" strokeWidth={3} />
                {ROOT_NODES.map((n) => (
                  <g key={`ghost-${n.a}`}>
                    <path
                      d={n.d}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeDasharray="3 10"
                      strokeLinecap="round"
                    />
                    <circle cx={n.x} cy={n.y} r={14} fill="none" stroke="currentColor" strokeWidth={3} />
                  </g>
                ))}
              </g>
              <Box
                component="path"
                d="M240 285 C 290 270, 320 295, 360 280"
                pathLength={100}
                sx={{
                  fill: 'none',
                  stroke: 'var(--accent)',
                  strokeWidth: 7,
                  strokeLinecap: 'round',
                  strokeDasharray: 100,
                  ...motion(`${drawLine} 1s ease-out .3s backwards`),
                  ...roots(34, 42),
                }}
              />
              <Box
                component="g"
                sx={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  ...motion(`${popIn} .4s cubic-bezier(.3,1.6,.5,1) 1.2s backwards`),
                  ...roots(40, 44),
                }}
              >
                <circle cx={360} cy={280} r={11} fill="var(--accent)" />
              </Box>
              {ROOT_NODES.map((n, i) => (
                <g key={n.a}>
                  <Box
                    component="path"
                    d={n.d}
                    pathLength={100}
                    sx={{
                      fill: 'none',
                      stroke: 'var(--accent)',
                      strokeWidth: 4,
                      strokeLinecap: 'round',
                      strokeDasharray: 100,
                      ...motion(`${drawLine} 1.4s ease-out ${1.4 + i * 0.4}s backwards`),
                      ...roots(42 + i * 4, 54 + i * 4),
                    }}
                  />
                  <Box component="g" transform={`translate(${n.leaf.x} ${n.leaf.y}) rotate(${n.leaf.r})`}>
                    <Box
                      component="path"
                      d="M0 0 C -14 -16, -4 -38, 24 -42 C 26 -14, 12 2, 0 0 Z"
                      sx={{
                        fill: 'var(--accent2)',
                        transformBox: 'fill-box',
                        transformOrigin: '0% 100%',
                        ...motion(`${popIn} .5s cubic-bezier(.3,1.6,.5,1) ${2 + i * 0.4}s backwards`),
                        ...roots(46 + i * 4, 56 + i * 4),
                      }}
                    />
                  </Box>
                  <Box
                    component="g"
                    sx={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      ...motion(`${popIn} .5s cubic-bezier(.3,1.6,.5,1) ${2.4 + i * 0.4}s backwards`),
                      ...roots(52 + i * 4, 58 + i * 4),
                    }}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={14}
                      fill="var(--mui-palette-background-paper)"
                      stroke="var(--accent)"
                      strokeWidth={4}
                    />
                  </Box>
                </g>
              ))}
            </Box>
            {ROOT_NODES.map((n, i) => (
              <Stack
                key={n.a}
                direction="row"
                spacing={1.5}
                sx={{
                  position: 'absolute',
                  left: `calc(${(n.x / 1000) * 100}% + 3%)`,
                  maxWidth: `${100 - n.x / 10 - 3}%`,
                  top: `${(n.y / 560) * 100}%`,
                  transform: 'translateY(-50%)',
                  alignItems: 'center',
                  ...motion(`${slideInSoft} .6s ease-out ${2.6 + i * 0.4}s backwards`),
                  ...roots(54 + i * 4, 62 + i * 4),
                }}
              >
                <Box
                  sx={{
                    width: { xs: 30, md: 46 },
                    height: { xs: 30, md: 46 },
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: { xs: 'none', sm: 'grid' },
                    placeItems: 'center',
                    color: 'common.white',
                    bgcolor: 'primary.dark',
                    '& svg': { fontSize: { xs: 16, md: 24 } },
                  }}
                >
                  {n.icon}
                </Box>
                <Box>
                  <Typography
                    sx={{ fontWeight: 800, fontSize: { xs: 10, md: 15 }, letterSpacing: 0.8, lineHeight: 1.2 }}
                  >
                    {n.a}
                  </Typography>
                  <Typography
                    sx={{ fontSize: { xs: 9, md: 12 }, letterSpacing: 0.8, color: 'var(--muted)', lineHeight: 1.2 }}
                  >
                    {n.b}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

const ROW = 84;
/** Horizontal centre of the step circles inside the track panel (row padding 16 + circle radius 27). */
const TRACK_X = 43;
const SECONDS = 5;
const CYCLE = SECONDS * STEPS.length;

/**
 * The route of one tonne. On the left a vertical track fills stop by stop and lights up the current one; on the
 * right the matching card comes up. Every stop lasts five seconds. Pure CSS.
 * `visuals` holds one animated component per step.
 */
export function RouteJourney({ visuals }: { visuals: ReactNode[] }) {
  const trackHeight = ROW * (STEPS.length - 1);
  return (
    <Box
      component="section"
      id="how-it-works"
      sx={{
        ...toneVars('light'),
        scrollMarginTop: 72,
        bgcolor: 'background.paper',
        borderBlock: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <SectionHeading
            eyebrow="The route of a tonne"
            title="From spreadsheet to report in five stops"
            text="Every five seconds the journey moves on to the next stop."
          />
        </Reveal>
        <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              aria-hidden
              sx={{
                ...surface('light'),
                position: 'relative',
                maxWidth: 380,
                mx: { xs: 'auto', md: 0 },
                py: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: TRACK_X - 1,
                  top: ROW / 2 + 8,
                  width: 2,
                  height: trackHeight,
                  bgcolor: 'var(--line)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: TRACK_X - 1,
                  top: ROW / 2 + 8,
                  width: 2,
                  height: trackHeight,
                  bgcolor: 'var(--accent)',
                  transformOrigin: 'top',
                  transform: 'scaleY(0)',
                  ...motion(`${trackFill} ${CYCLE}s ease-in-out infinite`),
                }}
              />
              {STEPS.map((s, i) => (
                <Stack
                  key={s.short}
                  direction="row"
                  useFlexGap
                  spacing={2}
                  sx={{ position: 'relative', height: ROW, px: 2, alignItems: 'center' }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: '6px 8px',
                      borderRadius: 3,
                      bgcolor: 'var(--soft)',
                      opacity: i === 0 ? 1 : 0,
                      ...motion(`${slot5Fade} ${CYCLE}s linear ${i * SECONDS}s infinite backwards`),
                    }}
                  />
                  <Box
                    sx={{
                      position: 'relative',
                      width: 54,
                      height: 54,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'background.paper',
                      border: '2px solid var(--line)',
                      color: 'var(--accent)',
                    }}
                  >
                    {s.icon}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: -2,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'var(--accent)',
                        color: 'common.white',
                        opacity: i === 0 ? 1 : 0,
                        ...motion(`${slot5Fade} ${CYCLE}s linear ${i * SECONDS}s infinite backwards`),
                      }}
                    >
                      {s.icon}
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: 1.5 }}>
                      STEP {i + 1}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{s.short}</Typography>
                    <Typography variant="caption" noWrap sx={{ display: 'block', color: 'var(--muted)' }}>
                      {s.title}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box
              component="ol"
              aria-label="How Carbon Glint works"
              sx={{ display: 'grid', listStyle: 'none', m: 0, p: 0 }}
            >
              {STEPS.map((s, i) => (
                <Box
                  component="li"
                  key={s.short}
                  sx={{
                    gridArea: '1 / 1',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: i === 0 ? 1 : 0,
                    pointerEvents: 'none',
                    ...motion(`${slot5Card} ${CYCLE}s ease-in-out ${i * SECONDS}s infinite backwards`),
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: 3 }}>
                    Step {i + 1} · {s.short}
                  </Typography>
                  <Typography
                    variant="h3"
                    component="h3"
                    sx={{
                      fontSize: { xs: 26, md: 36 },
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.1,
                      mt: 0.5,
                    }}
                  >
                    {s.title}
                  </Typography>
                  <Box sx={{ height: 3, bgcolor: 'var(--line)', borderRadius: 2, overflow: 'hidden', my: 2 }}>
                    <Box
                      sx={{
                        height: '100%',
                        bgcolor: 'var(--accent)',
                        transformOrigin: 'left',
                        transform: i === 0 ? 'scaleX(1)' : 'scaleX(0)',
                        ...motion(`${slot5Bar} ${CYCLE}s linear ${i * SECONDS}s infinite backwards`),
                      }}
                    />
                  </Box>
                  <Typography sx={{ color: 'var(--muted)', mb: 3, maxWidth: 520 }}>{s.text}</Typography>
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      // Panels stretch to fill the slot (the tallest card sets its height) ; each panel spreads or centres its own content.
                      '& > *': {
                        flex: 1,
                        height: 'auto !important',
                        display: 'flex',
                        flexDirection: 'column',
                      },
                    }}
                  >
                    {visuals[i]}
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

const PILLAR_ICONS = [<GridViewOutlined key="m" />, <TimelineOutlined key="t" />, <DescriptionOutlined key="r" />];
/** Cards follow the container's progress through the viewport, one slightly after the other. */
const pillar = (from: number, to: number) => onScroll(`entry ${from}% entry ${to}%`, '--pillars');

function PillarMini({ index }: { index: number }) {
  if (index === 0) {
    return (
      <Stack direction="row" spacing={1} sx={{ height: 56, alignItems: 'flex-end', justifyContent: 'center' }}>
        {[45, 80, 60, 100].map((h, i) => (
          <Box
            key={i}
            sx={{
              width: 14,
              height: `${h}%`,
              borderRadius: 1,
              bgcolor: i === 3 ? 'var(--accent)' : 'var(--accent2)',
              transformOrigin: 'bottom',
              ...motion(`${growY} .8s ease-out ${i * 0.12}s backwards`),
              ...pillar(30 + i * 4, 100),
            }}
          />
        ))}
      </Stack>
    );
  }
  if (index === 1) {
    return (
      <Stack direction="row" sx={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2, 3].map((i) => (
          <Stack key={i} direction="row" sx={{ alignItems: 'center' }}>
            <Box sx={{ position: 'relative', width: 14, height: 14 }}>
              {i === 3 && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    bgcolor: 'var(--accent)',
                    ...motion(`${ping} 2.2s ease-out infinite`),
                  }}
                />
              )}
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'var(--accent)' }} />
            </Box>
            {i < 3 && (
              <Box
                sx={{
                  width: 34,
                  height: 3,
                  bgcolor: 'var(--accent)',
                  opacity: 0.5,
                  transformOrigin: 'left',
                  ...motion(`${growX} .6s ease-out ${i * 0.2}s backwards`),
                  ...pillar(30 + i * 4, 100),
                }}
              />
            )}
          </Stack>
        ))}
      </Stack>
    );
  }
  return (
    <Stack spacing={0.75} sx={{ height: 56, justifyContent: 'center', alignItems: 'center' }}>
      {[100, 78, 90].map((w, i) => (
        <Box
          key={i}
          sx={{
            width: `${w}%`,
            maxWidth: 120,
            height: 6,
            borderRadius: 3,
            bgcolor: i === 0 ? 'var(--accent)' : 'var(--line)',
            transformOrigin: 'left',
            ...motion(`${growX} .7s ease-out ${i * 0.15}s backwards`),
            ...pillar(30 + i * 4, 100),
          }}
        />
      ))}
    </Stack>
  );
}

/**
 * Three pillars joined by a line that draws itself as the block scrolls into view. Each numbered badge sits on the
 * line, and each card rises after the one before it.
 */
export function PillarCards({ items }: { items: { title: string; text: string }[] }) {
  return (
    <Box sx={{ ...toneVars('light'), position: 'relative', viewTimelineName: '--pillars' }}>
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          left: '16.66%',
          right: '16.66%',
          top: 27,
          height: 3,
          borderRadius: 2,
          bgcolor: 'var(--line)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          left: '16.66%',
          right: '16.66%',
          top: 27,
          height: 3,
          borderRadius: 2,
          bgcolor: 'var(--accent)',
          transformOrigin: 'left',
          ...motion(`${growX} 1.4s ease-out .3s backwards`),
          ...pillar(0, 90),
        }}
      />
      <Grid container spacing={{ xs: 4, md: 3 }}>
        {items.map((it, i) => (
          <Grid key={it.title} size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
            <Stack sx={{ width: '100%', alignItems: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 20,
                  color: 'var(--accent)',
                  bgcolor: 'background.paper',
                  border: '3px solid var(--accent)',
                  mb: 2,
                }}
              >
                {`0${i + 1}`}
              </Box>
              <Stack
                spacing={1.5}
                sx={{
                  ...surface('light'),
                  flex: 1,
                  width: '100%',
                  p: 3.5,
                  alignItems: 'center',
                  textAlign: 'center',
                  ...motion(`${fadeUp} .7s ease-out ${i * 0.2}s backwards`),
                  ...pillar(i * 8, 55 + i * 10),
                  transition: (th) => th.transitions.create(['transform', 'border-color', 'box-shadow']),
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    borderColor: 'var(--accent)',
                    boxShadow: '0 16px 36px var(--glow)',
                  },
                }}
              >
                <Box sx={{ color: 'var(--accent)' }}>{PILLAR_ICONS[i]}</Box>
                <Typography variant="h5" component="h3">
                  {it.title}
                </Typography>
                <Typography sx={{ color: 'var(--muted)' }}>{it.text}</Typography>
                <Box sx={{ pt: 1, width: '100%' }}>
                  <PillarMini index={i} />
                </Box>
              </Stack>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
