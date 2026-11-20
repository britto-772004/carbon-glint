import TablePagination from '@mui/material/TablePagination';
import type { Pagination } from '../../lib/pagination';

const OPTIONS = [5, 10, 25, 50];

/** Footer for tables: rows-per-page selector, "1–10 of 42" and prev/next. Hidden when everything fits on one page. */
export function TablePager({ page, rowsPerPage, count, onPageChange, onRowsPerPageChange }: Pagination) {
  if (count <= OPTIONS[0]!) return null;
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={OPTIONS}
      onPageChange={(_, p) => onPageChange(p)}
      onRowsPerPageChange={(e) => onRowsPerPageChange(Number(e.target.value))}
      labelRowsPerPage="Rows"
      sx={{ borderTop: 1, borderColor: 'divider' }}
    />
  );
}
