import ArrowForward from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import type { LandingVariantProps } from '../landingTypes';
import { motion, revealX } from '../motion';
import { ImportValidation } from '../parts/ExtraParts';
import { FactorMatch, OrgTree, UploadMapping } from '../parts/FlowParts';
import { HeatmapLasagne, TraceChain } from '../parts/InsightParts';
import { FloatingHeader } from '../parts/FloatingHeader';
import { CtaBanner, FaqSection, LandingFooter, SectionHeading } from '../parts/LandingChrome';
import { primaryCta, tint, tintSecondary } from '../parts/landingStyles';
import {
  Fireflies,
  HeroBadge,
  RisingBubbles,
  RouteJourney,
  Reveal,
  SplashIntro,
  StatsBar,
  PillarCards,
  RootsStage,
} from '../parts/NatureParts';
import { AudienceCards, FloatingLeaves, Marquee, ReportSheets, ScopeCards } from '../parts/StoryParts';

const LINKS = [
  { label: 'Scopes', href: '#features' },
  { label: 'The trail', href: '#why' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

const EXPERIENCE = [
  {
    title: 'Measure',
    text: 'Bring Scope 1, 2 and 3 activity data from every site into one place, with business units that roll up.',
  },
  {
    title: 'Trace',
    text: 'Match each activity to a public emission factor and keep the path from reported tonne to source row.',
  },
  {
    title: 'Report',
    text: 'Export the country format your regulator expects, built from numbers your auditors can follow.',
  },
];

/** Hand-drawn style underline that draws itself under a word. */
function Underline() {
  return (
    <Box
      aria-hidden
      component="svg"
      viewBox="0 0 300 16"
      preserveAspectRatio="none"
      sx={{ position: 'absolute', left: 0, right: 0, bottom: -18, width: '100%', height: 12 }}
    >
      <Box
        component="path"
        d="M3 11 C 60 2, 120 15, 180 7 S 270 4, 297 9"
        vectorEffect="non-scaling-stroke"
        sx={{
          fill: 'none',
          stroke: 'var(--mui-palette-secondary-light)',
          strokeWidth: 4,
          strokeLinecap: 'round',
          ...motion(`${revealX} 1.1s ease-out 3.2s backwards`),
        }}
      />
    </Box>
  );
}

/**
 * Variant 5: forest theme, loosely inspired by dairyyatra.com: a brush-ring intro, a round badge hero with a glass
 * stats bar, a logo with a growing trail, and a route that moves through five stops. Leaves, fireflies, bubbles
 * and swaying grass are scattered through the page.
 */
export function NatureLanding(props: LandingVariantProps) {
  const cta = primaryCta(props);
  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
      <SplashIntro />
      <FloatingHeader {...props} links={LINKS} />
      <main>
        {/* Hero */}
        <Box
          component="section"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            color: 'common.white',
            bgcolor: 'primary.main',
            display: 'flex',
            minHeight: { md: '100vh' },
          }}
        >
          <FloatingLeaves tone="dark" />
          <Fireflies count={22} />
          <RisingBubbles count={12} />
          <Container
            maxWidth="xl"
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              pt: { xs: 7, md: 6 },
              pb: { xs: 4, md: 5 },
            }}
          >
            <Grid
              container
              spacing={{ xs: 5, md: 3 }}
              sx={{ flex: 1, alignItems: 'center', alignContent: 'center', mb: { xs: 6, md: 4 } }}
            >
              <Grid size={{ xs: 12, md: 4.5 }} sx={{ textAlign: { md: 'right' }, order: { xs: 2, md: 1 } }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 40, sm: 56, md: 60, lg: 80 },
                    lineHeight: 1.02,
                    letterSpacing: '-0.035em',
                    fontWeight: 800,
                  }}
                >
                  Every tonne has a{' '}
                  <Box
                    component="span"
                    sx={{ position: 'relative', color: 'secondary.light', display: 'inline-block' }}
                  >
                    trail.
                    <Underline />
                  </Box>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 1, md: 2 } }}>
                <HeroBadge />
              </Grid>
              <Grid size={{ xs: 12, md: 4.5 }} sx={{ order: 3 }}>
                <Stack spacing={2.5}>
                  <Typography
                    sx={{ color: 'primary.contrastText', opacity: 0.9, fontSize: { xs: 17, md: 18, lg: 21 } }}
                  >
                    Measure, trace and report Scope 1, 2 and 3 emissions. Carbon Glint turns activity spreadsheets into
                    audited numbers and shows your auditors the path from each tonne back to its source.
                  </Typography>
                  <Stack direction="column" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Button
                      component={RouterLink}
                      to={cta.to}
                      variant="contained"
                      color="secondary"
                      size="large"
                      endIcon={<ArrowForward />}
                      sx={{
                        px: { xs: 3, lg: 4 },
                        py: { xs: 1.3, lg: 1.6 },
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        fontSize: { lg: 17 },
                      }}
                    >
                      {cta.label}
                    </Button>
                    {!props.isSignedIn && (
                      <Button
                        component={RouterLink}
                        to="/login"
                        size="large"
                        variant="outlined"
                        color="inherit"
                        sx={{
                          px: { xs: 3, lg: 4 },
                          py: { xs: 1.3, lg: 1.6 },
                          borderRadius: 8,
                          whiteSpace: 'nowrap',
                          fontSize: { lg: 17 },
                        }}
                      >
                        I already have an account
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
            <StatsBar />
          </Container>
        </Box>

        {/* About */}
        <Box component="section" sx={{ position: 'relative', overflow: 'hidden' }}>
          <FloatingLeaves mode="float" count={5} />
          <Container maxWidth="lg" sx={{ position: 'relative', pt: { xs: 8, md: 12 }, pb: { xs: 3, md: 4 } }}>
            <Reveal>
              <Stack
                spacing={2.5}
                sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 760, mx: 'auto', mb: { xs: 6, md: 9 } }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 32, height: 2, bgcolor: 'primary.main' }} />
                  <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 3 }}>
                    About Carbon Glint
                  </Typography>
                  <Box sx={{ width: 32, height: 2, bgcolor: 'primary.main' }} />
                </Stack>
                <Typography
                  variant="h2"
                  component="h2"
                  sx={{ fontSize: { xs: 32, md: 46 }, letterSpacing: '-0.025em', lineHeight: 1.1 }}
                >
                  Count every tonne. Understand every trail.
                </Typography>
                <Typography variant="h6" component="p" sx={{ color: 'secondary.dark', fontWeight: 700 }}>
                  What will it take to make your numbers audit-ready?
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 17 }}>
                  The answer lives in your spreadsheets, your sites and your suppliers. Carbon Glint organises them by
                  the GHG Protocol and keeps every step visible.
                </Typography>
              </Stack>
            </Reveal>
            <PillarCards items={EXPERIENCE} />
          </Container>
        </Box>

        {/* Roots */}
        <RootsStage />

        {/* Route */}
        <RouteJourney
          visuals={[
            <OrgTree key="org" />,
            <ImportValidation key="import" headless />,
            <UploadMapping key="map" />,
            <FactorMatch key="calc" />,
            <HeatmapLasagne key="report" />,
          ]}
        />

        {/* Scopes */}
        <Box component="section" id="features" sx={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 72 }}>
          <FloatingLeaves mode="float" count={7} />
          <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 8, md: 12 } }}>
            <Reveal>
              <SectionHeading
                eyebrow="Three scopes"
                title="Know where your footprint really comes from"
                text="The GHG Protocol splits emissions into three scopes. Carbon Glint covers all of them, by business unit."
              />
            </Reveal>
            <Reveal range="entry 0% entry 45%">
              <ScopeCards />
            </Reveal>
          </Container>
        </Box>

        {/* Trail */}
        <Box
          component="section"
          id="why"
          sx={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 72, bgcolor: tint(0.05) }}
        >
          <FloatingLeaves count={5} />
          <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 8, md: 12 } }}>
            <Reveal>
              <SectionHeading
                eyebrow="The trail"
                title="From a reported tonne back to a source row"
                text="AI helps match the right factor, but the calculation is plain arithmetic you can check."
              />
            </Reveal>
            <Reveal range="entry 0% entry 40%">
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FactorMatch />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TraceChain />
                </Grid>
              </Grid>
            </Reveal>
          </Container>
        </Box>

        {/* Standards and audience */}
        <Box
          component="section"
          aria-label="Standards and data sources"
          sx={{ py: 3, borderBlock: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Marquee fade={false} />
        </Box>
        <Box component="section" sx={{ position: 'relative', overflow: 'hidden', bgcolor: tintSecondary(0.08) }}>
          <FloatingLeaves mode="float" count={6} />
          <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 8, md: 12 } }}>
            <Reveal>
              <SectionHeading eyebrow="Built for" title="Everyone who has to stand behind the numbers" />
            </Reveal>
            <Reveal range="entry 0% entry 45%">
              <AudienceCards />
            </Reveal>
          </Container>
        </Box>

        <Box component="section">
          <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: 0 }}>
            <Reveal>
              <SectionHeading
                eyebrow="Reports"
                title="Speak every regulator’s language"
                text="Country-format PDFs, built from traceable numbers."
              />
            </Reveal>
            <Reveal range="entry 0% entry 45%">
              <ReportSheets />
            </Reveal>
          </Container>
        </Box>

        <Reveal range="entry 0% entry 25%">
          <FaqSection layout="numbered" />
        </Reveal>
        <CtaBanner
          {...props}
          flat
          title="Give every tonne a trail."
          decoration={<FloatingLeaves tone="dark" count={6} />}
        />
      </main>

      <LandingFooter {...props} links={LINKS} layout="statement" />
    </Box>
  );
}
