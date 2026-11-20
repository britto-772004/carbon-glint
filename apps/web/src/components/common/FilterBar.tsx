import type { ReactNode } from 'react';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';

/**
 * Compact, single-row filter strip (wraps on small screens). Children are small TextFields/selects;
 * this shrinks their height, font and labels so filters don't dominate the page.
 */
export function FilterBar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      data-tour="filters"
      sx={{
        px: 1.25,
        py: 0.75,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        '& .MuiInputBase-root': { fontSize: 13, height: 32, borderRadius: 1.5 },
        '& .MuiInputBase-input': { py: 0.5 },
        '& .MuiSelect-select': { py: '5px !important' },
        '& .MuiInputLabel-root': { fontSize: 13 },
        '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { transform: 'translate(12px, 7px) scale(1)' },
        '& .MuiButton-root': { fontSize: 13, minHeight: 30, py: 0.25 },
      }}
    >
      <FilterListRounded fontSize="small" color="action" sx={{ mr: 0.25 }} aria-hidden />
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {children}
      </Stack>
      {end}
    </Paper>
  );
}
