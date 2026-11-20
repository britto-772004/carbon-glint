import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../common/BrandMark';

const FEATURES = [
  { icon: '🏢', title: 'Model your organisation', text: 'Branches, plants and campuses as a parent/child tree.' },
  { icon: '📄', title: 'Upload activity data', text: 'CSV or Excel — AI maps your columns to GHG fields.' },
  { icon: '🔎', title: 'Public emission factors', text: 'DEFRA, ADEME, EPA, IPCC and national grid factors.' },
  { icon: '🧭', title: 'Full traceability', text: 'Every tonne links back to its source row and factor.' },
  { icon: '🗺️', title: 'Drill-down insight', text: 'Heatmaps by scope, category, activity and business unit.' },
  { icon: '📑', title: 'Country-ready reports', text: 'BRSR, SB 253, AASB S2, SGX, UAE and more as PDF.' },
];

export interface LandingPageProps {
  isSignedIn: boolean;
  appPath: string;
}

export function LandingPage({ isSignedIn, appPath }: LandingPageProps) {
  return (
    <Box>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <BrandMark />
          {isSignedIn ? (
            <Button component={RouterLink} to={appPath} variant="contained">
              Open workspace
            </Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to="/login">
                Sign in
              </Button>
              <Button component={RouterLink} to="/signup" variant="contained">
                Get started
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={3} sx={{ maxWidth: 760 }}>
          <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: 2 }}>
            ESG audit platform
          </Typography>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: 36, md: 56 } }}>
            Carbon accounting your auditors will trust.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Measure Scope 1, 2 and 3 emissions across every business unit, trace each number to its emission factor, and
            export country-format ESG reports in minutes.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={RouterLink} to={isSignedIn ? appPath : '/signup'} variant="contained" size="large">
              {isSignedIn ? 'Open workspace' : 'Start with your work email'}
            </Button>
            {!isSignedIn && (
              <Button component={RouterLink} to="/login" size="large" variant="outlined">
                I already have an account
              </Button>
            )}
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ mt: { xs: 6, md: 10 } }}>
          {FEATURES.map((f) => (
            <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography sx={{ fontSize: 28 }} aria-hidden>
                    {f.icon}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
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
  );
}
