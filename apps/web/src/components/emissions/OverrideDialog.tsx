import type { FormEvent } from 'react';
import type { FactorSearchHit } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';

export type OverrideType = 'factor' | 'custom_factor' | 'custom_result';

export interface OverrideDialogProps {
  open: boolean;
  activityLabel: string;
  activityUnit: string;
  type: OverrideType;
  onTypeChange: (t: OverrideType) => void;
  onSearch: (q: string) => void;
  hits?: FactorSearchHit[];
  isSearching: boolean;
  selectedFactorId?: string;
  onSelectFactor: (id: string) => void;
  onClose: () => void;
  onSubmit: (v: { value?: number; unit?: string; citation?: string; reason: string }) => void;
  isSubmitting: boolean;
  error?: string;
}

export function OverrideDialog(p: OverrideDialogProps) {
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    p.onSearch(formValues(e.currentTarget).q ?? '');
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    p.onSubmit({
      value: v.value ? Number(v.value) : undefined,
      unit: v.unit || undefined,
      citation: v.citation || undefined,
      reason: v.reason ?? '',
    });
  };
  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="md">
      <DialogTitle>Override emission factor</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{p.activityLabel}</Typography>
          {p.error && <Alert severity="error">{p.error}</Alert>}
          <RadioGroup row value={p.type} onChange={(e) => p.onTypeChange(e.target.value as OverrideType)}>
            <FormControlLabel value="factor" control={<Radio />} label="Pick a library factor" />
            <FormControlLabel value="custom_factor" control={<Radio />} label="Custom factor" />
            <FormControlLabel value="custom_result" control={<Radio />} label="Custom result" />
          </RadioGroup>
          {p.type === 'factor' && (
            <>
              <Stack component="form" direction="row" spacing={1} onSubmit={search}>
                <TextField
                  name="q"
                  size="small"
                  fullWidth
                  label={`Search factors convertible from ${p.activityUnit}`}
                />
                <Button type="submit">Search</Button>
              </Stack>
              {p.isSearching && <LinearProgress />}
              <List
                dense
                sx={{ maxHeight: 280, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
                aria-label="Factor results"
              >
                {(p.hits ?? []).map((h) => (
                  <ListItemButton
                    key={h.factor.id}
                    selected={p.selectedFactorId === h.factor.id}
                    onClick={() => p.onSelectFactor(h.factor.id)}
                  >
                    <ListItemText
                      primary={h.factor.name}
                      secondary={`${h.factor.co2ePerUnit} kg CO₂e/${h.factor.unit} · ${h.factor.sourceCode} · ${h.factor.category} · ${h.factor.region}`}
                    />
                  </ListItemButton>
                ))}
                {p.hits?.length === 0 && (
                  <Typography sx={{ p: 2 }} color="text.secondary">
                    No unit-compatible factors found.
                  </Typography>
                )}
              </List>
            </>
          )}
          <form id="override-form" onSubmit={submit}>
            <Stack spacing={2}>
              {p.type === 'custom_factor' && (
                <Stack direction="row" spacing={2}>
                  <TextField
                    name="value"
                    label="kg CO₂e per unit"
                    type="number"
                    required
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                  <TextField name="unit" label="Unit" required defaultValue={p.activityUnit} />
                  <TextField name="citation" label="Citation / source" fullWidth />
                </Stack>
              )}
              {p.type === 'custom_result' && (
                <TextField
                  name="value"
                  label="Result (kg CO₂e)"
                  type="number"
                  required
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              )}
              <TextField
                name="reason"
                label="Reason (required, kept in the audit trail)"
                required
                multiline
                minRows={2}
                slotProps={{ htmlInput: { minLength: 3, maxLength: 1000 } }}
              />
            </Stack>
          </form>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={p.onClose}>Cancel</Button>
        <Button
          type="submit"
          form="override-form"
          variant="contained"
          loading={p.isSubmitting}
          disabled={p.type === 'factor' && !p.selectedFactorId}
        >
          Apply override
        </Button>
      </DialogActions>
    </Dialog>
  );
}
