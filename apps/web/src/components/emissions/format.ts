/** "12.3 t CO₂e" for ≥ 1 t, otherwise "850 kg CO₂e". */
export function formatCo2e(kg: number, opts: { unit?: boolean } = {}): string {
  const suffix = opts.unit === false ? '' : ' CO₂e';
  if (Math.abs(kg) >= 1000)
    return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: kg >= 100_000 ? 0 : 1 })} t${suffix}`;
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: kg >= 10 ? 0 : 2 })} kg${suffix}`;
}

export const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—');

export const STATUS_META = {
  matched: { label: 'Matched', color: 'success' },
  needs_review: { label: 'Needs review', color: 'warning' },
  unmatched: { label: 'Unmatched', color: 'error' },
  overridden: { label: 'Overridden', color: 'info' },
} as const;
