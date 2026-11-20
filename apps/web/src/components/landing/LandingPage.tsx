import type { ReactNode } from 'react';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import TimelineOutlined from '@mui/icons-material/TimelineOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../common/BrandMark';

/** Translucent brand green that follows the active color scheme. */
const tint = (opacity: number) => (t: Theme) => t.alpha((t.vars ?? t).palette.primary.main, opacity);

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Why Carbon Glint', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

const STANDARDS = ['GHG Protocol', 'BRSR', 'SB 253', 'AASB S2', 'SGX', 'UAE', 'DEFRA', 'ADEME', 'US EPA', 'IPCC'];

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <AccountTreeOutlined />,
    title: 'Model your organisation',
    text: 'Map branches, plants and campuses as a parent/child tree, so every number rolls up the way your business does.',
  },
  {
    icon: <UploadFileOutlined />,
    title: 'Upload activity data',
    text: 'Drop in CSV or Excel files. AI maps your columns to GHG fields, so there are no templates to fight with.',
  },
  {
    icon: <ScienceOutlined />,
    title: 'Public emission factors',
    text: 'DEFRA, ADEME, EPA, IPCC and national grid factors, matched to each activity automatically.',
  },
  {
    icon: <TimelineOutlined />,
    title: 'Full traceability',
    text: 'Every tonne links back to its source row and the exact factor used to calculate it.',
  },
  {
    icon: <GridViewOutlined />,
    title: 'Drill-down insight',
    text: 'Heatmaps by scope, category, activity and business unit show where your footprint really comes from.',
  },
  {
    icon: <DescriptionOutlined />,
    title: 'Country-ready reports',
    text: 'Export BRSR, SB 253, AASB S2, SGX, UAE and more as a PDF in your regulator’s format.',
  },
];

const STATS = [
  { value: '3', label: 'Scopes covered: 1, 2 and 3' },
  { value: '15', label: 'Scope 3 categories supported' },
  { value: '4+', label: 'Public emission factor libraries' },
  { value: '1', label: 'Click from data to PDF report' },
];

const STEPS = [
  { title: 'Map your organisation', text: 'Add your business units once: HQ, regions, sites and plants.' },
  { title: 'Upload activity data', text: 'Fuel, electricity, travel, purchases. Any CSV or Excel layout works.' },
  {
    title: 'Calculate and verify',
    text: 'Emissions are calculated per row with the matching factor, ready to review.',
  },
  { title: 'Report with confidence', text: 'Generate a country-format ESG report your auditors can trace.' },
];

const WHY = [
  'Every figure is traceable to a source row and an emission factor',
  'Override a factor with a reason, and the change is recorded',
  'Ask the AI assistant questions about your own emissions data',
  'Invite your team, with roles for admins and contributors',
];

const FAQ = [
  {
    q: 'Which emissions does Carbon Glint cover?',
    a: 'Scope 1 (direct), Scope 2 (purchased energy) and Scope 3 (value chain) emissions, organised by the GHG Protocol categories.',
  },
  {
    q: 'Where do the emission factors come from?',
    a: 'From public databases such as DEFRA, ADEME, US EPA, IPCC and national electricity grid factors. You can see exactly which factor was used for every calculation.',
  },
  {
    q: 'Do I need to reformat my spreadsheets?',
    a: 'No. Upload your existing CSV or Excel files and the AI suggests how each column maps to a GHG field. You confirm the mapping before anything is calculated.',
  },
  {
    q: 'Which report formats can I export?',
    a: 'Country formats including BRSR (India), SB 253 (California), AASB S2 (Australia), SGX (Singapore) and UAE, exported as PDF.',
  },
];

export interface LandingPageProps {
  isSignedIn: boolean;
  appPath: string;
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Stack
      spacing={1.5}
      sx={{ textAlign: 'center', alignItems: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 5, md: 7 } }}
    >
      <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h2" sx={{ fontSize: { xs: 30, md: 40 }, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {text && (
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, fontSize: { xs: 16, md: 18 } }}>
          {text}
        </Typography>
      )}
    </Stack>
  );
}

/** Illustrative product preview for the hero (decorative, not live data). */
function ProductPreview() {
  const scopes = [
    { label: 'Scope 1', value: 32, color: 'primary.main' },
    { label: 'Scope 2', value: 21, color: 'secondary.main' },
    { label: 'Scope 3', value: 47, color: 'primary.light' },
  ];
  return (
    <Box aria-hidden sx={{ position: 'relative', px: { xs: 0, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: 1,
          borderColor: 'divider',
          boxShadow: (t) => `0 24px 60px ${t.alpha(t.palette.primary.dark, 0.18)}`,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Carbon footprint · FY 2026
          </Typography>
          <Chip size="small" label="Audit-ready" color="success" variant="outlined" />
        </Stack>
        <Typography variant="h3" component="p" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          12,480
          <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
            tCO₂e
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', my: 2.5 }}>
          {scopes.map((s) => (
            <Box key={s.label} sx={{ width: `${s.value}%`, bgcolor: s.color }} />
          ))}
        </Box>
        <Grid container spacing={1.5}>
          {scopes.map((s) => (
            <Grid key={s.label} size={4}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: tint(0.06) }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {s.value}%
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Stack spacing={1.25} sx={{ mt: 2.5 }}>
          {[
            ['Diesel — Chennai plant', 78],
            ['Grid electricity — HQ', 54],
            ['Business travel', 36],
          ].map(([name, w]) => (
            <Box key={name as string}>
              <Typography variant="caption" color="text.secondary">
                {name}
              </Typography>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: tint(0.08) }}>
                <Box sx={{ height: '100%', width: `${w}%`, borderRadius: 4, bgcolor: 'primary.main' }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          position: 'absolute',
          left: { sm: -8, md: -24 },
          bottom: -28,
          p: 1.5,
          pr: 2.5,
          gap: 1.5,
          alignItems: 'center',
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          boxShadow: (t) => `0 12px 30px ${t.alpha(t.palette.primary.dark, 0.16)}`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'secondary.main',
            color: 'secondary.contrastText',
          }}
        >
          <AutoAwesomeOutlined fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2">AI column mapping</Typography>
          <Typography variant="caption" color="text.secondary">
            12 of 12 columns matched
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export function LandingPage({ isSignedIn, appPath }: LandingPageProps) {
  const primaryCta = isSignedIn
    ? { to: appPath, label: 'Open workspace' }
    : { to: '/signup', label: 'Start with your work email' };

  return (
    <Box sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      {/* Header */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
            <Link component={RouterLink} to="/" underline="none" aria-label="Carbon Glint home">
              <BrandMark />
            </Link>
            <Stack
              component="nav"
              aria-label="Page sections"
              direction="row"
              spacing={0.5}
              sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, justifyContent: 'center' }}
            >
              {NAV_LINKS.map((l) => (
                <Button key={l.href} href={l.href} color="inherit" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {l.label}
                </Button>
              ))}
            </Stack>
            <Box sx={{ flex: { xs: 1, md: 0 } }} />
            {isSignedIn ? (
              <Button component={RouterLink} to={appPath} variant="contained">
                Open workspace
              </Button>
            ) : (
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button component={RouterLink} to="/login" color="inherit">
                  Sign in
                </Button>
                <Button component={RouterLink} to="/signup" variant="contained">
                  Get started
                </Button>
              </Stack>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <main>
        {/* Hero */}
        <Box
          component="section"
          sx={{
            bgcolor: (t) => tint(0.06)(t),
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 7, md: 12 } }}>
            <Grid container spacing={{ xs: 7, md: 6 }} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <Chip
                    label="GHG Protocol-aligned carbon accounting"
                    color="primary"
                    variant="outlined"
                    sx={{ alignSelf: 'flex-start', bgcolor: tint(0.06) }}
                  />
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{ fontSize: { xs: 38, sm: 46, md: 56 }, lineHeight: 1.08, letterSpacing: '-0.03em' }}
                  >
                    Carbon accounting your{' '}
                    <Box component="span" sx={{ color: 'primary.main' }}>
                      auditors will trust.
                    </Box>
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ fontWeight: 400, fontSize: { xs: 17, md: 19 } }}
                  >
                    Measure Scope 1, 2 and 3 emissions across every business unit, trace each number to its emission
                    factor, and export country-format ESG reports in minutes.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      component={RouterLink}
                      to={primaryCta.to}
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForward />}
                      sx={{ px: 3, py: 1.4 }}
                    >
                      {primaryCta.label}
                    </Button>
                    {!isSignedIn && (
                      <Button
                        component={RouterLink}
                        to="/login"
                        size="large"
                        variant="outlined"
                        sx={{ px: 3, py: 1.4 }}
                      >
                        I already have an account
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ pt: 1 }}>
                    {['Scope 1, 2 & 3', 'Audit-ready traceability', 'Country-format reports'].map((t) => (
                      <Stack key={t} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <CheckCircle color="secondary" sx={{ fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                          {t}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ProductPreview />
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Standards strip */}
        <Box
          component="section"
          aria-label="Standards and data sources"
          sx={{ borderBlock: 1, borderColor: 'divider' }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', mb: 2.5, fontWeight: 600, letterSpacing: 0.5 }}
            >
              Built around the standards and factor libraries your auditors already use
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: { xs: 1.5, md: 4 } }}
            >
              {STANDARDS.map((s) => (
                <Typography
                  key={s}
                  variant="h6"
                  sx={{ color: 'text.disabled', fontWeight: 700, fontSize: { xs: 15, md: 18 } }}
                >
                  {s}
                </Typography>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* Features */}
        <Box component="section" id="features" sx={{ scrollMarginTop: 72 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to measure and report emissions"
              text="From raw spreadsheets to a regulator-ready report, in one place."
            />
            <Grid container spacing={3}>
              {FEATURES.map((f) => (
                <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      transition: (t) => t.transitions.create(['box-shadow', 'transform', 'border-color']),
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: 'primary.main',
                        boxShadow: (t) => `0 16px 40px ${t.alpha(t.palette.primary.dark, 0.12)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3.5 }}>
                      <Box
                        aria-hidden
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 3,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                          bgcolor: tint(0.1),
                          mb: 2.5,
                        }}
                      >
                        {f.icon}
                      </Box>
                      <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                        {f.title}
                      </Typography>
                      <Typography color="text.secondary">{f.text}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Stats band */}
        <Box
          component="section"
          aria-label="Coverage"
          sx={{
            color: 'primary.contrastText',
            bgcolor: 'primary.dark',
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
            <Grid container spacing={4}>
              {STATS.map((s) => (
                <Grid key={s.label} size={{ xs: 6, md: 3 }} sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" component="p" sx={{ fontWeight: 700, fontSize: { xs: 40, md: 52 } }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ opacity: 0.85 }}>{s.label}</Typography>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* How it works */}
        <Box component="section" id="how-it-works" sx={{ scrollMarginTop: 72, bgcolor: tint(0.04) }}>
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <SectionHeading
              eyebrow="How it works"
              title="From spreadsheet to report in four steps"
              text="No consultants and no reformatting. Just your data, calculated the right way."
            />
            <Grid container spacing={3}>
              {STEPS.map((s, i) => (
                <Grid key={s.title} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack
                    spacing={2}
                    sx={{
                      height: '100%',
                      p: 3,
                      borderRadius: 4,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="h6" component="h3">
                      {s.title}
                    </Typography>
                    <Typography color="text.secondary">{s.text}</Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Why */}
        <Box component="section" id="why" sx={{ scrollMarginTop: 72 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
                    Why Carbon Glint
                  </Typography>
                  <Typography
                    variant="h3"
                    component="h2"
                    sx={{ fontSize: { xs: 30, md: 40 }, letterSpacing: '-0.02em' }}
                  >
                    Numbers you can defend, line by line
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 17 }}>
                    Spreadsheets break and consultants are slow. Carbon Glint keeps the whole chain from activity data
                    to emission factor to reported tonne, so reviews take hours, not weeks.
                  </Typography>
                  <Stack spacing={1.5}>
                    {WHY.map((w) => (
                      <Stack key={w} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                        <CheckCircle color="primary" sx={{ mt: '2px' }} />
                        <Typography>{w}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  aria-hidden
                  sx={{
                    p: { xs: 2.5, md: 4 },
                    borderRadius: 4,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: tint(0.04),
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                    Trace a number
                  </Typography>
                  {[
                    { k: 'Reported', v: '418.6 tCO₂e · Scope 1 · Stationary combustion' },
                    { k: 'Calculated from', v: '156,200 L diesel × 2.68 kgCO₂e/L' },
                    { k: 'Factor source', v: 'DEFRA 2025 · Diesel (average biofuel blend)' },
                    { k: 'Source row', v: 'fuel_log_q3.xlsx · row 214 · Chennai plant' },
                  ].map((r, i, all) => (
                    <Stack key={r.k} direction="row" spacing={2}>
                      <Stack sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 12, height: 12, mt: 0.75, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        {i < all.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: tint(0.3) }} />}
                      </Stack>
                      <Box sx={{ pb: i < all.length - 1 ? 2.5 : 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {r.k}
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{r.v}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* FAQ */}
        <Box component="section" id="faq" sx={{ scrollMarginTop: 72, bgcolor: tint(0.04) }}>
          <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
            <Stack spacing={1.5}>
              {FAQ.map((f) => (
                <Accordion
                  key={f.q}
                  disableGutters
                  elevation={0}
                  sx={{ borderRadius: 3, border: 1, borderColor: 'divider', '&::before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 3, py: 0.5 }}>
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                      {f.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 3, pb: 3 }}>
                    <Typography color="text.secondary">{f.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* CTA banner */}
        <Box component="section">
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 5,
                alignItems: { md: 'center' },
                justifyContent: 'space-between',
                color: 'primary.contrastText',
                bgcolor: 'primary.dark',
              }}
            >
              <Box>
                <Typography variant="h4" component="h2" sx={{ fontSize: { xs: 26, md: 34 } }}>
                  Ready to measure what matters?
                </Typography>
                <Typography sx={{ opacity: 0.9, mt: 1, fontSize: 17 }}>
                  Set up your organisation and upload your first activity file today.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to={primaryCta.to}
                size="large"
                variant="contained"
                color="inherit"
                endIcon={<ArrowForward />}
                sx={{ flexShrink: 0, px: 3.5, py: 1.4, bgcolor: 'background.paper', color: 'primary.main' }}
              >
                {isSignedIn ? 'Open workspace' : 'Get started'}
              </Button>
            </Stack>
          </Container>
        </Box>
      </main>

      {/* Footer */}
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <BrandMark />
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 360 }}>
                GHG Protocol-aligned carbon accounting and ESG reporting for growing organisations.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Product
              </Typography>
              <Stack spacing={1}>
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} color="text.secondary" underline="hover">
                    {l.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Account
              </Typography>
              <Stack spacing={1}>
                {isSignedIn ? (
                  <Link component={RouterLink} to={appPath} color="text.secondary" underline="hover">
                    Open workspace
                  </Link>
                ) : (
                  <>
                    <Link component={RouterLink} to="/login" color="text.secondary" underline="hover">
                      Sign in
                    </Link>
                    <Link component={RouterLink} to="/signup" color="text.secondary" underline="hover">
                      Create an account
                    </Link>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Carbon Glint. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
