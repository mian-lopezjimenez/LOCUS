import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  ChatComposer,
  MessageList,
} from "@/components/chat/ChatComposer";
import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { MessageRow } from "@/components/chat/MessageRow";
import { IconButton } from "@/components/chat/SpotlightHeader";
import { SettingsPage } from "@/features/settings";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { useSpotlightWindow } from "@/hooks/useSpotlightWindow";
import { DEFAULT_MODEL } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { loadSpotlightStore } from "@/services/conversations";
import { listChatModels } from "@/services/models";
import { loadSettings, saveSettings } from "@/services/settings";
import { normalizeModelId } from "@/utils/model";
import type { ModelInfo } from "@/types/models";
import type { ChatTurn } from "@/types/chat";

function SpotlightChatView({
  inputRef,
  query,
  setQuery,
  loading,
  models,
  selectedModel,
  onModelChange,
  onSubmit,
  onStop,
  messages,
  streamingId,
  onRetry,
  onOpenFullView,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  messages: ChatTurn[];
  streamingId: string | null;
  onRetry: (messageId: string) => void;
  onOpenFullView: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-end border-b border-border bg-card px-2 py-1">
        <IconButton
          label="Abrir modo completo"
          tooltip="Modo completo (Fase 3)"
          onClick={onOpenFullView}
        >
          <Maximize2 className="size-4" />
        </IconButton>
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
            onRetry={onRetry}
          />
        )}
      />

      <ChatComposer
        inputRef={inputRef}
        query={query}
        loading={loading}
        models={models}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onQueryChange={setQuery}
        onSubmit={onSubmit}
        onStop={onStop}
      />
    </div>
  );
}

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
    <HashRouter>
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

        <Routes>
          <Route
            path={ROUTES.chat}
            element={
              <SpotlightChatView
                inputRef={inputRef}
                query={query}
                setQuery={setQuery}
                loading={loading}
                models={models}
                selectedModel={selectedModel}
                onModelChange={(modelId) => void handleModelChange(modelId)}
                onSubmit={handleSubmit}
                onStop={stopGeneration}
                messages={messages}
                streamingId={streamingId}
                onRetry={(messageId) => void retryFromMessage(messageId)}
                onOpenFullView={() => void openFullView()}
              />
            }
          />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
