import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/** Floating "Ask AI" button that opens the chat in a side drawer on every page. */
export function AssistantLauncher({
  open,
  onOpen,
  onClose,
  thread,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  thread: ReactNode;
}) {
  return (
    <>
      <Fab
        color="primary"
        variant="extended"
        onClick={onOpen}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: (t) => t.zIndex.speedDial }}
        aria-label="Ask AI assistant"
      >
        🌿&nbsp;Ask AI
      </Fab>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}
      >
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">Assistant</Typography>
          <Button onClick={onClose}>Close</Button>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>{thread}</Box>
      </Drawer>
    </>
  );
}
