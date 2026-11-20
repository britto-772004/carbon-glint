import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import LabelOutlined from '@mui/icons-material/LabelOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import type { ReactNode } from 'react';
import type { EmissionTrace } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_META, formatCo2e } from './format';

/** Loose view of the stored trace JSON (shape defined by the calculation engine). */
interface TraceShape {
  input?: {
    rowNumber: number;
    description: string;
    measure: number;
    unit: string;
    location: string | null;
    periodStart: string;
    periodEnd: string;
  };
  classification?: { scope: number; categoryName: string };
  match?: {
    method: string;
    confidence: number;
    rationale: string;
    query: string;
    alternatives: Array<{
      id: string;
      name: string;
      source: string;
      co2ePerUnit: number;
      unit: string | null;
      score: number;
    }>;
  };
  factor?: null | {
    sourceCode: string;
    sourceName: string;
    publisher: string;
    licence: string;
    externalId: string;
    name: string;
    category: string;
    region: string;
    year: number;
    unit: string | null;
    co2ePerUnit: number;
    gases: { co2: number | null; ch4: number | null; n2o: number | null };
    citationUrl: string;
  };
  conversion?: null | { from: string; to: string; factor: number; normalizedQuantity: number };
  gwp?: string;
  result?: { co2eKg: number; formula: string };
  override?: { type: string; reason: string; at: string; previousCo2eKg: number | null };
}

function Node({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pl: 4,
        pb: 2,
        '&:before': {
          content: '""',
          position: 'absolute',
          left: 11,
          top: 26,
          bottom: 0,
          borderLeft: 2,
          borderColor: 'divider',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
        }}
        aria-hidden
      >
        {icon}
      </Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Box sx={{ color: 'text.secondary', fontSize: 14 }}>{children}</Box>
    </Box>
  );
}

export interface TraceDrawerProps {
  open: boolean;
  onClose: () => void;
  data?: EmissionTrace;
  isLoading: boolean;
  error?: string;
  onOverride: () => void;
  onRevert: () => void;
  isReverting: boolean;
}

/** GHG traceability tree: how and where this activity's CO₂e was derived. */
export function TraceDrawer({
  open,
  onClose,
  data,
  isLoading,
  error,
  onOverride,
  onRevert,
  isReverting,
}: TraceDrawerProps) {
  const t = (data?.trace ?? {}) as TraceShape;
  const row = data?.row;
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, p: 3 } } }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">GHG traceability</Typography>
        <Button onClick={onClose}>Close</Button>
      </Stack>
      {isLoading && <Skeleton role="status" variant="rectangular" height={400} />}
      {error && <Alert severity="error">{error}</Alert>}
      {row && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h5">{formatCo2e(row.co2eKg)}</Typography>
            <Chip size="small" label={STATUS_META[row.status].label} color={STATUS_META[row.status].color} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Button variant="outlined" onClick={onOverride}>
              Override
            </Button>
            {row.status === 'overridden' && (
              <Button color="warning" onClick={onRevert} loading={isReverting}>
                Revert override
              </Button>
            )}
          </Stack>

          {t.input && (
            <Node icon={<DescriptionOutlined sx={{ fontSize: 15 }} />} title={`Input — row ${t.input.rowNumber}`}>
              {t.input.description} ·{' '}
              <b>
                {t.input.measure.toLocaleString()} {t.input.unit}
              </b>
              <br />
              {row.orgUnitName ?? 'No business unit'}
              {t.input.location ? ` · ${t.input.location}` : ''} · {t.input.periodStart} → {t.input.periodEnd}
            </Node>
          )}
          {t.classification && (
            <Node icon={<LabelOutlined sx={{ fontSize: 15 }} />} title="Classification">
              Scope {t.classification.scope} · {t.classification.categoryName} · {row.activityDefinitionName}
            </Node>
          )}
          {t.match && !t.override && (
            <Node
              icon={<SearchRounded sx={{ fontSize: 15 }} />}
              title={`Factor match — ${t.match.method === 'ai' ? 'AI-assisted' : t.match.method === 'search' ? 'full-text search' : 'none'}`}
            >
              Confidence {Math.round((t.match.confidence ?? 0) * 100)}% — {t.match.rationale}
              {t.match.alternatives.length > 0 && (
                <Box component="ul" sx={{ my: 0.5, pl: 2 }}>
                  {t.match.alternatives.slice(0, 4).map((a) => (
                    <li key={a.id}>
                      Considered: {a.name} ({a.source}, {a.co2ePerUnit} kg/{a.unit})
                    </li>
                  ))}
                </Box>
              )}
            </Node>
          )}
          {t.override && (
            <Node
              icon={<EditNoteOutlined sx={{ fontSize: 15 }} />}
              title={`Manual override — ${t.override.type.replace('_', ' ')}`}
            >
              “{t.override.reason}” · {new Date(t.override.at).toLocaleString()}
              {t.override.previousCo2eKg !== null && <> · was {formatCo2e(t.override.previousCo2eKg)}</>}
            </Node>
          )}
          {t.conversion && (
            <Node icon={<SwapHorizRounded sx={{ fontSize: 15 }} />} title="Unit conversion">
              {t.conversion.from} → {t.conversion.to} (× {t.conversion.factor}) ={' '}
              {t.conversion.normalizedQuantity.toLocaleString()} {t.conversion.to}
            </Node>
          )}
          {t.factor && (
            <Node icon={<MenuBookOutlined sx={{ fontSize: 15 }} />} title="Emission factor">
              <b>
                {t.factor.co2ePerUnit} kg CO₂e / {t.factor.unit}
              </b>{' '}
              — {t.factor.name}
              <br />
              {t.factor.sourceName} · {t.factor.region} · {t.factor.year} · ID {t.factor.externalId}
              {(t.factor.gases.co2 ?? t.factor.gases.ch4 ?? t.factor.gases.n2o) !== null && (
                <>
                  <br />
                  CO₂ {t.factor.gases.co2 ?? '—'} · CH₄ {t.factor.gases.ch4 ?? '—'} · N₂O {t.factor.gases.n2o ?? '—'} kg
                  CO₂e/unit
                </>
              )}
              <br />
              Licence: {t.factor.licence} ·{' '}
              <Link href={t.factor.citationUrl} target="_blank" rel="noreferrer">
                source
              </Link>
            </Node>
          )}
          {t.gwp && (
            <Node icon={<ThermostatOutlined sx={{ fontSize: 15 }} />} title="GWP basis">
              {t.gwp}
            </Node>
          )}
          {t.result && (
            <Node icon={<CalculateOutlined sx={{ fontSize: 15 }} />} title={`Result — ${formatCo2e(t.result.co2eKg)}`}>
              <Box component="code" sx={{ fontSize: 12 }}>
                {t.result.formula}
              </Box>
            </Node>
          )}
          {data.overrides.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Override history
              </Typography>
              {data.overrides.map((o) => (
                <Typography key={o.id} variant="body2" color="text.secondary">
                  {new Date(o.createdAt).toLocaleString()} · {o.type.replace('_', ' ')} ·{' '}
                  {formatCo2e(o.previousCo2eKg ?? 0)} → {formatCo2e(o.newCo2eKg)} · “{o.reason}”
                  {o.revertedAt ? ' (reverted)' : ''}
                </Typography>
              ))}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
