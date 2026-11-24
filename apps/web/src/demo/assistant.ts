import type { ChartSpec, ChatMessage } from '@carbon-glint/sdk';
import { heatmap, summary } from './aggregates';
import { factsOf } from './engine';
import type { DemoState } from './types';

const t = (kg: number) => Math.round(kg / 10) / 100; // kg → tCO2e (2dp)
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

export const SUGGESTIONS = [
  'What is our total footprint this year?',
  'Which scope is the biggest?',
  'Show monthly emissions by scope',
  'Which business unit emits the most?',
  'What are the top 5 emission sources?',
  'How many rows need review?',
];

export interface Answer {
  content: string;
  chart: ChartSpec | null;
  sources: string[];
}

export function answer(s: DemoState, question: string): Answer {
  const q = question.toLowerCase();
  const facts = factsOf(s);
  const sum = summary(facts, s.orgUnits.length);
  const sourcesOf = (rows: string[]) => rows;

  if (
    /(ignore|disregard).*(instruction|rule)|system prompt|delete|drop table|reset|override|change the (data|factor)/.test(
      q,
    )
  )
    return {
      content:
        'I can only answer questions about your emissions data here, and I can\u2019t change or delete anything. Try asking about totals, scopes, business units or trends.',
      chart: null,
      sources: [],
    };

  if (/(monthly|month|trend|over time)/.test(q)) {
    const h = heatmap(facts, 'scope', 'month');
    return {
      content: `Monthly emissions for the sample company run from **${h.columns[0]}** to **${h.columns.at(-1)}**, totalling **${fmt(t(h.total))} tCO\u2082e**. Scope 3 dominates every month.`,
      chart: {
        type: 'stacked-bar',
        title: 'Monthly emissions by scope',
        unit: 'tCO\u2082e',
        categories: h.columns,
        series: h.rows.map((r) => ({ name: r.label, data: r.cells.map(t) })),
      },
      sources: sourcesOf(['Emissions \u203a Heatmap (scope \u00d7 month)']),
    };
  }
  if (/(business unit|org|site|plant|location|bu\b)/.test(q)) {
    const h = heatmap(facts, 'orgUnit', 'year');
    const top = h.rows.slice(0, 8);
    return {
      content: `**${top[0]?.label}** is the largest emitter at **${fmt(t(top[0]?.total ?? 0))} tCO\u2082e** (${fmt(((top[0]?.total ?? 0) / h.total) * 100)}% of the total), followed by ${top[1]?.label} and ${top[2]?.label}.`,
      chart: {
        type: 'bar',
        title: 'Emissions by business unit',
        unit: 'tCO\u2082e',
        categories: top.map((r) => r.label),
        series: [{ name: 'tCO\u2082e', data: top.map((r) => t(r.total)) }],
      },
      sources: ['Emissions \u203a Org tree'],
    };
  }
  if (/(top|source|biggest|largest|highest)/.test(q) && !/scope/.test(q)) {
    const h = heatmap(facts, 'activityDefinition', 'year');
    const top = h.rows.slice(0, 5);
    return {
      content: `The top 5 emission sources account for **${fmt((top.reduce((a, r) => a + r.total, 0) / h.total) * 100)}%** of the footprint. The largest is **${top[0]?.label}**.`,
      chart: {
        type: 'bar',
        title: 'Top 5 emission sources',
        unit: 'tCO\u2082e',
        categories: top.map((r) => r.label),
        series: [{ name: 'tCO\u2082e', data: top.map((r) => t(r.total)) }],
      },
      sources: top.map((r) => `Activity definition: ${r.label}`),
    };
  }
  if (/(review|unmatched|quality|confiden)/.test(q))
    return {
      content: `**${sum.needsReview}** rows need review (low-confidence factor matches) and **${sum.unmatched}** have no factor yet. **${sum.overridden}** rows carry a manual override with a recorded reason. Open *Emissions \u203a Review* to resolve them.`,
      chart: null,
      sources: ['Emissions \u203a Summary'],
    };
  if (/scope/.test(q) || /(total|footprint|how much|overall|emit)/.test(q)) {
    const c = sum.co2eKg;
    return {
      content: `Total footprint so far is **${fmt(t(c.total))} tCO\u2082e** across ${sum.activityCount.toLocaleString('en-US')} activities: Scope 1 **${fmt(t(c['1']))}**, Scope 2 **${fmt(t(c['2']))}**, Scope 3 **${fmt(t(c['3']))}** (${fmt((c['3'] / c.total) * 100)}%). Scope 3 is the largest.`,
      chart: {
        type: 'pie',
        title: 'Footprint by scope',
        unit: 'tCO\u2082e',
        categories: ['Scope 1', 'Scope 2', 'Scope 3'],
        series: [{ name: 'tCO\u2082e', data: [t(c['1']), t(c['2']), t(c['3'])] }],
      },
      sources: ['Emissions \u203a Summary'],
    };
  }
  return {
    content:
      'This is a **demo assistant** with scripted answers over the sample data. Try one of the suggestions below, for example the total footprint, the biggest scope, or the top emission sources.',
    chart: null,
    sources: [],
  };
}

export const msg = (
  id: string,
  role: ChatMessage['role'],
  content: string,
  chart: ChartSpec | null = null,
  sources: string[] = [],
): ChatMessage => ({
  id,
  role,
  content,
  chart,
  sources,
  createdAt: new Date().toISOString(),
});
