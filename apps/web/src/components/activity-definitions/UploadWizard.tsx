import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import type { ChangeEvent } from 'react';
import type { ColumnMapping, DataSource, MappingSuggestion } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import StepConnector from '@mui/material/StepConnector';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MAPPING_FIELDS, WIZARD_STEPS, isMappingComplete, type MappingField } from './mapping-fields';
import { VisualTemplateGuide } from './VisualTemplateGuide';

export type MappingMode = 'ai' | 'manual';

export interface UploadWizardProps {
  open: boolean;
  step: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  // upload
  onFile: (file: File) => void;
  isUploading: boolean;
  uploadError?: string;
  // layout
  dataSource?: DataSource;
  onLayoutChange: (change: { sheetName?: string; headerRow?: number }) => void;
  isRelayouting: boolean;
  // mapping
  mappingMode: MappingMode | null;
  onChooseMode: (mode: MappingMode) => void;
  suggestion?: MappingSuggestion;
  isSuggesting: boolean;
  mapping: ColumnMapping;
  onMappingChange: (field: MappingField, column: string | null) => void;
  // import
  onlyValidRows: boolean;
  onToggleOnlyValid: (v: boolean) => void;
  onImport: () => void;
  isImporting: boolean;
  importError?: string;
}

const confidenceChip = (c: number | undefined) =>
  c === undefined || c === 0 ? null : (
    <Chip
      size="small"
      variant="outlined"
      color={c >= 0.8 ? 'success' : c >= 0.5 ? 'warning' : 'error'}
      label={`${Math.round(c * 100)}%`}
    />
  );

function UploadStep({ onFile, isUploading, uploadError }: UploadWizardProps) {
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Box
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'primary.main',
            bgcolor: (t) => t.alpha(t.palette.primary.main, 0.05),
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            height: '100%',
            minHeight: 280,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              aria-hidden
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: (t) => t.alpha(t.palette.primary.main, 0.14),
              }}
            >
              <CloudUploadOutlined sx={{ fontSize: 36, color: 'primary.main' }} />
            </Box>
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Drop in your activity sheet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a CSV or Excel (.xlsx) file, up to 20 MB.
              </Typography>
            </div>
            <Button component="label" variant="contained" size="large" loading={isUploading}>
              Choose file
              <input hidden type="file" accept=".csv,.xlsx" aria-label="Source sheet file" onChange={pick} />
            </Button>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
          </Stack>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <VisualTemplateGuide />
      </Grid>
    </Grid>
  );
}

function PreviewTable({ columns, rows, highlight }: { columns: string[]; rows: string[][]; highlight?: Set<string> }) {
  return (
    <TableContainer sx={{ maxHeight: 320, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Table size="small" stickyHeader aria-label="Sheet preview">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell
                key={c}
                sx={{
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  bgcolor: highlight?.has(c) ? 'secondary.light' : undefined,
                }}
              >
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, 8).map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => (
                <TableCell key={j} sx={{ whiteSpace: 'nowrap' }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function LayoutStep({ dataSource: ds, onLayoutChange, isRelayouting }: UploadWizardProps) {
  if (!ds) return null;
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {ds.sheets.length > 1 && (
          <TextField
            select
            size="small"
            label="Sheet"
            value={ds.sheetName ?? ''}
            onChange={(e) => onLayoutChange({ sheetName: e.target.value })}
            sx={{ minWidth: 200 }}
          >
            {ds.sheets.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          size="small"
          type="number"
          label="Header row"
          key={`${ds.sheetName}-${ds.headerRow}`}
          defaultValue={ds.headerRow}
          onBlur={(e) =>
            Number(e.target.value) !== ds.headerRow && onLayoutChange({ headerRow: Number(e.target.value) })
          }
          slotProps={{ htmlInput: { min: 1, max: 50 } }}
          helperText="Detected automatically"
        />
        <Typography sx={{ alignSelf: 'center' }} color="text.secondary">
          {ds.fileName} · {ds.rowCount.toLocaleString()} data rows · {ds.columns.length} columns
        </Typography>
      </Stack>
      {isRelayouting && <LinearProgress />}
      <PreviewTable columns={ds.columns} rows={ds.preview} />
    </Stack>
  );
}

function MappingStep(p: UploadWizardProps) {
  const ds = p.dataSource;
  if (!ds) return null;
  if (!p.mappingMode) {
    return (
      <Stack spacing={2}>
        <Typography>How should we map your columns to GHG activity fields?</Typography>
        <Grid container spacing={2}>
          {[
            {
              mode: 'ai' as const,
              icon: <AutoAwesomeOutlined sx={{ fontSize: 30, color: 'primary.main' }} />,
              title: 'Automatically infer (AI)',
              text: 'AI reads your headers and sample rows and proposes a mapping you can review.',
            },
            {
              mode: 'manual' as const,
              icon: <TuneRounded sx={{ fontSize: 30, color: 'primary.main' }} />,
              title: 'Map manually',
              text: 'Pick the column for each field yourself.',
            },
          ].map((o) => (
            <Grid key={o.mode} size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  transition: 'border-color .15s, box-shadow .15s',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 3 },
                }}
              >
                <CardActionArea onClick={() => p.onChooseMode(o.mode)} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box
                        aria-hidden
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: (t) => t.alpha(t.palette.primary.main, 0.12),
                        }}
                      >
                        {o.icon}
                      </Box>
                      {o.mode === 'ai' && <Chip size="small" color="primary" label="Recommended" />}
                    </Stack>
                    <Typography variant="h6">{o.title}</Typography>
                    <Typography color="text.secondary">{o.text}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }
  if (p.isSuggesting) {
    return (
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 4 }} role="status">
        <CircularProgress size={22} />
        <Typography>Inferring the column mapping…</Typography>
      </Stack>
    );
  }
  const used = new Set(Object.values(p.mapping).filter(Boolean) as string[]);
  return (
    <Stack spacing={2}>
      {p.suggestion && (
        <Alert severity={p.suggestion.source === 'ai' ? 'info' : 'warning'}>
          {p.suggestion.source === 'ai' ? 'AI suggestion — review before importing. ' : ''}
          {p.suggestion.reasoning}
        </Alert>
      )}
      <Grid container spacing={2}>
        {MAPPING_FIELDS.map(({ field, label, required, hint }) => (
          <Grid key={field} size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                label={`${label}${required ? ' *' : ''}`}
                value={p.mapping[field] ?? ''}
                onChange={(e) => p.onMappingChange(field, e.target.value || null)}
                helperText={hint}
                error={required && !p.mapping[field]}
              >
                <MenuItem value="">— not mapped —</MenuItem>
                {ds.columns.map((c) => (
                  <MenuItem key={c} value={c} disabled={used.has(c) && p.mapping[field] !== c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              {p.mappingMode === 'ai' && confidenceChip(p.suggestion?.confidence[field])}
            </Stack>
          </Grid>
        ))}
      </Grid>
      <PreviewTable columns={ds.columns} rows={ds.preview} highlight={used} />
    </Stack>
  );
}

function ImportStep(p: UploadWizardProps) {
  const ds = p.dataSource;
  if (!ds) return null;
  const running = ds.status === 'importing' || p.isImporting;
  return (
    <Stack spacing={2}>
      {ds.status === 'uploaded' && (
        <>
          <Typography>
            Ready to import <b>{ds.rowCount.toLocaleString()}</b> rows from <b>{ds.fileName}</b>. Each row is validated
            (numbers, units, dates).
          </Typography>
          <FormControlLabel
            control={<Switch checked={p.onlyValidRows} onChange={(e) => p.onToggleOnlyValid(e.target.checked)} />}
            label="Import valid rows and skip invalid ones (otherwise any error stops the import)"
          />
        </>
      )}
      {running && (
        <Stack spacing={1} role="status">
          <Typography>Importing and validating rows…</Typography>
          <LinearProgress />
        </Stack>
      )}
      {ds.status === 'imported' && (
        <Alert severity={ds.errorCount ? 'warning' : 'success'} icon={<CheckCircleRounded />}>
          Imported {ds.importedCount.toLocaleString()} activities
          {ds.errorCount ? `; skipped ${ds.errorCount} invalid rows` : ''}.
        </Alert>
      )}
      {ds.status === 'failed' && (
        <Alert severity="error">
          Import stopped: {ds.errorCount} row{ds.errorCount === 1 ? '' : 's'} need fixing. Fix the file and upload
          again, or import valid rows only.
        </Alert>
      )}
      {p.importError && <Alert severity="error">{p.importError}</Alert>}
      {ds.errors.length > 0 && (
        <TableContainer sx={{ maxHeight: 260, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader aria-label="Row errors">
            <TableHead>
              <TableRow>
                <TableCell>Row</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>Problem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ds.errors.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.row}</TableCell>
                  <TableCell>{e.field}</TableCell>
                  <TableCell>{e.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

export function UploadWizard(p: UploadWizardProps) {
  const ds = p.dataSource;
  const canNext =
    (p.step === 1 && Boolean(ds?.columns.length)) ||
    (p.step === 2 && Boolean(p.mappingMode) && !p.isSuggesting && isMappingComplete(p.mapping));
  const finished = ds?.status === 'imported';
  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.contrastText',
              bgcolor: 'primary.main',
            }}
          >
            <CloudUploadOutlined />
          </Box>
          <div>
            <Typography variant="h6" component="span" sx={{ display: 'block', lineHeight: 1.2 }}>
              Add data source
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Step {p.step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[p.step]}
            </Typography>
          </div>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stepper
          activeStep={p.step}
          sx={{ mb: 3, mt: 2, p: 2, borderRadius: 3, bgcolor: 'action.hover' }}
          alternativeLabel
          connector={<StepConnector />}
        >
          {WIZARD_STEPS.map((s) => (
            <Step key={s}>
              <StepLabel>{s}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {p.step === 0 && <UploadStep {...p} />}
        {p.step === 1 && <LayoutStep {...p} />}
        {p.step === 2 && <MappingStep {...p} />}
        {p.step === 3 && <ImportStep {...p} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={p.onClose}>{finished ? 'Done' : 'Cancel'}</Button>
        {p.step > 0 && p.step < 3 && <Button onClick={p.onBack}>Back</Button>}
        {(p.step === 1 || p.step === 2) && (
          <Button variant="contained" onClick={p.onNext} disabled={!canNext}>
            Next
          </Button>
        )}
        {p.step === 3 && ds && ds.status !== 'imported' && ds.status !== 'importing' && (
          <>
            {ds.status === 'failed' && <Button onClick={p.onBack}>Back to mapping</Button>}
            <Button variant="contained" onClick={p.onImport} loading={p.isImporting}>
              {ds.status === 'failed' ? 'Retry import' : 'Import'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
