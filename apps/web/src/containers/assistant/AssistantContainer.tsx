import { useQuery } from '@tanstack/react-query';
import { listConversationsOptions } from '@carbon-glint/sdk';
import { AssistantPage } from '../../components/assistant/AssistantPage';
import { ChatThread } from '../../components/assistant/ChatThread';
import { useAssistantChat } from './useAssistantChat';

export function AssistantContainer() {
  const conversations = useQuery(listConversationsOptions());
  const chat = useAssistantChat();
  return (
    <AssistantPage
      conversations={conversations.data ?? []}
      activeId={chat.conversationId}
      onSelect={chat.select}
      onNew={chat.reset}
      thread={<ChatThread {...chat.thread} />}
    />
  );
}
