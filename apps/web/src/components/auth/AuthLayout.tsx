import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BrandMark } from '../common/BrandMark';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split layout: brand panel (hidden on phones) + form card. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: 'common.white',
          bgcolor: 'primary.dark',
        }}
      >
        <BrandMark inverted />
        <Box>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Measure every tonne. Prove every number.
          </Typography>
          <Typography sx={{ opacity: 0.85, maxWidth: 440 }}>
            Scope 1, 2 and 3 emissions across every branch — matched to public emission factors, traceable to the source
            row, and exported in your country's reporting format.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          GHG Protocol · DEFRA · ADEME · EPA · IPCC
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2, sm: 4 } }}>
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Box sx={{ display: { md: 'none' }, mb: 3 }}>
            <BrandMark />
          </Box>
          <Card>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography variant="h5" component="h1">
                  {title}
                </Typography>
                {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
              </Stack>
              {children}
            </CardContent>
          </Card>
          {footer && <Box sx={{ mt: 2, textAlign: 'center' }}>{footer}</Box>}
        </Box>
      </Box>
    </Box>
  );
}
