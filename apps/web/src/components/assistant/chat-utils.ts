import type { ChartSpec } from '@carbon-glint/sdk';

export const STARTER_QUESTIONS = [
  'What are our total emissions by scope?',
  'Which business unit emits the most? Show a chart.',
  'Show monthly Scope 2 emissions as a chart',
  'Which activities need review?',
];

export const chartToCsv = (c: ChartSpec) =>
  [
    ['', ...c.series.map((s) => s.name)].join(','),
    ...c.categories.map((cat, i) => [JSON.stringify(cat), ...c.series.map((s) => s.data[i] ?? 0)].join(',')),
  ].join('\n');
