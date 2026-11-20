import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import TimelineOutlined from '@mui/icons-material/TimelineOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
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
  {
    icon: <AccountTreeOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Model your organisation',
    text: 'Branches, plants and campuses as a parent/child tree.',
  },
  {
    icon: <UploadFileOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Upload activity data',
    text: 'CSV or Excel — AI maps your columns to GHG fields.',
  },
  {
    icon: <ScienceOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Public emission factors',
    text: 'DEFRA, ADEME, EPA, IPCC and national grid factors.',
  },
  {
    icon: <TimelineOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Full traceability',
    text: 'Every tonne links back to its source row and factor.',
  },
  {
    icon: <GridViewOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Drill-down insight',
    text: 'Heatmaps by scope, category, activity and business unit.',
  },
  {
    icon: <DescriptionOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
    title: 'Country-ready reports',
    text: 'BRSR, SB 253, AASB S2, SGX, UAE and more as PDF.',
  },
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
                  <Box aria-hidden>{f.icon}</Box>
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
