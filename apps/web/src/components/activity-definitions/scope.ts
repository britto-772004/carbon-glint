import type { Scope } from '@carbon-glint/sdk';

export const SCOPES: { value: Scope; label: string; short: string; color: 'primary' | 'secondary' | 'warning' }[] = [
  { value: 1, label: 'Scope 1 — direct emissions', short: 'Scope 1', color: 'warning' },
  { value: 2, label: 'Scope 2 — purchased energy', short: 'Scope 2', color: 'primary' },
  { value: 3, label: 'Scope 3 — value chain', short: 'Scope 3', color: 'secondary' },
];
export const scopeMeta = (s: Scope) => SCOPES.find((x) => x.value === s)!;

/** GHG Protocol sequence: "1. Purchased goods…" → "15. Investments"; custom categories (no number) come last. */
const sequenceOf = (name: string) => Number.parseInt(name, 10) || Number.POSITIVE_INFINITY;
export const bySequence = <T extends { name: string }>(list: T[]): T[] =>
  [...list].sort((a, b) => sequenceOf(a.name) - sequenceOf(b.name) || a.name.localeCompare(b.name));
