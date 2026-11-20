const names = new Intl.DisplayNames(['en'], { type: 'region' });

/** ISO 3166-1 alpha-2 → English country name (null for unknown/empty). */
export function countryNameOf(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return names.of(code) ?? null;
  } catch {
    return null;
  }
}
