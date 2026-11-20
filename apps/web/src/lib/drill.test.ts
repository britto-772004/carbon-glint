import { describe, expect, it } from 'vitest';
import { breadcrumbOf, canDrill, currentGroupBy, drillFilters } from './drill';

describe('drill helpers', () => {
  const path = [
    { groupBy: 'scope' as const, key: '1', label: 'Scope 1' },
    { groupBy: 'category' as const, key: 'cat-1', label: 'Stationary combustion' },
  ];
  it('walks scope → category → definition → activity', () => {
    expect(currentGroupBy('ghg', [])).toBe('scope');
    expect(currentGroupBy('ghg', path)).toBe('activityDefinition');
    expect(canDrill('ghg', path)).toBe(true);
    expect(canDrill('ghg', [...path, { groupBy: 'activityDefinition', key: 'ad', label: 'AD' }])).toBe(false);
    expect(currentGroupBy('bu', [])).toBe('orgUnit');
  });
  it('turns the path into filters and a breadcrumb', () => {
    expect(drillFilters({ from: '2026-01-01' }, path)).toEqual({ from: '2026-01-01', scope: 1, categoryId: 'cat-1' });
    expect(breadcrumbOf('ghg', path)).toEqual(['All scopes', 'Scope 1', 'Stationary combustion']);
  });
});
