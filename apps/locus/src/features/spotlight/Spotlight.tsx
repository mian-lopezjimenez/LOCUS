import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  ChatComposer,
  MessageList,
} from "@/components/chat/ChatComposer";
import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { MessageRow } from "@/components/chat/MessageRow";
import { IconButton, ModelSelect } from "@/components/chat/SpotlightHeader";
import { ThemeSelect } from "@/components/chat/ThemeSelect";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { useSpotlightWindow } from "@/hooks/useSpotlightWindow";
import { DEFAULT_MODEL } from "@/lib/constants";
import { loadSpotlightStore } from "@/services/conversations";
import { listChatModels } from "@/services/models";
import { loadSettings, saveSettings } from "@/services/settings";
import { normalizeModelId } from "@/utils/model";

export function Spotlight() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const {
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
  } = useConversations();

  const { loading, streamingId, submit, retryFromMessage, stopGeneration } =
    useChatStream({
      messages,
      messagesRef,
      setMessages,
      selectedModel,
      persistCurrentConversation,
      focusInput,
    });

  const { closePanel } = useSpotlightWindow(focusInput);

  const bootstrapQuery = useQuery({
    queryKey: ["spotlight-bootstrap"],
    queryFn: async () => {
      const [store, settings, modelList] = await Promise.all([
        loadSpotlightStore(),
        loadSettings(),
        listChatModels(),
      ]);
      return { store, settings, modelList };
    },
  });

  useEffect(() => {
    if (!bootstrapQuery.data) return;

    const { store, settings, modelList } = bootstrapQuery.data;
    applyStore(store);

    const modelIds = new Set(modelList.map((model) => model.id));
    const normalized = normalizeModelId(settings.selectedModel || DEFAULT_MODEL);
    const savedModel = modelIds.has(normalized)
      ? normalized
      : DEFAULT_MODEL;

    setSelectedModel(savedModel);

    if (savedModel !== settings.selectedModel) {
      void saveSettings({ selectedModel: savedModel });
    }
  }, [applyStore, bootstrapQuery.data]);

  const models = bootstrapQuery.data?.modelList ?? [];

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await saveSettings({ selectedModel: modelId });
  };

  const handleSubmit = () => {
    const text = query;
    setQuery("");
    void submit(text);
  };

  const openFullView = async () => {
    const main = await WebviewWindow.getByLabel("main");
    await main?.show();
    await main?.setFocus();
    await closePanel();
  };

  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      <ConversationHistory
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={loading}
          onSelect={(conversationId) => {
            void switchConversation(conversationId, loading);
          }}
          onCreate={() => void startNewChat(loading)}
          onDelete={(conversationId) => {
            void deleteConversation(conversationId, loading);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-1.5">
            <ModelSelect
              models={models}
              value={selectedModel}
              onChange={(modelId) => void handleModelChange(modelId)}
              disabled={loading}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeSelect />
              <IconButton
                label="Abrir modo completo"
                title="Modo completo (Fase 3)"
                onClick={() => void openFullView()}
              >
                <Maximize2 className="size-4" />
              </IconButton>
            </div>
          </header>

          <MessageList
            messages={messages}
            loading={loading}
            streamingId={streamingId}
            renderMessage={(message) => (
              <MessageRow
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                streaming={message.streaming}
                loading={loading}
                onRetry={(messageId) => void retryFromMessage(messageId)}
              />
            )}
          />

          <ChatComposer
            inputRef={inputRef}
            query={query}
            loading={loading}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            onStop={stopGeneration}
          />
        </div>
    </div>
  );
}
