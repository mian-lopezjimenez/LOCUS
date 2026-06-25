import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  pendingToMessageAttachments,
  persistTurnAttachments,
} from "@/services/attachments";
import {
  cancelChatGeneration,
  sendChatMessageStream,
} from "@/services/chat";
import type { MessageAttachment, PendingAttachment } from "@/types/attachment";
import type { ChatTurn } from "@/types/chat";
import type { ModelInfo } from "@/types/models";
import { newId } from "@/utils/id";
import { openClawTurnSessionKey } from "@/lib/openclawSession";
import { buildDisplayContent } from "@/utils/attachments";
import { trimContextForApi } from "@/utils/contextLimits";
import { findRetryContext } from "@/utils/retry";
import {
  applyVisionDescription,
  buildChatPayload,
  inspectTurn,
  isVisionCapable,
  runVisionStep,
} from "@/pipeline/imageTurn";

export type ProcessingPhase = "vision" | "chat" | null;

type UseChatStreamOptions = {
  messages: ChatTurn[];
  messagesRef: React.MutableRefObject<ChatTurn[]>;
  setMessages: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  selectedModel: string;
  models: ModelInfo[];
  activeConversationId: string;
  persistCurrentConversation: (turns: ChatTurn[]) => Promise<void>;
  focusInput: () => void;
};

export function useChatStream({
  messagesRef,
  setMessages,
  selectedModel,
  models,
  activeConversationId,
  persistCurrentConversation,
  focusInput,
}: UseChatStreamOptions) {
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>(null);
  const streamingIdRef = useRef<string | null>(null);
  const streamUnlistenersRef = useRef<Array<() => void>>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

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

  const sendMessage = useCallback(
    async (
      text: string,
      context: ChatTurn[],
      attachmentsInput: MessageAttachment[] | PendingAttachment[] = [],
    ) => {
      const trimmed = text.trim();
      const messageAttachments: MessageAttachment[] =
        attachmentsInput.length > 0 && "id" in attachmentsInput[0]!
          ? pendingToMessageAttachments(attachmentsInput as PendingAttachment[])
          : (attachmentsInput as MessageAttachment[]);
      const hasAttachments = messageAttachments.length > 0;
      if ((!trimmed && !hasAttachments) || loadingRef.current) return;

      const userId = newId();
      let persistedAttachments = messageAttachments;

      if (activeConversationId && messageAttachments.some((a) => a.kind === "image" && a.dataUrl)) {
        persistedAttachments = await persistTurnAttachments(
          activeConversationId,
          userId,
          messageAttachments,
        );
      }

      const userTurn: ChatTurn = {
        id: userId,
        role: "user",
        content: buildDisplayContent(trimmed, persistedAttachments),
        prompt: trimmed || undefined,
        attachments: persistedAttachments.length > 0 ? persistedAttachments : undefined,
      };
      const assistantId = newId();
      const assistantTurn: ChatTurn = {
        id: assistantId,
        role: "assistant",
        content: "",
      };
      const nextMessages = [...context, userTurn, assistantTurn];

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
        const plan = inspectTurn({
          userText: trimmed,
          attachments: persistedAttachments,
          chatModelId: selectedModel,
          models,
        });

        let visionDescription: string | undefined;
        let finalAttachments = persistedAttachments;

        if (plan.kind === "vision_then_chat") {
          if (!isVisionCapable(models)) {
            throw new Error(
              "No hay ningún modelo de visión instalado. Ejecuta «ollama pull qwen2.5vl:7b» y reinicia OpenClaw.",
            );
          }

          setProcessingPhase("vision");
          visionDescription = await runVisionStep(plan, trimmed);
          finalAttachments = applyVisionDescription(
            persistedAttachments,
            visionDescription,
          );

          setMessages((prev) => {
            const updated = prev.map((message) =>
              message.id === userId
                ? { ...message, attachments: finalAttachments }
                : message,
            );
            messagesRef.current = updated;
            return updated;
          });
        }

        const trimmedContext = trimContextForApi(context, {
          hasImagesInCurrentMessage: plan.kind === "vision_then_chat",
        });

        const contextMessages = trimmedContext.map((message) => ({
          role: message.role,
          content: message.prompt ?? message.content,
          attachments: message.attachments ?? [],
        }));

        setProcessingPhase("chat");
        const apiMessages = await buildChatPayload(
          plan,
          contextMessages,
          visionDescription,
        );

        const answer = await sendChatMessageStream(apiMessages, selectedModel, {
          sessionKey: openClawTurnSessionKey(userId),
          messageChannel: "locus",
        });

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
        setProcessingPhase(null);
        setLoading(false);
        focusInput();
      }
    },
    [
      activeConversationId,
      appendStreamChunk,
      cleanupStreamListeners,
      focusInput,
      messagesRef,
      models,
      persistCurrentConversation,
      selectedModel,
      setMessages,
    ],
  );

  const submit = useCallback(
    (text: string, pendingAttachments: PendingAttachment[] = []) =>
      sendMessage(text, messagesRef.current, pendingAttachments),
    [messagesRef, sendMessage],
  );

  const retryFromMessage = useCallback(
    async (messageId: string) => {
      if (loadingRef.current) return;

      const context = findRetryContext(messagesRef.current, messageId);
      if (!context) return;

      setMessages(context.truncated);
      messagesRef.current = context.truncated;
      await persistCurrentConversation(context.truncated);
      await sendMessage(
        context.userText,
        context.truncated,
        context.userAttachments,
      );
    },
    [messagesRef, persistCurrentConversation, sendMessage, setMessages],
  );

  return {
    loading,
    streamingId,
    processingPhase,
    submit,
    retryFromMessage,
    stopGeneration,
  };
}
