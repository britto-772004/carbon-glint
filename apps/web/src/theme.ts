import { createTheme } from '@mui/material/styles';

/** Brand font, self-hosted via @fontsource/livvic (imported in main.tsx). */
export const FONT_FAMILY = ['Livvic', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'].join(',');

/** Single app theme. Extend palette/typography/components here — never hard-code colors in components. */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0f766e' }, // deep teal
        secondary: { main: '#65a30d' }, // leaf green
        background: { default: '#f6f8f7' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#2dd4bf' },
        secondary: { main: '#a3e635' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 14 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 40 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 40, paddingTop: 8, paddingBottom: 8, fontSize: 14 } } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontSize: 13, paddingTop: 4, paddingBottom: 4 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 250, enterNextDelay: 100, placement: 'top' },
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: 'rgb(15 23 42 / 0.94)', // slate-900, same in both schemes for contrast
          color: '#f8fafc',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgb(148 163 184 / 0.25)',
          borderRadius: 10,
          boxShadow: '0 10px 28px rgb(15 23 42 / 0.28)',
          padding: t.spacing(0.75, 1.5),
          fontSize: 12.5,
          fontWeight: 500,
          lineHeight: 1.45,
          letterSpacing: 0.1,
          maxWidth: 280,
        }),
        arrow: { color: 'rgb(15 23 42 / 0.94)', '&::before': { border: '1px solid rgb(148 163 184 / 0.25)' } },
      },
    },
  },
});
