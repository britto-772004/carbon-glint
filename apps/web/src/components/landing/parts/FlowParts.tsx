import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import Check from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { drawLine, fadeUp, marchDash, motion, ping, popIn, scanFlash } from '../motion';
import { surface, toneVars, type Tone } from './tokens';

const SHEET_COLUMNS = ['Fuel', 'Site', 'Litres', 'Date'];
const GHG_FIELDS = ['Org unit', 'Activity', 'Quantity', 'Period'];
/** Spreadsheet column index → GHG field index (deliberately crossed, to show the matching). */
const COLUMN_TO_FIELD = [1, 0, 2, 3];
const ROW = 36;
const GAP = 14;

function MapCell({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <Box
      sx={{
        height: ROW,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        borderRadius: 2,
        border: 1,
        borderColor: accent ? 'var(--accent)' : 'var(--line)',
        bgcolor: accent ? 'var(--soft)' : 'transparent',
        fontSize: 13,
        fontWeight: accent ? 700 : 500,
        fontFamily: accent ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      {children}
    </Box>
  );
}

/** Upload → AI column mapping: spreadsheet headers linked to GHG fields by marching dashed lines. */
export function UploadMapping({ tone = 'light' }: { tone?: Tone }) {
  const rows = SHEET_COLUMNS.length;
  const center = (k: number) => ((k + 0.5) / rows) * 100;
  return (
    <Box aria-hidden sx={{ ...toneVars(tone), ...surface(tone), p: 2.5, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700 }}>
          fuel_log_q3.xlsx
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700 }}>
          GHG fields
        </Typography>
      </Stack>
      {/* Four equal rows, so the lines (drawn in a 0-100 box) always meet the cell centres at any height. */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
        <Box sx={{ width: '34%', display: 'grid', gridTemplateRows: `repeat(${rows}, minmax(${ROW + GAP}px, 1fr))` }}>
          {SHEET_COLUMNS.map((c) => (
            <Box key={c} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%' }}>
                <MapCell>{c}</MapCell>
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ position: 'relative', flex: 1 }}>
          <Box
            component="svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              overflow: 'visible',
            }}
          >
            {COLUMN_TO_FIELD.map((to, from) => (
              <Box
                key={from}
                component="path"
                d={`M0 ${center(from)} C 50 ${center(from)}, 50 ${center(to)}, 100 ${center(to)}`}
                vectorEffect="non-scaling-stroke"
                sx={{
                  fill: 'none',
                  stroke: 'var(--accent)',
                  strokeWidth: 2,
                  strokeDasharray: '5 5',
                  strokeLinecap: 'round',
                  ...motion(`${marchDash} 1.1s linear ${from * 0.15}s infinite`),
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              m: 'auto',
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'common.white',
              bgcolor: 'var(--accent)',
              boxShadow: '0 0 16px var(--glow)',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: 2,
                borderColor: 'var(--accent)',
                ...motion(`${ping} 2s ease-out infinite`),
              },
            }}
          >
            <AutoAwesomeOutlined sx={{ fontSize: 18 }} />
          </Box>
        </Box>
        <Box sx={{ width: '34%', display: 'grid', gridTemplateRows: `repeat(${rows}, minmax(${ROW + GAP}px, 1fr))` }}>
          {GHG_FIELDS.map((f) => (
            <Box key={f} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%' }}>
                <MapCell accent>{f}</MapCell>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 2, color: 'var(--accent)' }}>
        <Check sx={{ fontSize: 18 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          4 of 4 columns matched · you confirm before anything is calculated
        </Typography>
      </Stack>
    </Box>
  );
}

const CANDIDATES = [
  { name: 'Diesel (average biofuel blend)', value: '2.68', picked: true },
  { name: 'Diesel (100% mineral diesel)', value: '2.70', picked: false },
  { name: 'Gas oil', value: '2.76', picked: false },
];

/** Factor matching and the deterministic calculation. Each candidate is weighed in turn; the AI's pick pops in. */
export function FactorMatch({ tone = 'light' }: { tone?: Tone }) {
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
      <Box>
        <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700 }}>
          Activity
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>Diesel · 156,200 L · Chennai plant</Typography>
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 700 }}>
          Candidate factors from the library
        </Typography>
        <Stack spacing={1} sx={{ mt: 1, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
          {CANDIDATES.map((c, i) => (
            <Stack
              key={c.name}
              direction="row"
              spacing={1.5}
              sx={{
                minHeight: 44,
                alignItems: 'center',
                px: 1.5,
                py: 1,
                position: 'relative',
                borderRadius: 2,
                border: 1,
                borderColor: c.picked ? 'var(--accent)' : 'var(--line)',
                bgcolor: c.picked ? 'var(--soft)' : 'transparent',
                ...motion(`${fadeUp} .6s ease-out ${0.15 * i}s backwards`),
              }}
            >
              {!c.picked && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 2,
                    border: '1.5px solid var(--accent)',
                    opacity: 0,
                    pointerEvents: 'none',
                    ...motion(`${scanFlash} 4.5s ease-in-out ${(i - 1) * 1.5}s infinite backwards`),
                  }}
                />
              )}
              <Box sx={{ flex: 1, fontSize: 13, fontWeight: c.picked ? 700 : 500 }}>{c.name}</Box>
              <Box sx={{ fontSize: 12, color: 'var(--muted)' }}>{c.value} kgCO₂e/L</Box>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: c.picked ? 'var(--accent)' : 'transparent',
                  color: 'common.white',
                  ...(c.picked && motion(`${popIn} .5s cubic-bezier(.3,1.6,.5,1) 1.2s backwards`)),
                }}
              >
                {c.picked && <Check sx={{ fontSize: 14 }} />}
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Box>
        <Stack
          direction="row"
          useFlexGap
          sx={{ gap: 0.75, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, fontWeight: 700 }}
        >
          {['156,200 L', '× 1.00', '× 2.68 kgCO₂e/L'].map((p) => (
            <Box key={p} sx={{ px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'var(--soft)' }}>
              {p}
            </Box>
          ))}
          <Box component="span">=</Box>
          <Box sx={{ px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'var(--accent)', color: 'common.white' }}>
            418.6 tCO₂e
          </Box>
        </Stack>
        <Typography variant="caption" sx={{ color: 'var(--muted)', display: 'block', mt: 1 }}>
          AI picks the factor. It never produces the number.
        </Typography>
      </Box>
    </Box>
  );
}

const REGIONS = [
  { x: 64, label: 'South' },
  { x: 160, label: 'West' },
  { x: 256, label: 'North' },
];
const PLANTS = [
  { x: 34, label: 'Chennai', from: 64 },
  { x: 94, label: 'Hosur', from: 64 },
  { x: 160, label: 'Pune', from: 160 },
  { x: 226, label: 'Delhi', from: 256 },
  { x: 286, label: 'Noida', from: 256 },
];
const Y = { root: 24, region: 92, plant: 160 };

const link = (x1: number, y1: number, x2: number, y2: number) =>
  `M${x1} ${y1 + 13} C ${x1} ${y1 + 42}, ${x2} ${y2 - 42}, ${x2} ${y2 - 13}`;

function TreeNode({
  x,
  y,
  label,
  delay,
  strong,
}: {
  x: number;
  y: number;
  label: string;
  delay: number;
  strong?: boolean;
}) {
  return (
    <Box
      component="g"
      sx={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        ...motion(`${popIn} .5s cubic-bezier(.3,1.6,.5,1) ${delay}s backwards`),
      }}
    >
      <Box
        component="rect"
        x={x - 29}
        y={y - 13}
        width={58}
        height={26}
        rx={8}
        sx={{ fill: strong ? 'var(--accent)' : 'var(--soft)', stroke: 'var(--accent)', strokeWidth: 1.2 }}
      />
      <Box
        component="text"
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        sx={{ fontSize: 10, fontWeight: 700, fill: strong ? 'var(--mui-palette-common-white)' : 'currentColor' }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** Business-unit tree: links draw themselves, units pop in. */
export function OrgTree({ tone = 'light' }: { tone?: Tone }) {
  return (
    <Box aria-hidden sx={{ ...toneVars(tone), ...surface(tone), p: 2.5 }}>
      <Box component="svg" viewBox="0 0 320 184" sx={{ width: '100%', display: 'block' }}>
        {REGIONS.map((r, i) => (
          <Box
            key={r.label}
            component="path"
            d={link(160, Y.root, r.x, Y.region)}
            pathLength={100}
            sx={{
              fill: 'none',
              stroke: 'var(--accent)',
              strokeWidth: 1.5,
              strokeDasharray: 100,
              strokeOpacity: 0.7,
              ...motion(`${drawLine} .9s ease-out ${0.4 + i * 0.12}s backwards`),
            }}
          />
        ))}
        {PLANTS.map((p, i) => (
          <Box
            key={p.label}
            component="path"
            d={link(p.from, Y.region, p.x, Y.plant)}
            pathLength={100}
            sx={{
              fill: 'none',
              stroke: 'var(--accent)',
              strokeWidth: 1.5,
              strokeDasharray: 100,
              strokeOpacity: 0.7,
              ...motion(`${drawLine} .9s ease-out ${1 + i * 0.1}s backwards`),
            }}
          />
        ))}
        <TreeNode x={160} y={Y.root} label="HQ" delay={0} strong />
        {REGIONS.map((r, i) => (
          <TreeNode key={r.label} x={r.x} y={Y.region} label={r.label} delay={0.7 + i * 0.12} />
        ))}
        {PLANTS.map((p, i) => (
          <TreeNode key={p.label} x={p.x} y={Y.plant} label={p.label} delay={1.4 + i * 0.1} />
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: 'var(--muted)', display: 'block', mt: 1 }}>
        Plants roll up to regions, regions roll up to HQ. Drag a unit to re-parent it.
      </Typography>
    </Box>
  );
}
