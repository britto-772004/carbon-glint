import { createTheme } from '@mui/material/styles';

/** Single app theme. Extend palette/typography/components here — never hard-code colors in components. */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: { light: true, dark: true },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'].join(','),
  },
});
