import type { FormEvent } from 'react';
import type { GhgCategory, OrgUnit, Scope } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';
import { SCOPES } from './scope';

export interface ActivityDefinitionFormValues {
  name: string;
  description: string;
  scope: Scope;
  categoryId: string;
  periodStart: string;
  periodEnd: string;
  defaultOrgUnitId: string | null;
}

export interface ActivityDefinitionDialogProps {
  open: boolean;
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  /** Categories of the selected scope (already ordered: recommended → others → custom). */
  categories: GhgCategory[];
  orgUnits: OrgUnit[];
  isSubmitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: ActivityDefinitionFormValues) => void;
  onAddCategory: (name: string) => void;
  isAddingCategory: boolean;
  addCategoryError?: string;
}

const year = new Date().getFullYear();

export function ActivityDefinitionDialog(props: ActivityDefinitionDialogProps) {
  const { open, scope, categories } = props;
  const recommended = categories.filter((c) => c.recommended);
  const others = categories.filter((c) => !c.recommended && !c.custom);
  const custom = categories.filter((c) => c.custom);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    props.onSubmit({
      name: v.name ?? '',
      description: v.description ?? '',
      scope,
      categoryId: v.categoryId ?? '',
      periodStart: v.periodStart ?? '',
      periodEnd: v.periodEnd ?? '',
      defaultOrgUnitId: v.defaultOrgUnitId || null,
    });
  };
  const addCategory = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    props.onAddCategory(formValues(e.currentTarget).customName ?? '');
    e.currentTarget.reset();
  };
  const group = (label: string, items: GhgCategory[]) =>
    items.length
      ? [
          <ListSubheader key={label}>{label}</ListSubheader>,
          ...items.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          )),
        ]
      : [];

  return (
    <Dialog open={open} onClose={props.onClose} fullWidth maxWidth="md">
      <DialogTitle>New activity definition</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <form id="ad-form" onSubmit={submit}>
              <Stack spacing={2}>
                {props.error && <Alert severity="error">{props.error}</Alert>}
                <TextField
                  name="name"
                  label="Name"
                  required
                  placeholder="e.g. Diesel for DG sets"
                  slotProps={{ htmlInput: { maxLength: 160 } }}
                />
                <TextField name="description" label="Description" multiline minRows={2} />
                <TextField
                  label="Scope"
                  select
                  value={scope}
                  onChange={(e) => props.onScopeChange(Number(e.target.value) as Scope)}
                >
                  {SCOPES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  key={`cat-${scope}-${categories.length}`}
                  name="categoryId"
                  label="GHG category"
                  select
                  required
                  defaultValue={custom.at(-1)?.id ?? ''}
                  helperText={recommended.length ? 'Recommended for your industry are listed first.' : undefined}
                >
                  {[
                    ...group('Recommended for your industry', recommended),
                    ...group('Other categories', others),
                    ...group('Your custom categories', custom),
                  ]}
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField
                    name="periodStart"
                    label="Period start"
                    type="date"
                    required
                    fullWidth
                    defaultValue={`${year}-01-01`}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    name="periodEnd"
                    label="Period end"
                    type="date"
                    required
                    fullWidth
                    defaultValue={`${year}-12-31`}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <TextField
                  name="defaultOrgUnitId"
                  label="Default business unit"
                  select
                  defaultValue=""
                  helperText="Used for rows without a business unit column."
                >
                  <MenuItem value="">— None —</MenuItem>
                  {props.orgUnits.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </form>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2">Missing a category?</Typography>
              <Typography variant="body2" color="text.secondary">
                Add your own under {SCOPES.find((s) => s.value === scope)?.short}. It is only visible to your company.
              </Typography>
              <Stack component="form" direction="row" spacing={1} onSubmit={addCategory}>
                <TextField name="customName" size="small" label="Category name" required fullWidth />
                <Button type="submit" loading={props.isAddingCategory}>
                  Add
                </Button>
              </Stack>
              {props.addCategoryError && <Alert severity="error">{props.addCategoryError}</Alert>}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button type="submit" form="ad-form" variant="contained" loading={props.isSubmitting}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
