import type { Theme } from '@mui/material/styles';
import type { LandingVariantProps } from '../landingTypes';

/** Translucent brand green that follows the active color scheme. */
export const tint = (opacity: number) => (t: Theme) => t.alpha((t.vars ?? t).palette.primary.main, opacity);
export const tintSecondary = (opacity: number) => (t: Theme) => t.alpha((t.vars ?? t).palette.secondary.main, opacity);

export const primaryCta = ({ isSignedIn, appPath }: LandingVariantProps) =>
  isSignedIn ? { to: appPath, label: 'Open workspace' } : { to: '/signup', label: 'Start with your work email' };
