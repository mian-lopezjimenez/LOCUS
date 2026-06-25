import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { SYSTEM_PROMPT } from "@/lib/constants";
import {
  cancelChatGeneration,
  sendChatMessageStream,
} from "@/services/chat";
import type { ChatTurn } from "@/types/chat";
import { newId } from "@/utils/id";

type UseChatStreamOptions = {
  messages: ChatTurn[];
  messagesRef: React.MutableRefObject<ChatTurn[]>;
  setMessages: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  selectedModel: string;
  persistCurrentConversation: (turns: ChatTurn[]) => Promise<void>;
  focusInput: () => void;
};

export function useChatStream({
  messages,
  messagesRef,
  setMessages,
  selectedModel,
  persistCurrentConversation,
  focusInput,
}: UseChatStreamOptions) {
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const streamUnlistenersRef = useRef<Array<() => void>>([]);

  const cleanupStreamListeners = useCallback(() => {
    for (const unlisten of streamUnlistenersRef.current) {
      unlisten();
    }
    streamUnlistenersRef.current = [];
  }, []);

  const appendStreamChunk = useCallback(
    (chunk: string) => {
      const id = streamingIdRef.current;
      if (!id) return;

      setMessages((prev) => {
        const updated = prev.map((message) =>
          message.id === id
            ? { ...message, content: message.content + chunk }
            : message,
        );
        messagesRef.current = updated;
        return updated;
      });
    },
    [messagesRef, setMessages],
  );

  useEffect(() => () => cleanupStreamListeners(), [cleanupStreamListeners]);

  const stopGeneration = useCallback(() => {
    void cancelChatGeneration();
  }, []);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userTurn: ChatTurn = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();
      const assistantTurn: ChatTurn = {
        id: assistantId,
        role: "assistant",
        content: "",
      };
      const nextMessages = [...messages, userTurn, assistantTurn];

      setMessages(nextMessages);
      messagesRef.current = nextMessages;
      setLoading(true);
      streamingIdRef.current = assistantId;
      setStreamingId(assistantId);
      cleanupStreamListeners();

      const unlistenChunk = await listen<string>("chat:chunk", (event) => {
        appendStreamChunk(event.payload);
      });
      const unlistenCancelled = await listen("chat:cancelled", () => {
        cleanupStreamListeners();
      });

      streamUnlistenersRef.current = [unlistenChunk, unlistenCancelled];

      try {
        const apiMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
            .filter((message) => message.role !== "error")
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
          { role: "user", content: trimmed },
        ];

        const answer = await sendChatMessageStream(apiMessages, selectedModel);

        setMessages((prev) => {
          const streamed =
            prev.find((message) => message.id === assistantId)?.content ?? "";
          const finalContent = answer || streamed;

          if (!finalContent.trim()) {
            const updated = prev.filter((message) => message.id !== assistantId);
            messagesRef.current = updated;
            return updated;
          }

          const updated = prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: finalContent }
              : message,
          );
          messagesRef.current = updated;
          return updated;
        });

        await persistCurrentConversation(messagesRef.current);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al contactar con OpenClaw";
        const withoutAssistant = messagesRef.current.filter(
          (message) => message.id !== assistantId,
        );
        const errorTurn: ChatTurn = {
          id: newId(),
          role: "error",
          content: message,
        };
        const withError = [...withoutAssistant, errorTurn];
        setMessages(withError);
        messagesRef.current = withError;
        await persistCurrentConversation(withError);
      } finally {
        cleanupStreamListeners();
        streamingIdRef.current = null;
        setStreamingId(null);
        setLoading(false);
        focusInput();
      }
    },
    [
      appendStreamChunk,
      cleanupStreamListeners,
      focusInput,
      loading,
      messages,
      messagesRef,
      persistCurrentConversation,
      selectedModel,
      setMessages,
    ],
  );

  return {
    loading,
    streamingId,
    submit,
    stopGeneration,
  };
}
