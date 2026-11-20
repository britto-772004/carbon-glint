import type { FormEvent } from 'react';
import type { ChatMessage } from '@carbon-glint/sdk';
import Markdown from 'react-markdown';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';
import { ChatChart } from './ChatChart';
import { STARTER_QUESTIONS } from './chat-utils';

export interface ChatThreadProps {
  messages: ChatMessage[];
  isSending: boolean;
  pendingQuestion?: string;
  error?: string;
  suggestions: string[];
  onSend: (message: string) => void;
  tableOpen: Record<string, boolean>;
  onToggleTable: (messageId: string) => void;
  compact?: boolean;
}

export function ChatThread(p: ChatThreadProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = (formValues(e.currentTarget).message ?? '').trim();
    if (text) p.onSend(text);
    e.currentTarget.reset();
  };
  const empty = p.messages.length === 0 && !p.pendingQuestion;
  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: p.compact ? 1 : 2 }} aria-live="polite">
        {empty && (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
            <Typography variant="h6">Ask about your company's emissions</Typography>
            <Typography color="text.secondary">
              Answers use your own data — with sources, and charts when useful.
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {STARTER_QUESTIONS.map((q) => (
                <Chip key={q} label={q} onClick={() => p.onSend(q)} variant="outlined" />
              ))}
            </Stack>
          </Stack>
        )}
        <Stack spacing={2}>
          {p.messages.map((m) => (
            <Stack
              key={m.id}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'flex-start', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {m.role === 'assistant' && (
                <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 16 }}>🌿</Avatar>
              )}
              <Box
                sx={{
                  maxWidth: '85%',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: m.role === 'user' ? 'primary.main' : 'action.hover',
                  color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  '& p': { my: 0.5 },
                }}
              >
                {m.role === 'user' ? <Typography>{m.content}</Typography> : <Markdown>{m.content}</Markdown>}
                {m.chart && (
                  <ChatChart
                    chart={m.chart}
                    showTable={Boolean(p.tableOpen[m.id])}
                    onToggleTable={() => p.onToggleTable(m.id)}
                  />
                )}
                {m.sources.length > 0 && (
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {m.sources.map((s) => (
                      <Chip key={s} size="small" label={s} variant="outlined" />
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          ))}
          {p.pendingQuestion && (
            <>
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  <Typography>{p.pendingQuestion}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status">
                <CircularProgress size={18} />
                <Typography color="text.secondary">Looking at your data…</Typography>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
      {p.error && <Alert severity="error">{p.error}</Alert>}
      {p.suggestions.length > 0 && !p.isSending && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 1 }}>
          {p.suggestions.map((s) => (
            <Chip key={s} size="small" label={s} onClick={() => p.onSend(s)} />
          ))}
        </Stack>
      )}
      <Stack
        component="form"
        direction="row"
        spacing={1}
        onSubmit={submit}
        sx={{ p: p.compact ? 1 : 2, borderTop: 1, borderColor: 'divider' }}
      >
        <TextField
          name="message"
          size="small"
          fullWidth
          placeholder="Ask a question…"
          disabled={p.isSending}
          slotProps={{ htmlInput: { maxLength: 2000, 'aria-label': 'Message' } }}
          autoComplete="off"
        />
        <Button type="submit" variant="contained" loading={p.isSending}>
          Send
        </Button>
      </Stack>
    </Stack>
  );
}
