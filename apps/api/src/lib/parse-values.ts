/** Tolerant parsers for spreadsheet cells. */

/** "1,234.5", "1 234,5" (EU), "₹ 2,000", "(120)" → number; null if not numeric. */
export function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = raw.trim().replace(/[^\d.,\-()eE+]/g, '');
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && /,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.'); // European decimal comma
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? `${y}-${pad(m)}-${pad(d)}`
    : null;
};
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Parse a date cell to ISO yyyy-mm-dd. Accepts ISO, dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, "15 Jan 2026",
 * "Jan 2026" / "2026-01" (→ first or last day of month), and Excel serial numbers.
 */
export function parseDate(
  raw: string | number | Date | null | undefined,
  edge: 'start' | 'end' = 'start',
): string | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  if (typeof raw === 'number' || /^\d{5}(\.\d+)?$/.test(String(raw).trim())) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = raw.trim().toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(+m[1]!, +m[2]!, +m[3]!);
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) return iso(+m[3]!, +m[2]!, +m[1]!); // day-first
  if ((m = s.match(/^(\d{1,2})[\s-]([a-z]{3,9})[\s,-]+(\d{4})$/)) && MONTHS[m[2]!.slice(0, 3)]) {
    return iso(+m[3]!, MONTHS[m[2]!.slice(0, 3)]!, +m[1]!);
  }
  if ((m = s.match(/^([a-z]{3,9})[\s,-]+(\d{4})$/)) && MONTHS[m[1]!.slice(0, 3)]) {
    const y = +m[2]!;
    const mo = MONTHS[m[1]!.slice(0, 3)]!;
    return iso(y, mo, edge === 'start' ? 1 : lastDay(y, mo));
  }
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) {
    const y = +m[1]!;
    const mo = +m[2]!;
    return mo >= 1 && mo <= 12 ? iso(y, mo, edge === 'start' ? 1 : lastDay(y, mo)) : null;
  }
  return null;
}
