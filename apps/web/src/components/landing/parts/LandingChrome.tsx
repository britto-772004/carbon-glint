import ArrowForward from '@mui/icons-material/ArrowForward';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../../common/BrandMark';
import { FAQ, NAV_LINKS } from '../landingContent';
import type { LandingVariantProps } from '../landingTypes';
import { primaryCta, tint } from './landingStyles';
import type { Tone } from './tokens';

export interface NavLink {
  label: string;
  href: string;
}

export type FooterLayout = 'classic' | 'centered' | 'columns' | 'bar' | 'statement' | 'split';

type FooterProps = LandingVariantProps & { tone?: Tone; links?: NavLink[]; layout?: FooterLayout };

function AccountLinks({ isSignedIn, appPath, color, row }: LandingVariantProps & { color: string; row?: boolean }) {
  const items = isSignedIn ? (
    <Link component={RouterLink} to={appPath} color={color} underline="hover">
      Open workspace
    </Link>
  ) : (
    <>
      <Link component={RouterLink} to="/login" color={color} underline="hover">
        Sign in
      </Link>
      <Link component={RouterLink} to="/signup" color={color} underline="hover">
        Create an account
      </Link>
    </>
  );
  return (
    <Stack direction={row ? 'row' : 'column'} spacing={row ? 3 : 1}>
      {items}
    </Stack>
  );
}

function SectionLinks({ links, color, row }: { links: NavLink[]; color: string; row?: boolean }) {
  return (
    <Stack direction={row ? 'row' : 'column'} spacing={row ? 3 : 1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} color={color} underline="hover">
          {l.label}
        </Link>
      ))}
    </Stack>
  );
}

/** Footer in one of five layouts, so every landing design closes differently. */
export function LandingFooter({
  isSignedIn,
  appPath,
  tone = 'light',
  links = NAV_LINKS,
  layout = 'classic',
}: FooterProps) {
  const dark = tone === 'dark';
  const color = dark ? 'grey.400' : 'text.secondary';
  const rule = dark ? (t: Theme) => t.alpha(t.palette.common.white, 0.12) : 'divider';
  const copyright = (
    <Typography variant="body2" color={color}>
      © {new Date().getFullYear()} Carbon Glint. All rights reserved.
    </Typography>
  );
  const account = { isSignedIn, appPath };

  let body;
  if (layout === 'centered') {
    body = (
      <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandMark inverted={dark} />
        <SectionLinks links={links} color={color} row />
        <AccountLinks {...account} color={color} row />
        {copyright}
      </Stack>
    );
  } else if (layout === 'split') {
    body = (
      <Grid container spacing={{ xs: 4, md: 8 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5} sx={{ alignItems: 'flex-start' }}>
            <BrandMark inverted={dark} />
            <Typography color={color} sx={{ maxWidth: 340 }}>
              Follow every tonne of CO₂e from spreadsheet to regulator.
            </Typography>
            <Button
              component={RouterLink}
              to={isSignedIn ? appPath : '/signup'}
              variant="outlined"
              endIcon={<ArrowForward />}
            >
              {isSignedIn ? 'Open workspace' : 'Start for free'}
            </Button>
            {copyright}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Grid container spacing={3} sx={{ p: 3, borderRadius: 4, bgcolor: tint(0.06) }}>
            <Grid size={6}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Explore
              </Typography>
              <SectionLinks links={links} color={color} />
            </Grid>
            <Grid size={6}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Account
              </Typography>
              <AccountLinks {...account} color={color} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  } else if (layout === 'bar') {
    body = (
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{
          p: 3,
          borderRadius: 5,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          bgcolor: tint(0.06),
        }}
      >
        <Stack spacing={1}>
          <BrandMark inverted={dark} />
          {copyright}
        </Stack>
        <SectionLinks links={links} color={color} row />
        <AccountLinks {...account} color={color} row />
      </Stack>
    );
  } else if (layout === 'statement') {
    body = (
      <Stack spacing={5}>
        <Typography
          component="p"
          sx={{ fontSize: { xs: 40, md: 72 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          Every tonne
          <br />
          <Box component="span" sx={{ color: 'primary.main' }}>
            has a trail.
          </Box>
        </Typography>
        <Grid container spacing={4} sx={{ alignItems: 'flex-end' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <BrandMark inverted={dark} />
            <Typography color={color} sx={{ mt: 1.5, maxWidth: 360 }}>
              Open-source ESG audit platform for carbon accounting.
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <SectionLinks links={links} color={color} />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <AccountLinks {...account} color={color} />
          </Grid>
        </Grid>
        {copyright}
      </Stack>
    );
  } else if (layout === 'columns') {
    body = (
      <Stack spacing={4}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <BrandMark inverted={dark} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.light' }} />
              <Typography variant="body2" color={color}>
                Every figure traceable to its source
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Product
            </Typography>
            <SectionLinks links={links} color={color} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Standards
            </Typography>
            <Stack spacing={1}>
              {['GHG Protocol', 'BRSR', 'SB 253', 'AASB S2'].map((n) => (
                <Typography key={n} color={color}>
                  {n}
                </Typography>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Account
            </Typography>
            <AccountLinks {...account} color={color} />
          </Grid>
        </Grid>
        {copyright}
      </Stack>
    );
  } else {
    body = (
      <>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <BrandMark inverted={dark} />
            <Typography color={color} sx={{ mt: 2, maxWidth: 360 }}>
              GHG Protocol-aligned carbon accounting and ESG reporting for growing organisations.
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Product
            </Typography>
            <SectionLinks links={links} color={color} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Account
            </Typography>
            <AccountLinks {...account} color={color} />
          </Grid>
        </Grid>
        <Divider sx={{ my: 4, borderColor: rule }} />
        {copyright}
      </>
    );
  }

  return (
    <Box
      component="footer"
      sx={{
        borderTop: layout === 'bar' ? 0 : 1,
        borderColor: rule,
        bgcolor: dark ? 'grey.900' : 'transparent',
        color: dark ? 'common.white' : 'text.primary',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: layout === 'statement' ? 12 : 8 } }}>
        {body}
      </Container>
    </Box>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  tone = 'light',
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  text?: string;
  tone?: Tone;
  align?: 'center' | 'left';
}) {
  const center = align === 'center';
  return (
    <Stack
      spacing={1.5}
      sx={{
        textAlign: align,
        alignItems: center ? 'center' : 'flex-start',
        maxWidth: 720,
        mx: center ? 'auto' : 0,
        mb: { xs: 5, md: 7 },
      }}
    >
      <Typography
        variant="overline"
        color={tone === 'dark' ? 'secondary.light' : 'primary'}
        sx={{ fontWeight: 700, letterSpacing: 2 }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h2" sx={{ fontSize: { xs: 30, md: 40 }, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {text && (
        <Typography
          variant="h6"
          color={tone === 'dark' ? 'grey.400' : 'text.secondary'}
          sx={{ fontWeight: 400, fontSize: { xs: 16, md: 18 } }}
        >
          {text}
        </Typography>
      )}
    </Stack>
  );
}

export function CtaBanner({
  isSignedIn,
  appPath,
  title,
  decoration,
  flat = false,
}: LandingVariantProps & { title?: string; decoration?: ReactNode; flat?: boolean }) {
  const cta = primaryCta({ isSignedIn, appPath });
  return (
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
            position: 'relative',
            overflow: 'hidden',
            color: 'primary.contrastText',
            ...(flat
              ? { bgcolor: 'primary.main' }
              : {
                  background: (t) =>
                    `linear-gradient(135deg, ${(t.vars ?? t).palette.primary.dark}, ${(t.vars ?? t).palette.primary.main} 60%, ${(t.vars ?? t).palette.secondary.main})`,
                }),
          }}
        >
          {decoration}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h4" component="h2" sx={{ fontSize: { xs: 26, md: 34 } }}>
              {title ?? 'Ready to measure what matters?'}
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 1, fontSize: 17 }}>
              Set up your organisation and upload your first activity file today.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to={cta.to}
            size="large"
            variant="contained"
            color="inherit"
            endIcon={<ArrowForward />}
            sx={{
              position: 'relative',
              zIndex: 1,
              flexShrink: 0,
              px: 3.5,
              py: 1.4,
              bgcolor: 'background.paper',
              color: 'primary.main',
            }}
          >
            {isSignedIn ? 'Open workspace' : 'Get started'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export type FaqLayout = 'centered' | 'split' | 'columns' | 'tiles' | 'numbered';

/** FAQ accordion (anchor `#faq`) in one of five layouts. */
export function FaqSection({ tone = 'light', layout = 'centered' }: { tone?: Tone; layout?: FaqLayout }) {
  const dark = tone === 'dark';
  const items = FAQ.map((f, i) => (
    <Accordion
      key={f.q}
      disableGutters
      elevation={0}
      sx={{
        borderRadius: layout === 'tiles' ? 5 : 3,
        border: layout === 'tiles' ? 0 : layout === 'numbered' ? 0 : 1,
        borderBottom: layout === 'numbered' ? 1 : undefined,
        borderColor: dark ? (t: Theme) => t.alpha(t.palette.common.white, 0.14) : 'divider',
        bgcolor:
          layout === 'tiles'
            ? tint(0.06)
            : layout === 'numbered'
              ? 'transparent'
              : dark
                ? (t: Theme) => t.alpha(t.palette.common.white, 0.05)
                : 'background.paper',
        color: 'inherit',
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: 'inherit' }} />}
        sx={{ px: layout === 'numbered' ? 0 : 3, py: 0.5 }}
      >
        {layout === 'numbered' && (
          <Typography
            component="span"
            sx={{ mr: 2.5, fontWeight: 800, fontSize: 22, color: 'primary.main', minWidth: 36 }}
          >
            {String(i + 1).padStart(2, '0')}
          </Typography>
        )}
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          {f.q}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: layout === 'numbered' ? 7 : 3, pb: 3 }}>
        <Typography sx={{ color: dark ? 'grey.400' : 'text.secondary' }}>{f.a}</Typography>
      </AccordionDetails>
    </Accordion>
  ));

  let content;
  if (layout === 'split') {
    content = (
      <Grid container spacing={{ xs: 4, md: 8 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
            <SectionHeading eyebrow="FAQ" title="Questions, answered" align="left" tone={tone} />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={1.5}>{items}</Stack>
        </Grid>
      </Grid>
    );
  } else if (layout === 'columns' || layout === 'tiles') {
    content = (
      <>
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" tone={tone} />
        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
          {items.map((item, i) => (
            <Grid key={FAQ[i]?.q ?? i} size={{ xs: 12, md: 6 }}>
              {item}
            </Grid>
          ))}
        </Grid>
      </>
    );
  } else if (layout === 'numbered') {
    content = (
      <>
        <SectionHeading eyebrow="FAQ" title="Things people ask us" tone={tone} align="left" />
        <Stack>{items}</Stack>
      </>
    );
  } else {
    content = (
      <>
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" tone={tone} />
        <Stack spacing={1.5}>{items}</Stack>
      </>
    );
  }

  return (
    <Box
      component="section"
      id="faq"
      sx={{
        scrollMarginTop: 72,
        color: dark ? 'common.white' : 'text.primary',
        bgcolor: layout === 'centered' && !dark ? tint(0.04) : 'transparent',
      }}
    >
      <Container
        maxWidth={layout === 'split' || layout === 'columns' || layout === 'tiles' ? 'lg' : 'md'}
        sx={{ py: { xs: 8, md: 12 } }}
      >
        {content}
      </Container>
    </Box>
  );
}
