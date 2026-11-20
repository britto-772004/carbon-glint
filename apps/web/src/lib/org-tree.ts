import dagre from '@dagrejs/dagre';
import type { OrgUnit } from '@carbon-glint/sdk';

export const NODE_WIDTH = 250;
export const NODE_HEIGHT = 118;

export interface TreeRow {
  unit: OrgUnit;
  depth: number;
  childCount: number;
}

/** Depth-first ordering (roots first, children alphabetically) with depth — for the table view. */
export function flattenTree(units: OrgUnit[]): TreeRow[] {
  const byParent = new Map<string | null, OrgUnit[]>();
  const ids = new Set(units.map((u) => u.id));
  for (const u of units) {
    const key = u.parentId && ids.has(u.parentId) ? u.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), u]);
  }
  for (const list of byParent.values())
    list.sort((a, b) => (a.type === 'hq' ? -1 : b.type === 'hq' ? 1 : a.name.localeCompare(b.name)));

  const rows: TreeRow[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const unit of byParent.get(parent) ?? []) {
      rows.push({ unit, depth, childCount: byParent.get(unit.id)?.length ?? 0 });
      walk(unit.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

/** Top-down tree layout (dagre). Returns top-left positions keyed by unit id. */
export function layoutTree(units: OrgUnit[]): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(units.map((u) => u.id));
  for (const u of units) g.setNode(u.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const u of units) if (u.parentId && ids.has(u.parentId)) g.setEdge(u.parentId, u.id);
  dagre.layout(g);
  const out: Record<string, { x: number; y: number }> = {};
  for (const u of units) {
    const n = g.node(u.id);
    out[u.id] = { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 };
  }
  return out;
}

/** Which unit (other than the dragged one) the dragged node's centre was dropped on, if any. */
export function findDropTarget(
  draggedId: string,
  draggedPos: { x: number; y: number },
  positions: Record<string, { x: number; y: number }>,
): string | null {
  const cx = draggedPos.x + NODE_WIDTH / 2;
  const cy = draggedPos.y + NODE_HEIGHT / 2;
  for (const [id, p] of Object.entries(positions)) {
    if (id === draggedId) continue;
    if (cx >= p.x && cx <= p.x + NODE_WIDTH && cy >= p.y && cy <= p.y + NODE_HEIGHT) return id;
  }
  return null;
}

/** Ids of a unit and all its descendants (a unit can't be moved under these). */
export function descendantsOf(units: OrgUnit[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of units) {
      if (u.parentId && out.has(u.parentId) && !out.has(u.id)) {
        out.add(u.id);
        grew = true;
      }
    }
  }
  return out;
}
