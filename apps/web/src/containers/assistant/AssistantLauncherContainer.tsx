import { useState } from 'react';
import { AssistantLauncher } from '../../components/assistant/AssistantLauncher';
import { ChatThread } from '../../components/assistant/ChatThread';
import { useAssistantChat } from './useAssistantChat';

export function AssistantLauncherContainer() {
  const [open, setOpen] = useState(false);
  const chat = useAssistantChat();
  return (
    <AssistantLauncher
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      thread={<ChatThread {...chat.thread} compact />}
    />
  );
}
