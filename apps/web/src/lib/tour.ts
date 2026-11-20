/**
 * The guided tour: chapters of steps that walk a company from first sign-in to a finished report.
 * Each step names the page it lives on, an optional `data-tour` target to spotlight, and which
 * industry example to show. Pure data + pure helpers.
 */

export type TourExampleKind =
  | 'company'
  | 'orgUnits'
  | 'categories'
  | 'definitions'
  | 'upload'
  | 'publish'
  | 'maintenance'
  | 'factors'
  | 'dashboard'
  | 'report'
  | 'assistant'
  | 'team';

export interface TourStep {
  id: string;
  chapter: string;
  route: string;
  /** `data-tour` attribute value to spotlight; the card is centred when absent or not on screen. */
  target?: string;
  title: string;
  body: string;
  example?: TourExampleKind;
}

export const TOUR_CHAPTERS = [
  'Getting started',
  'Business units',
  'Activity Definitions',
  'Emission factors',
  'Dashboard',
  'Reports',
  'Assistant & team',
] as const;

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    chapter: 'Getting started',
    route: '/app/dashboard',
    title: 'Welcome to Carbon Glint',
    body: 'This tour walks you through the whole journey: set up business units, upload activity data, let Carbon Glint match emission factors, review the results and export a report. Pick an industry in the menu to see matching example data at every step. You can replay it any time from “Guided tour” in the sidebar.',
    example: 'company',
  },
  {
    id: 'nav',
    chapter: 'Getting started',
    route: '/app/dashboard',
    target: 'nav-dashboard',
    title: 'Everything lives in the sidebar',
    body: 'Work top to bottom: Org Units → Activity Definitions → Emission Factors → Dashboard → Reports. The Assistant answers questions about your own data.',
  },
  {
    id: 'org-nav',
    chapter: 'Business units',
    route: '/app/org-units',
    target: 'nav-org-units',
    title: 'Model your organisation',
    body: 'Your headquarters is created at onboarding. Add plants, offices, warehouses or campuses under it so emissions can be rolled up per business unit.',
  },
  {
    id: 'org-add',
    chapter: 'Business units',
    route: '/app/org-units',
    target: 'org-add',
    title: 'Add business units',
    body: 'Give each unit a short code (e.g. PL1, CHN). Upload sheets use these codes in the “Business Unit” column to assign rows automatically.',
    example: 'orgUnits',
  },
  {
    id: 'ad-nav',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    target: 'nav-activity-definitions',
    title: 'Activity Definitions = your emission sources',
    body: 'An Activity Definition classifies a source of emissions by scope and GHG category for a reporting period, then holds the uploaded data for it.',
  },
  {
    id: 'ad-categories',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    target: 'ad-categories',
    title: 'Categories recommended for your industry',
    body: 'Under each scope you see the GHG Protocol categories, with the ones most relevant to your industry first. Click “+” on a category to start a definition for it, or add your own custom category.',
    example: 'categories',
  },
  {
    id: 'ad-new',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    target: 'ad-new',
    title: 'Create a definition',
    body: 'Name it, choose scope and category, set the period and (optionally) a default business unit for rows that don’t name one.',
    example: 'definitions',
  },
  {
    id: 'ad-upload',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    title: 'Upload CSV or Excel',
    body: 'Open a definition and upload a sheet. Columns are mapped automatically (AI or manual), rows are validated, and you can import only the valid ones. Download an example sheet below and try it.',
    example: 'upload',
  },
  {
    id: 'ad-publish',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    title: 'Publish to calculate',
    body: 'Publishing locks the classification and starts emission factor matching. Each row gets a factor, a unit conversion and a CO2e result with a confidence score.',
    example: 'publish',
  },
  {
    id: 'ad-maintenance',
    chapter: 'Activity Definitions',
    route: '/app/activity-definitions',
    title: 'Delete rows and recalculate',
    body: 'Made a mistake? On a definition’s Activities tab select rows and delete them, then press “Recalculate” to re-run matching for the whole definition. You can keep or reset manual overrides.',
    example: 'maintenance',
  },
  {
    id: 'ef-nav',
    chapter: 'Emission factors',
    route: '/app/emission-factors',
    target: 'nav-emission-factors',
    title: 'Review the factor matches',
    body: 'See every calculated row with its factor and status. Filter to “Needs review” or “Unmatched” to fix low-confidence matches first.',
    example: 'factors',
  },
  {
    id: 'ef-trace',
    chapter: 'Emission factors',
    route: '/app/emission-factors',
    title: 'Trace and override',
    body: 'Click any row to open its traceability tree: input → category → factor (source, year, region) → conversion → result. Override with another library factor, a custom factor or a custom result — every override keeps an audit trail and can be reverted.',
  },
  {
    id: 'dash-bu',
    chapter: 'Dashboard',
    route: '/app/dashboard',
    target: 'dash-bu',
    title: 'Business units at a glance',
    body: 'Each card shows a unit’s total with its Scope 1 / 2 / 3 split, rolled up from its children. Click a unit to filter the whole dashboard to it.',
    example: 'dashboard',
  },
  {
    id: 'dash-lasagne',
    chapter: 'Dashboard',
    route: '/app/dashboard',
    target: 'dash-lasagne',
    title: 'The lasagne view',
    body: 'Rows are scopes (or business units), columns are months. Darker cells mean more CO2e. Click a row to drill down: scope → category → activity definition → individual activity.',
  },
  {
    id: 'dash-kpis',
    chapter: 'Dashboard',
    route: '/app/dashboard',
    target: 'dash-kpis',
    title: 'Headline numbers and filters',
    body: 'Totals per scope and data quality. Use the compact filters to narrow by scope, definition, business unit or dates.',
  },
  {
    id: 'reports',
    chapter: 'Reports',
    route: '/app/reports',
    target: 'nav-reports',
    title: 'Export a country-format report',
    body: 'Pick a business unit, a period and a format (India BRSR / NIRF, US GHG Protocol, UAE, Saudi, Australia, Singapore). The PDF is generated in the background and is ready to download in seconds.',
    example: 'report',
  },
  {
    id: 'assistant',
    chapter: 'Assistant & team',
    route: '/app/assistant',
    target: 'nav-assistant',
    title: 'Ask anything about your footprint',
    body: 'The assistant reads only your company’s data. Ask for a breakdown and it can answer with a chart.',
    example: 'assistant',
  },
  {
    id: 'team',
    chapter: 'Assistant & team',
    route: '/app/settings',
    target: 'nav-settings',
    title: 'Invite your team',
    body: 'Invite colleagues with their work email from Settings. They join your company workspace with admin access.',
    example: 'team',
  },
  {
    id: 'done',
    chapter: 'Assistant & team',
    route: '/app/dashboard',
    target: 'tour-button',
    title: 'You’re all set',
    body: 'That’s the whole journey. Watch any chapter again from “Guided tour” — as many times as you like.',
  },
];

export const firstStepOf = (chapter: string) =>
  Math.max(
    0,
    TOUR_STEPS.findIndex((s) => s.chapter === chapter),
  );

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where to put the tour card (fixed position) next to a spotlighted rectangle, staying on screen. */
export function placeCard(
  target: Rect | null,
  viewport: { width: number; height: number },
  card = { width: 400, height: 380 },
): { top: number; left: number } {
  const gap = 16;
  const clampTop = (t: number) => Math.min(Math.max(gap, t), Math.max(gap, viewport.height - card.height - gap));
  const clampLeft = (l: number) => Math.min(Math.max(gap, l), Math.max(gap, viewport.width - card.width - gap));
  if (!target || viewport.width < 700) {
    return {
      top:
        target && viewport.width < 700
          ? viewport.height - card.height - gap
          : clampTop((viewport.height - card.height) / 2),
      left: clampLeft((viewport.width - card.width) / 2),
    };
  }
  const right = target.left + target.width + gap;
  if (right + card.width + gap <= viewport.width) return { top: clampTop(target.top), left: right };
  const left = target.left - card.width - gap;
  if (left >= gap) return { top: clampTop(target.top), left };
  const below = target.top + target.height + gap;
  if (below + card.height + gap <= viewport.height) return { top: below, left: clampLeft(target.left) };
  return { top: clampTop(target.top - card.height - gap), left: clampLeft(target.left) };
}
