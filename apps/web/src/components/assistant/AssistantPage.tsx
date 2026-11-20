import type { ReactNode } from 'react';
import type { Conversation } from '@carbon-glint/sdk';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface AssistantPageProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  thread: ReactNode;
}

export function AssistantPage({ conversations, activeId, onSelect, onNew, thread }: AssistantPageProps) {
  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h4" component="h1">
          Assistant
        </Typography>
        <Typography color="text.secondary">
          Ask anything about your company's emissions — answers are grounded in your data.
        </Typography>
      </div>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <Stack sx={{ p: 1.5 }}>
              <Button variant="outlined" onClick={onNew}>
                New conversation
              </Button>
            </Stack>
            <List dense aria-label="Conversations">
              {conversations.map((c) => (
                <ListItemButton key={c.id} selected={c.id === activeId} onClick={() => onSelect(c.id)}>
                  <ListItemText
                    primary={c.title}
                    secondary={new Date(c.updatedAt).toLocaleDateString()}
                    slotProps={{ primary: { noWrap: true } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Card sx={{ height: { xs: '70vh', md: 'calc(100vh - 260px)' }, minHeight: 420 }}>{thread}</Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
