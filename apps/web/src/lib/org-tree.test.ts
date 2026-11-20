import { describe, expect, it } from 'vitest';
import type { OrgUnit } from '@carbon-glint/sdk';
import { NODE_HEIGHT, NODE_WIDTH, descendantsOf, findDropTarget, flattenTree, layoutTree } from './org-tree';

const unit = (id: string, parentId: string | null, name = id, type: OrgUnit['type'] = 'branch'): OrgUnit => ({
  id,
  parentId,
  name,
  code: id.toUpperCase(),
  type,
  country: null,
  city: null,
  address: null,
  active: true,
  createdAt: '2026-11-20T00:00:00.000Z',
});
const units = [
  unit('b', 'hq', 'Bravo'),
  unit('hq', null, 'HQ', 'hq'),
  unit('a', 'hq', 'Alpha'),
  unit('a1', 'a', 'Alpha One'),
];

describe('org-tree helpers', () => {
  it('flattens depth-first with depths and child counts', () => {
    expect(flattenTree(units).map((r) => [r.unit.id, r.depth, r.childCount])).toEqual([
      ['hq', 0, 2],
      ['a', 1, 1],
      ['a1', 2, 0],
      ['b', 1, 0],
    ]);
  });

  it('lays out children below their parent', () => {
    const pos = layoutTree(units);
    expect(pos.a!.y).toBeGreaterThan(pos.hq!.y);
    expect(pos.a1!.y).toBeGreaterThan(pos.a!.y);
  });

  it('finds the unit a node was dropped on', () => {
    const pos = { hq: { x: 0, y: 0 }, a: { x: 400, y: 200 } };
    expect(findDropTarget('a', { x: 10, y: 10 }, pos)).toBe('hq');
    expect(findDropTarget('a', { x: 1000, y: 1000 }, pos)).toBeNull();
    expect(findDropTarget('hq', { x: 400 + NODE_WIDTH / 4, y: 200 + NODE_HEIGHT / 4 }, pos)).toBe('a');
  });

  it('computes descendants', () => {
    expect([...descendantsOf(units, 'a')].sort()).toEqual(['a', 'a1']);
  });
});
