/** Depth-first ordering of a unit subtree (for report boundaries). */
export function flattenOrgTree(units: Array<{ id: string; parentId: string | null; name: string }>, rootId: string) {
  const children = new Map<string, typeof units>();
  for (const u of units) if (u.parentId) children.set(u.parentId, [...(children.get(u.parentId) ?? []), u]);
  const out: Array<{ name: string; depth: number }> = [];
  const walk = (id: string, depth: number) => {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    out.push({ name: u.name, depth });
    for (const c of (children.get(id) ?? []).sort((a, b) => a.name.localeCompare(b.name))) walk(c.id, depth + 1);
  };
  walk(rootId, 0);
  return out;
}
