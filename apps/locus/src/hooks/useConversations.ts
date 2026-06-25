import { useCallback, useRef, useState } from "react";
import type { ChatTurn } from "@/types/chat";
import type { Conversation, SpotlightStore } from "@/types/conversation";
import {
  buildConversationPayload,
  createConversation,
  deleteConversation as deleteConversationService,
  setActiveConversation,
  upsertConversation,
} from "@/services/conversations";
import { mapStoredTurns, toStoredTurns } from "@/utils/chat";

export function useConversations() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");

  const messagesRef = useRef<ChatTurn[]>([]);
  const activeConversationIdRef = useRef("");

  const applyStore = useCallback((store: SpotlightStore) => {
    setConversations(store.conversations);
    setActiveConversationId(store.activeConversationId);
    activeConversationIdRef.current = store.activeConversationId;

    const active = store.conversations.find(
      (conversation) => conversation.id === store.activeConversationId,
    );
    const turns = mapStoredTurns(active?.messages ?? []);
    setMessages(turns);
    messagesRef.current = turns;
  }, []);

  const persistCurrentConversation = useCallback(
    async (turns: ChatTurn[]) => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) return;

      const existing = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      const store = await upsertConversation(
        buildConversationPayload(
          conversationId,
          existing,
          toStoredTurns(turns),
        ),
      );
      applyStore(store);
    },
    [applyStore, conversations],
  );

  const switchConversation = useCallback(
    async (conversationId: string, loading: boolean) => {
      if (loading || conversationId === activeConversationIdRef.current) {
        return false;
      }

      await persistCurrentConversation(messagesRef.current);
      const store = await setActiveConversation(conversationId);
      applyStore(store);
      return true;
    },
    [applyStore, persistCurrentConversation],
  );

  const startNewChat = useCallback(
    async (loading: boolean) => {
      if (loading) return;
      await persistCurrentConversation(messagesRef.current);
      const store = await createConversation();
      applyStore(store);
    },
    [applyStore, persistCurrentConversation],
  );

  const deleteConversation = useCallback(
    async (conversationId: string, loading: boolean) => {
      if (loading) return;

      if (conversationId === activeConversationIdRef.current) {
        await persistCurrentConversation(messagesRef.current);
      }

      const store = await deleteConversationService(conversationId);
      applyStore(store);
    },
    [applyStore, persistCurrentConversation],
  );

  return {
    messages,
    setMessages,
    messagesRef,
    conversations,
    activeConversationId,
    applyStore,
    persistCurrentConversation,
    switchConversation,
    startNewChat,
    deleteConversation,
  };
}
