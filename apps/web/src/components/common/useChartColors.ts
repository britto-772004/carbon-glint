import { useColorScheme, useTheme, type Theme } from '@mui/material/styles';

type WithSchemes = Theme & { colorSchemes?: Partial<Record<'light' | 'dark', { palette: Theme['palette'] }>> };

/**
 * Concrete colours for canvas charts (ECharts can't read CSS variables), resolved for the active
 * light/dark scheme so axis labels and legends stay readable in both.
 */
export function useChartColors() {
  const theme = useTheme() as WithSchemes;
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === 'system' ? systemMode : mode) ?? 'light';
  const palette = theme.colorSchemes?.[scheme]?.palette ?? theme.palette;
  return {
    scheme,
    text: palette.text.primary,
    textSecondary: palette.text.secondary,
    paper: palette.background.paper,
    divider: palette.divider,
    accent: palette.secondary.main,
    fontFamily: theme.typography.fontFamily,
    heat:
      scheme === 'dark'
        ? ['#1e3a8a', '#0e7490', '#16a34a', '#eab308', '#f97316', '#ef4444']
        : ['#3b82f6', '#06b6d4', '#22c55e', '#facc15', '#f97316', '#dc2626'],
  };
}
