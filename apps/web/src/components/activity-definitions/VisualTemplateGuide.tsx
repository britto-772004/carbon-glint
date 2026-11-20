import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { templateUrl } from '../../lib/api-urls';

const COLUMNS = [
  {
    header: 'Activity Description',
    field: 'Activity description',
    sample: ['Grid electricity – office', 'Diesel – DG set'],
    required: true,
  },
  { header: 'Measure', field: 'Measure', sample: ['18,450', '1,200'], required: true },
  { header: 'Unit', field: 'Unit', sample: ['kWh', 'L'], required: true },
  { header: 'Period Start', field: 'Period', sample: ['2026-01-01', '2026-01-01'], required: false },
];

/** Illustrated mapping from spreadsheet columns to GHG activity fields, with template downloads. */
export function VisualTemplateGuide() {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">What a good source sheet looks like</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          role="img"
          aria-label="Spreadsheet columns mapped to GHG activity fields"
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(120px, 1fr))`,
            minWidth: 620,
            gap: 0,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            fontSize: 13,
          }}
        >
          {COLUMNS.map((c) => (
            <Box
              key={c.header}
              sx={{
                px: 1,
                py: 0.75,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 600,
                borderRight: 1,
                borderColor: 'divider',
              }}
            >
              {c.header}
            </Box>
          ))}
          {[0, 1].map((r) =>
            COLUMNS.map((c) => (
              <Box
                key={`${c.header}-${r}`}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderTop: 1,
                  borderRight: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.sample[r]}
              </Box>
            )),
          )}
          {COLUMNS.map((c) => (
            <Box
              key={`${c.header}-arrow`}
              sx={{ textAlign: 'center', py: 0.5, color: 'text.secondary', bgcolor: 'action.hover' }}
              aria-hidden
            >
              ↓
            </Box>
          ))}
          {COLUMNS.map((c) => (
            <Box key={`${c.header}-field`} sx={{ textAlign: 'center', pb: 1, bgcolor: 'action.hover' }}>
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: c.required ? 'secondary.main' : 'background.paper',
                  color: c.required ? 'secondary.contrastText' : 'text.primary',
                  border: c.required ? 0 : 1,
                  borderColor: 'divider',
                }}
              >
                {c.field}
                {c.required ? ' *' : ''}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        One row per activity. Your column names can differ — you'll map them next (or let AI do it). * = required.
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small" href={templateUrl('xlsx')}>
          Download Excel template
        </Button>
        <Button size="small" href={templateUrl('csv')}>
          CSV version
        </Button>
      </Stack>
    </Stack>
  );
}
