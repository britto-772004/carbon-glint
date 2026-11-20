import type { ActivityDefinition, CalculationStatus, OrgUnit, Scope } from '@carbon-glint/sdk';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export interface EmissionFilterValues {
  scope?: Scope;
  activityDefinitionId?: string;
  orgUnitId?: string;
  status?: CalculationStatus;
  from?: string;
  to?: string;
}

export interface EmissionFiltersBarProps {
  values: EmissionFilterValues;
  onChange: (patch: Partial<EmissionFilterValues>) => void;
  onReset: () => void;
  definitions: ActivityDefinition[];
  orgUnits: OrgUnit[];
  showStatus?: boolean;
}

export function EmissionFiltersBar({
  values,
  onChange,
  onReset,
  definitions,
  orgUnits,
  showStatus = true,
}: EmissionFiltersBarProps) {
  const sel = (v: string | number | undefined) => (v === undefined ? '' : v);
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}
    >
      <TextField
        select
        size="small"
        label="Scope"
        value={sel(values.scope)}
        onChange={(e) => onChange({ scope: e.target.value ? (Number(e.target.value) as Scope) : undefined })}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="">All scopes</MenuItem>
        {[1, 2, 3].map((s) => (
          <MenuItem key={s} value={s}>
            Scope {s}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Activity definition"
        value={sel(values.activityDefinitionId)}
        onChange={(e) => onChange({ activityDefinitionId: e.target.value || undefined })}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">All definitions</MenuItem>
        {definitions.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Business unit"
        value={sel(values.orgUnitId)}
        onChange={(e) => onChange({ orgUnitId: e.target.value || undefined })}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">All business units</MenuItem>
        {orgUnits.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            {u.name}
          </MenuItem>
        ))}
      </TextField>
      {showStatus && (
        <TextField
          select
          size="small"
          label="Status"
          value={sel(values.status)}
          onChange={(e) => onChange({ status: (e.target.value || undefined) as CalculationStatus | undefined })}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="matched">Matched</MenuItem>
          <MenuItem value="needs_review">Needs review</MenuItem>
          <MenuItem value="unmatched">Unmatched</MenuItem>
          <MenuItem value="overridden">Overridden</MenuItem>
        </TextField>
      )}
      <TextField
        size="small"
        type="date"
        label="From"
        value={sel(values.from)}
        onChange={(e) => onChange({ from: e.target.value || undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="To"
        value={sel(values.to)}
        onChange={(e) => onChange({ to: e.target.value || undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button onClick={onReset}>Reset</Button>
    </Stack>
  );
}
