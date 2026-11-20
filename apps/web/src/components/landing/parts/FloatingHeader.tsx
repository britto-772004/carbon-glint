import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../../common/BrandMark';
import { NAV_LINKS } from '../landingContent';
import type { LandingVariantProps } from '../landingTypes';
import type { NavLink } from './LandingChrome';

const FADE = '0.4s cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Header that floats over the page. At the top it is transparent with white text (it sits on the hero); once the page
 * has scrolled it eases into a white, rounded, shadowed pill with dark text. `isScrolled` comes from the container,
 * and every change is a timed CSS transition, so it is smooth however fast you scroll.
 */
export function FloatingHeader({
  isSignedIn,
  appPath,
  isScrolled = false,
  links = NAV_LINKS,
}: LandingVariantProps & { links?: NavLink[] }) {
  const text = { color: isScrolled ? 'text.primary' : 'common.white', transition: `color ${FADE}` };
  const cta = {
    bgcolor: isScrolled ? 'primary.main' : 'secondary.main',
    borderRadius: 8,
    fontSize: 16,
    px: 3,
    transition: `background-color ${FADE}`,
  };
  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{ bgcolor: 'transparent', backgroundImage: 'none', pointerEvents: 'none' }}
    >
      <Container maxWidth="lg" sx={{ pt: 1.5 }}>
        <Toolbar
          disableGutters
          sx={{
            pointerEvents: 'auto',
            minHeight: { xs: 60, md: 78 },
            gap: 2,
            px: { xs: 2, md: 3 },
            borderRadius: 8,
            border: 1,
            borderColor: isScrolled ? 'divider' : 'transparent',
            bgcolor: isScrolled ? 'background.paper' : 'transparent',
            boxShadow: (t) => `0 10px 30px ${t.alpha(t.palette.primary.dark, isScrolled ? 0.14 : 0)}`,
            transition: `background-color ${FADE}, border-color ${FADE}, box-shadow ${FADE}`,
          }}
        >
          <Link component={RouterLink} to="/" underline="none" aria-label="Carbon Glint home">
            <BrandMark
              size={40}
              fontSize={26}
              textSx={text}
              accentSx={{ color: isScrolled ? 'primary.main' : 'secondary.light', transition: `color ${FADE}` }}
            />
          </Link>
          <Stack
            component="nav"
            aria-label="Page sections"
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, justifyContent: 'center' }}
          >
            {links.map((l) => (
              <Button
                key={l.href}
                href={l.href}
                color="inherit"
                sx={{ ...text, fontWeight: 600, fontSize: { md: 16, lg: 17 }, px: { md: 1.5, lg: 2 } }}
              >
                {l.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flex: { xs: 1, md: 0 } }} />
          {isSignedIn ? (
            <Button component={RouterLink} to={appPath} variant="contained" size="large" sx={cta}>
              Open workspace
            </Button>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button
                component={RouterLink}
                to="/login"
                color="inherit"
                size="large"
                sx={{ ...text, fontWeight: 700, fontSize: 16, '@media (max-width: 399.95px)': { display: 'none' } }}
              >
                Sign in
              </Button>
              <Button component={RouterLink} to="/signup" variant="contained" size="large" sx={cta}>
                Get started
              </Button>
            </Stack>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
