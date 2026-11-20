import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Portal from '@mui/material/Portal';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import type { IndustryExample } from '../../lib/industry-examples';
import type { Rect, TourStep } from '../../lib/tour';
import { TourExample } from './TourExample';

export interface GuidedTourProps {
  step: TourStep;
  index: number;
  total: number;
  /** Spotlighted element (viewport coordinates) — null centres the card. */
  target: Rect | null;
  cardPosition: { top: number; left: number };
  example: IndustryExample;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenMenu: () => void;
  onDownloadExample: (definitionIndex: number) => void;
}

const PAD = 6;

/** Spotlight + step card. Purely presentational: the container measures the target and positions the card. */
export function GuidedTour(p: GuidedTourProps) {
  const last = p.index === p.total - 1;
  return (
    <Portal>
      <Box sx={{ position: 'fixed', inset: 0, zIndex: (t) => t.zIndex.modal + 10, pointerEvents: 'none' }}>
        {p.target ? (
          <Box
            sx={{
              position: 'fixed',
              top: p.target.top - PAD,
              left: p.target.left - PAD,
              width: p.target.width + PAD * 2,
              height: p.target.height + PAD * 2,
              borderRadius: 2,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
              outline: '3px solid',
              outlineColor: 'secondary.main',
              transition: 'all 250ms ease',
            }}
          />
        ) : (
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(15, 23, 42, 0.55)' }} />
        )}
        <Paper
          role="dialog"
          aria-label={`Guided tour: ${p.step.title}`}
          elevation={12}
          sx={{
            position: 'fixed',
            top: p.cardPosition.top,
            left: p.cardPosition.left,
            width: { xs: 'calc(100vw - 32px)', sm: 400 },
            maxHeight: 'calc(100vh - 32px)',
            overflow: 'auto',
            pointerEvents: 'auto',
            borderRadius: 3,
            transition: 'top 250ms ease, left 250ms ease',
          }}
        >
          <LinearProgress variant="determinate" value={((p.index + 1) / p.total) * 100} />
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center' }}>
              <Typography variant="overline" color="text.secondary" sx={{ flex: 1, lineHeight: 1.5 }}>
                {p.step.chapter} · {p.index + 1} / {p.total}
              </Typography>
              <IconButton size="small" aria-label="Close tour" onClick={p.onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
              {p.step.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.step.body}
            </Typography>
            {p.step.example && (
              <TourExample kind={p.step.example} example={p.example} onDownload={p.onDownloadExample} />
            )}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: 0.5 }}>
              <Button size="small" onClick={p.onOpenMenu}>
                Chapters
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={p.onBack} disabled={p.index === 0}>
                Back
              </Button>
              <Button size="small" variant="contained" onClick={last ? p.onClose : p.onNext}>
                {last ? 'Finish' : 'Next'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Portal>
  );
}
