import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export type SpreadsheetType = 'csv' | 'xlsx';

export interface ParsedSheet {
  sheets: string[];
  sheetName: string | null;
  /** 1-based row number of the header row within the sheet. */
  headerRow: number;
  columns: string[];
  /** Data rows below the header, as display strings aligned to `columns` (blank rows dropped). */
  rows: string[][];
  /** 1-based sheet row number of each entry in `rows` (for error messages). */
  rowNumbers: number[];
}

export const detectType = (fileName: string): SpreadsheetType | null => {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext === 'csv' ? 'csv' : ext === 'xlsx' ? 'xlsx' : null;
};

const cellText = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return cellText(v.result as ExcelJS.CellValue); // formula
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return String(v.text); // hyperlink
    if ('error' in v) return '';
  }
  return String(v).trim();
};

/** Header = the first row (within the first 15) with the most non-empty cells, needing ≥ 2 text cells. */
export function detectHeaderRow(grid: string[][]): number {
  let best = 0;
  let bestCount = 0;
  grid.slice(0, 15).forEach((row, i) => {
    const filled = row.filter((c) => c.trim() !== '');
    const texty = filled.filter((c) => !/^-?[\d.,\s]+$/.test(c));
    if (texty.length >= 2 && filled.length > bestCount) {
      best = i;
      bestCount = filled.length;
    }
  });
  return best + 1;
}

/** Turns a raw grid into header + rows, de-duplicating/naming empty headers and dropping blank rows. */
function shape(
  grid: string[][],
  headerRow?: number,
): Pick<ParsedSheet, 'headerRow' | 'columns' | 'rows' | 'rowNumbers'> {
  const h = headerRow ?? detectHeaderRow(grid);
  const header = grid[h - 1] ?? [];
  const width = Math.max(header.length, ...grid.slice(h).map((r) => r.length), 0);
  const seen = new Map<string, number>();
  const columns = Array.from({ length: width }, (_, i) => {
    const base = (header[i] ?? '').trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
  const rows: string[][] = [];
  const rowNumbers: number[] = [];
  grid.slice(h).forEach((r, i) => {
    const cells = Array.from({ length: width }, (_, c) => (r[c] ?? '').trim());
    if (cells.some((c) => c !== '')) {
      rows.push(cells);
      rowNumbers.push(h + i + 1);
    }
  });
  return { headerRow: h, columns, rows, rowNumbers };
}

export async function parseSpreadsheet(
  data: Buffer,
  type: SpreadsheetType,
  opts: { sheetName?: string | null; headerRow?: number } = {},
): Promise<ParsedSheet> {
  if (type === 'csv') {
    const text = data.toString('utf8').replace(/^\uFEFF/, '');
    const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
    const grid = result.data.map((r) => r.map((c) => String(c ?? '')));
    return { sheets: [], sheetName: null, ...shape(grid, opts.headerRow) };
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);
  const sheets = wb.worksheets.filter((w) => w.state !== 'hidden' && w.state !== 'veryHidden').map((w) => w.name);
  const ws = (opts.sheetName && wb.getWorksheet(opts.sheetName)) || wb.getWorksheet(sheets[0] ?? '');
  if (!ws) return { sheets, sheetName: null, headerRow: 1, columns: [], rows: [], rowNumbers: [] };
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const values = row.values as ExcelJS.CellValue[]; // 1-based
    grid[n - 1] = values.slice(1).map(cellText);
  });
  for (let i = 0; i < grid.length; i++) grid[i] ??= [];
  return { sheets, sheetName: ws.name, ...shape(grid, opts.headerRow) };
}
