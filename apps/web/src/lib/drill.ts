import type { HeatmapGroupBy, Scope } from '@carbon-glint/sdk';
import type { EmissionFilterValues } from '../components/emissions/EmissionFiltersBar';

export type GroupMode = 'ghg' | 'bu';
export interface DrillStep {
  groupBy: HeatmapGroupBy;
  key: string;
  label: string;
}

const LEVELS: Record<GroupMode, HeatmapGroupBy[]> = {
  ghg: ['scope', 'category', 'activityDefinition', 'activity'],
  bu: ['orgUnit', 'activityDefinition', 'activity'],
};
const ROOT_LABEL: Record<GroupMode, string> = { ghg: 'All scopes', bu: 'All business units' };

/** Group-by for the current depth. */
export const currentGroupBy = (mode: GroupMode, path: DrillStep[]): HeatmapGroupBy =>
  LEVELS[mode][Math.min(path.length, LEVELS[mode].length - 1)]!;

/** True when rows at this depth can be drilled into another heatmap level (activities open the trace instead). */
export const canDrill = (mode: GroupMode, path: DrillStep[]) => path.length < LEVELS[mode].length - 1;

export const breadcrumbOf = (mode: GroupMode, path: DrillStep[]) => [ROOT_LABEL[mode], ...path.map((s) => s.label)];

/** Filters implied by the drill path, layered over the user's filters. */
export function drillFilters(base: EmissionFilterValues, path: DrillStep[]): EmissionFilterValues {
  const f = { ...base };
  for (const s of path) {
    if (s.groupBy === 'scope') f.scope = Number(s.key) as Scope;
    if (s.groupBy === 'category') (f as EmissionFilterValues & { categoryId?: string }).categoryId = s.key;
    if (s.groupBy === 'activityDefinition') f.activityDefinitionId = s.key;
    if (s.groupBy === 'orgUnit' && s.key !== 'none') f.orgUnitId = s.key;
  }
  return f;
}

/** Drop undefined values (cleaner query keys and URLs). */
export const compact = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
