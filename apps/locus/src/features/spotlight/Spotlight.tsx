import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Maximize2 } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  ChatComposer,
  MessageBubble,
  MessageList,
} from "@/components/chat/ChatComposer";
import {
  ConversationBar,
  ConversationHistory,
} from "@/components/chat/ConversationHistory";
import { MessageContent } from "@/components/chat/MessageContent";
import { IconButton, ModelSelect } from "@/components/chat/SpotlightHeader";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { useSpotlightWindow } from "@/hooks/useSpotlightWindow";
import { DEFAULT_MODEL } from "@/lib/constants";
import { loadSpotlightStore } from "@/services/conversations";
import { listChatModels } from "@/services/models";
import { loadSettings, saveSettings } from "@/services/settings";
import { useSpotlightUiStore } from "@/stores/spotlight-ui";
import { normalizeModelId } from "@/utils/model";

export function Spotlight() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  const historyOpen = useSpotlightUiStore((state) => state.historyOpen);
  const toggleHistory = useSpotlightUiStore((state) => state.toggleHistory);
  const setHistoryOpen = useSpotlightUiStore((state) => state.setHistoryOpen);

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

  const { loading, streamingId, submit, stopGeneration } = useChatStream({
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

    const { store, settings } = bootstrapQuery.data;
    applyStore(store);

    const savedModel = normalizeModelId(settings.selectedModel || DEFAULT_MODEL);
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

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  return (
    <div className="h-full bg-background text-foreground">
      <div className="flex h-full flex-col border-l border-border bg-background">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <IconButton
              label="Historial de conversaciones"
              title="Historial de conversaciones"
              onClick={toggleHistory}
              disabled={loading}
              active={historyOpen}
            >
              <Menu className="size-4" />
            </IconButton>
            <ModelSelect
              models={models}
              value={selectedModel}
              onChange={(modelId) => void handleModelChange(modelId)}
              disabled={loading}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label="Nueva conversación"
              title="Nueva conversación"
              onClick={() => void startNewChat(loading)}
              disabled={loading}
            >
              <span className="text-base leading-none">+</span>
            </IconButton>
            <IconButton
              label="Abrir modo completo"
              title="Modo completo (Fase 3)"
              onClick={() => void openFullView()}
            >
              <Maximize2 className="size-4" />
            </IconButton>
          </div>
        </header>

        {activeConversation && !historyOpen && (
          <ConversationBar title={activeConversation.title} />
        )}

        <div className="relative flex min-h-0 flex-1 flex-col">
          {historyOpen && (
            <ConversationHistory
              conversations={conversations}
              activeConversationId={activeConversationId}
              loading={loading}
              onSelect={(conversationId) => {
                void switchConversation(conversationId, loading).then((switched) => {
                  if (switched) setHistoryOpen(false);
                });
              }}
              onCreate={() => {
                void startNewChat(loading);
                setHistoryOpen(false);
              }}
              onDelete={(conversationId) => {
                void deleteConversation(conversationId, loading);
              }}
            />
          )}

          <MessageList
            messages={messages}
            loading={loading}
            streamingId={streamingId}
            renderMessage={(message) => (
              <MessageBubble key={message.id} role={message.role}>
                <MessageContent
                  role={message.role}
                  content={message.content}
                  streaming={message.streaming}
                />
              </MessageBubble>
            )}
          />
        </div>

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
