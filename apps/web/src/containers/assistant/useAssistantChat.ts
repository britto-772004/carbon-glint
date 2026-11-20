import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listConversationMessagesOptions,
  listConversationMessagesQueryKey,
  listConversationsQueryKey,
  sendChatMessageMutation,
} from '@carbon-glint/sdk';
import { toErrorMessage } from '../../lib/errors';

/** Shared chat state for the Assistant tab and the floating launcher. The server history is the source of truth. */
export function useAssistantChat() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tableOpen, setTableOpen] = useState<Record<string, boolean>>({});

  const history = useQuery({
    ...listConversationMessagesOptions({ path: { conversationId: conversationId ?? '' } }),
    enabled: Boolean(conversationId),
  });
  const send = useMutation({
    ...sendChatMessageMutation(),
    onSuccess: async (res) => {
      setConversationId(res.conversationId);
      setSuggestions(res.suggestions);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: listConversationMessagesQueryKey({ path: { conversationId: res.conversationId } }),
        }),
        queryClient.invalidateQueries({ queryKey: listConversationsQueryKey() }),
      ]);
    },
  });

  return {
    conversationId,
    select: (id: string) => {
      setSuggestions([]);
      setConversationId(id);
    },
    reset: () => {
      setSuggestions([]);
      setConversationId(undefined);
      send.reset();
    },
    thread: {
      messages: conversationId ? (history.data ?? []) : [],
      isSending: send.isPending,
      pendingQuestion: send.isPending ? send.variables?.body.message : undefined,
      error: toErrorMessage(send.error ?? history.error),
      suggestions,
      onSend: (message: string) => send.mutate({ body: { message, ...(conversationId ? { conversationId } : {}) } }),
      tableOpen,
      onToggleTable: (id: string) => setTableOpen((t) => ({ ...t, [id]: !t[id] })),
    },
  };
}
