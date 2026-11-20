import { OrgUnitTypeIcon } from './OrgUnitTypeIcon';
import type { FormEvent } from 'react';
import type { OrgUnit, OrgUnitType } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { COUNTRIES } from '../../lib/countries';
import { formValues } from '../../lib/errors';
import { ORG_UNIT_TYPES } from './types';

export interface OrgUnitFormValues {
  name: string;
  code: string;
  type: OrgUnitType;
  parentId: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  active: boolean;
}

export interface OrgUnitDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Existing unit when editing. */
  unit?: OrgUnit;
  /** Default parent when creating. */
  parentId: string | null;
  /** Units that can be chosen as parent (already excludes the unit's own subtree). */
  parentOptions: OrgUnit[];
  isSubmitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: OrgUnitFormValues) => void;
}

export function OrgUnitDialog({
  open,
  mode,
  unit,
  parentId,
  parentOptions,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: OrgUnitDialogProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit({
      name: v.name ?? '',
      code: v.code ?? '',
      type: (v.type ?? 'branch') as OrgUnitType,
      parentId: v.parentId || null,
      country: v.country || null,
      city: v.city || null,
      address: v.address || null,
      active: v.active === 'on',
    });
  };
  const isHq = unit?.type === 'hq';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} key={unit?.id ?? `new-${parentId}`}>
        <DialogTitle>{mode === 'create' ? 'Add business unit' : `Edit ${unit?.name}`}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {error && (
              <Grid size={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                name="name"
                label="Name"
                required
                fullWidth
                defaultValue={unit?.name ?? ''}
                slotProps={{ htmlInput: { maxLength: 160 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                name="code"
                label="Code"
                required
                fullWidth
                defaultValue={unit?.code ?? ''}
                helperText="Unique, e.g. PUN-01"
                slotProps={{ htmlInput: { maxLength: 40, pattern: '[A-Za-z0-9][A-Za-z0-9_.\\-]*' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="type"
                label="Type"
                select
                required
                fullWidth
                defaultValue={unit?.type ?? 'branch'}
                disabled={isHq}
              >
                {ORG_UNIT_TYPES.filter((t) => isHq || t.value !== 'hq').map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    <OrgUnitTypeIcon
                      type={t.value}
                      fontSize="small"
                      sx={{ mr: 1, verticalAlign: 'middle', color: 'text.secondary' }}
                    />
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              {isHq && <input type="hidden" name="type" value="hq" />}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="parentId"
                label="Parent unit"
                select
                fullWidth
                defaultValue={unit ? (unit.parentId ?? '') : (parentId ?? '')}
              >
                <MenuItem value="">— None (top level) —</MenuItem>
                {parentOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="country" label="Country" select fullWidth defaultValue={unit?.country ?? ''}>
                <MenuItem value="">—</MenuItem>
                {COUNTRIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="city" label="City" fullWidth defaultValue={unit?.city ?? ''} />
            </Grid>
            <Grid size={12}>
              <TextField
                name="address"
                label="Address"
                fullWidth
                multiline
                minRows={2}
                defaultValue={unit?.address ?? ''}
              />
            </Grid>
            {mode === 'edit' && (
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch name="active" defaultChecked={unit?.active ?? true} />}
                  label="Active"
                />
              </Grid>
            )}
            {mode === 'create' && <input type="hidden" name="active" value="on" />}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {mode === 'create' ? 'Add unit' : 'Save changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
