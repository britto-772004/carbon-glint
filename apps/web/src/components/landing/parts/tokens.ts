import type { Theme } from '@mui/material/styles';

export type Tone = 'light' | 'dark';

/**
 * Per-tone CSS variables for the animated parts. Everything else is derived from `currentColor`,
 * so a part looks right on a light page and on a dark one without hard-coded colors.
 */
export const toneVars = (tone: Tone) => ({
  color: tone === 'dark' ? 'common.white' : 'text.primary',
  '--accent': tone === 'dark' ? 'var(--mui-palette-secondary-light)' : 'var(--mui-palette-primary-main)',
  '--accent2': tone === 'dark' ? 'var(--mui-palette-primary-light)' : 'var(--mui-palette-secondary-main)',
  '--glow': `color-mix(in srgb, ${tone === 'dark' ? 'var(--mui-palette-secondary-light)' : 'var(--mui-palette-primary-main)'} 50%, transparent)`,
  '--line': 'color-mix(in srgb, currentColor 16%, transparent)',
  '--soft': 'color-mix(in srgb, currentColor 6%, transparent)',
  '--muted': 'color-mix(in srgb, currentColor 62%, transparent)',
});

/** A card surface that reads well on the tone's page background. */
export const surface = (tone: Tone) => ({
  border: 1,
  borderRadius: 4,
  bgcolor: tone === 'dark' ? (t: Theme) => t.alpha(t.palette.common.white, 0.05) : 'background.paper',
  borderColor: tone === 'dark' ? (t: Theme) => t.alpha(t.palette.common.white, 0.14) : 'divider',
});
