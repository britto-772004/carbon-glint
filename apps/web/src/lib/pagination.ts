import { useState } from 'react';

/** Props for <TablePager/>: everything a paginated table needs, owned by the container. */
export interface Pagination {
  page: number;
  rowsPerPage: number;
  count: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

/** Client-side pagination state for lists that are already fully loaded. */
export function usePagination(count: number, initialRowsPerPage = 10): Pagination {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const lastPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1);
  return {
    page: Math.min(page, lastPage), // deleting the last row of the last page steps back
    rowsPerPage,
    count,
    onPageChange: setPage,
    onRowsPerPageChange: (n) => {
      setRowsPerPage(n);
      setPage(0);
    },
  };
}

export const paginate = <T>(list: T[], p: Pick<Pagination, 'page' | 'rowsPerPage'>): T[] =>
  list.slice(p.page * p.rowsPerPage, (p.page + 1) * p.rowsPerPage);
