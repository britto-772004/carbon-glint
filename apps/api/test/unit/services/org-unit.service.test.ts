import { describe, expect, it } from 'vitest';
import { subtreeIds } from '../../../src/services/org-unit.service.js';

describe('subtreeIds', () => {
  const units = [
    { id: 'hq', parentId: null },
    { id: 'a', parentId: 'hq' },
    { id: 'a1', parentId: 'a' },
    { id: 'a2', parentId: 'a' },
    { id: 'b', parentId: 'hq' },
  ];
  it('returns the node and all descendants', () => {
    expect([...subtreeIds(units, 'a')].sort()).toEqual(['a', 'a1', 'a2']);
    expect(subtreeIds(units, 'hq').size).toBe(5);
    expect([...subtreeIds(units, 'b')]).toEqual(['b']);
  });
});
