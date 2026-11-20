import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

/** The Carbon Glint mark: a leaf with a glint, on a teal tile. Same artwork as /favicon.svg. */
export function BrandLogo({ size = 32 }: { size?: number }) {
  const id = useId();
  return (
    <Box component="svg" viewBox="0 0 64 64" sx={{ width: size, height: size, flexShrink: 0 }} aria-hidden>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#115e59" />
        </linearGradient>
        <linearGradient id={`${id}leaf`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}bg)`} />
      <path d="M15 48c0-19 12-31 34-33-1 22-13 34-31 34-1 0-2 0-3-1z" fill={`url(#${id}leaf)`} />
      <path d="M17 47c7-9 15-17 26-25" stroke="#115e59" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M50 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fef08a" />
    </Box>
  );
}

export function BrandMark({
  inverted = false,
  size = 32,
  textSx,
  accentSx,
  fontSize,
}: {
  inverted?: boolean;
  size?: number;
  /** Extra styles for the wordmark and for the accent word (used by the floating header to animate colours). */
  textSx?: SxProps<Theme>;
  accentSx?: SxProps<Theme>;
  /** Wordmark size in px (defaults to the h6 size). */
  fontSize?: number;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <BrandLogo size={size} />
      <Typography
        variant="h6"
        component="span"
        sx={[
          {
            fontWeight: 700,
            letterSpacing: '-0.01em',
            fontSize,
            color: inverted ? 'common.white' : 'text.primary',
          },
          ...(Array.isArray(textSx) ? textSx : [textSx]),
        ]}
      >
        Carbon
        <Box
          component="span"
          sx={[
            { color: inverted ? 'secondary.light' : 'primary.main' },
            ...(Array.isArray(accentSx) ? accentSx : [accentSx]),
          ]}
        >
          {' '}
          Glint
        </Box>
      </Typography>
    </Stack>
  );
}
