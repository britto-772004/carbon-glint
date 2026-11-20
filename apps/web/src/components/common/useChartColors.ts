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
        ? ['#123b37', '#14665e', '#14b8a6', '#5eead4', '#ccfbf1']
        : ['#ecfdf5', '#a7f3d0', '#34d399', '#0f766e', '#134e4a'],
  };
}
