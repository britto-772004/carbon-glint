import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { IndustryExample } from '../../lib/industry-examples';

export interface TourMenuDialogProps {
  open: boolean;
  chapters: ReadonlyArray<{ name: string; steps: number }>;
  industries: IndustryExample[];
  industryCode: string;
  onIndustry: (code: string) => void;
  onStart: (chapter: string | null) => void;
  onClose: () => void;
}

/** Pick an industry for example data, then run the full tour or a single chapter (replayable). */
export function TourMenuDialog(p: TourMenuDialogProps) {
  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="xs">
      <DialogTitle>Guided tour</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label="Show examples for"
            value={p.industryCode}
            onChange={(e) => p.onIndustry(e.target.value)}
          >
            {p.industries.map((i) => (
              <MenuItem key={i.industryCode} value={i.industryCode}>
                {i.industryName}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<PlayArrowRounded />} onClick={() => p.onStart(null)}>
            Start full tour (start to end)
          </Button>
          <Typography variant="overline" color="text.secondary">
            Or watch one chapter
          </Typography>
          <List dense disablePadding>
            {p.chapters.map((c, i) => (
              <ListItemButton key={c.name} onClick={() => p.onStart(c.name)} sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Typography variant="subtitle2" color="primary">
                    {i + 1}
                  </Typography>
                </ListItemIcon>
                <ListItemText primary={c.name} secondary={`${c.steps} steps`} />
              </ListItemButton>
            ))}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={p.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
