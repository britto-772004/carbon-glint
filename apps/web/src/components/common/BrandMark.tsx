import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography component="span" sx={{ fontSize: 26 }} aria-hidden>
        🌿
      </Typography>
      <Typography
        variant="h6"
        component="span"
        sx={{ fontWeight: 700, color: inverted ? 'common.white' : 'primary.main' }}
      >
        Carbon Glint
      </Typography>
    </Stack>
  );
}
