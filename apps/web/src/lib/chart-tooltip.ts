/** Shared ECharts tooltip look (card-like, theme-aware). Spread into a chart's `tooltip` option. */
export const chartTooltip = (c: { paper: string; divider: string; text: string; fontFamily?: string }) => ({
  confine: true,
  backgroundColor: c.paper,
  borderColor: c.divider,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: c.text, fontFamily: c.fontFamily, fontSize: 12.5, lineHeight: 18 },
  extraCssText: 'border-radius:10px;box-shadow:0 10px 28px rgba(15,23,42,.18);',
});
