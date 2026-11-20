import type { ReactNode } from 'react';
import type { EmissionFactorSource } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

export interface EmissionFactorsPageProps {
  sources: EmissionFactorSource[];
  filters: ReactNode;
  view: 'heatmap' | 'table';
  onView: (v: 'heatmap' | 'table') => void;
  heatmap: ReactNode;
  table: ReactNode;
  drawer: ReactNode;
  dialog: ReactNode;
  error?: string;
}

export function EmissionFactorsPage(p: EmissionFactorsPageProps) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {p.sources.length === 0 ? (
          <Alert severity="warning">
            No emission factor databases loaded yet — run the factor import (see apps/infra/README.md).
          </Alert>
        ) : (
          p.sources.map((s) => (
            <Chip
              key={s.id}
              variant="outlined"
              label={`${s.publisher} ${s.year} · ${s.factorCount.toLocaleString()} factors`}
              title={`${s.name} — ${s.licence}`}
            />
          ))
        )}
      </Stack>
      {p.filters}
      {p.error && <Alert severity="error">{p.error}</Alert>}
      <Tabs value={p.view} onChange={(_, v) => p.onView(v)}>
        <Tab value="heatmap" label="Lasagne heatmap" />
        <Tab value="table" label="Activities" />
      </Tabs>
      {p.view === 'heatmap' ? p.heatmap : p.table}
      {p.drawer}
      {p.dialog}
    </Stack>
  );
}
