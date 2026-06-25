import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  ChatComposer,
  MessageList,
} from "@/components/chat/ChatComposer";
import { DropOverlay } from "@/components/chat/AttachmentChips";
import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { MessageRow } from "@/components/chat/MessageRow";
import { IconButton } from "@/components/chat/SpotlightHeader";
import { SettingsPage } from "@/features/settings";
import { useChatStream, type ProcessingPhase } from "@/hooks/useChatStream";
import { useComposerAttachments } from "@/hooks/useComposerAttachments";
import { useConversations } from "@/hooks/useConversations";
import { useSpotlightWindow } from "@/hooks/useSpotlightWindow";
import { DEFAULT_MODEL } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { loadSpotlightStore } from "@/services/conversations";
import { saveMarkdownFile } from "@/services/export";
import { listChatModels } from "@/services/models";
import { loadSettings, saveSettings } from "@/services/settings";
import { defaultExportFilename, formatConversationMarkdown } from "@/utils/exportChat";
import { normalizeModelId } from "@/utils/model";
import { pickVisionModel } from "@/pipeline/imageTurn";
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
  processingPhase,
  onRetry,
  onExport,
  exportDisabled,
  exportError,
  onOpenFullView,
  attachments,
  onRemoveAttachment,
  onPickFiles,
  onPaste,
  dragOver,
  attachmentError,
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
  processingPhase: ProcessingPhase;
  onRetry: (messageId: string) => void;
  onExport: () => void;
  exportDisabled: boolean;
  exportError: string | null;
  onOpenFullView: () => void;
  attachments: ReturnType<typeof useComposerAttachments>["attachments"];
  onRemoveAttachment: (id: string) => void;
  onPickFiles: () => void;
  onPaste: (event: React.ClipboardEvent) => void;
  dragOver: boolean;
  attachmentError: string | null;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <DropOverlay active={dragOver} />
      <header className="flex shrink-0 items-center justify-end gap-1 border-b border-border bg-card px-2 py-1">
        {exportError && (
          <p className="mr-auto truncate text-xs text-destructive" role="alert">
            {exportError}
          </p>
        )}
        <IconButton
          label="Exportar conversación"
          tooltip="Exportar conversación (.md)"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <Download className="size-4" />
        </IconButton>
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
        renderMessage={(message) => {
          const turn = messages.find((item) => item.id === message.id);
          return (
            <MessageRow
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              prompt={turn?.prompt}
              attachments={turn?.attachments}
              streaming={message.streaming}
              loading={loading}
              processingPhase={processingPhase}
              onRetry={onRetry}
            />
          );
        }}
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
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
        onPickFiles={onPickFiles}
        onPaste={onPaste}
        attachmentError={attachmentError}
      />
    </div>
  );
}

export function Spotlight() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const models = bootstrapQuery.data?.modelList ?? [];

  const { loading, streamingId, processingPhase, submit, retryFromMessage, stopGeneration } =
    useChatStream({
      messages,
      messagesRef,
      setMessages,
      selectedModel,
      models,
      activeConversationId,
      persistCurrentConversation,
      focusInput,
    });

  const {
    attachments,
    dragOver,
    pickFiles,
    removeAttachment,
    clearAttachments,
    handlePaste,
  } = useComposerAttachments({
    disabled: loading,
    onError: setAttachmentError,
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

    const savedVision = settings.visionModel;
    const visionPick = pickVisionModel(modelList, savedVision);

    const settingsPatch: Parameters<typeof saveSettings>[0] = {};
    if (savedModel !== settings.selectedModel) {
      settingsPatch.selectedModel = savedModel;
    }
    if (visionPick && savedVision !== visionPick.id) {
      settingsPatch.visionModel = visionPick.id;
    }
    if (Object.keys(settingsPatch).length > 0) {
      void saveSettings(settingsPatch);
    }
  }, [applyStore, bootstrapQuery.data]);

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await saveSettings({ selectedModel: modelId });
  };

  const handleSubmit = () => {
    const text = query;
    const pending = attachments;
    setQuery("");
    clearAttachments();
    setAttachmentError(null);
    void submit(text, pending);
  };

  const openFullView = async () => {
    const main = await WebviewWindow.getByLabel("main");
    await main?.show();
    await main?.setFocus();
    await closePanel();
  };

  const activeTitle =
    conversations.find((conversation) => conversation.id === activeConversationId)
      ?.title ?? "Conversación";

  const handleExport = useCallback(async () => {
    setExportError(null);
    if (messages.length === 0) {
      setExportError("No hay mensajes para exportar.");
      return;
    }

    try {
      const markdown = formatConversationMarkdown(activeTitle, messages);
      const saved = await saveMarkdownFile(
        defaultExportFilename(activeTitle),
        markdown,
      );
      if (!saved) return;
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "No se pudo exportar la conversación.",
      );
    }
  }, [activeTitle, messages]);

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
                processingPhase={processingPhase}
                onRetry={(messageId) => void retryFromMessage(messageId)}
                onExport={() => void handleExport()}
                exportDisabled={messages.length === 0}
                exportError={exportError}
                onOpenFullView={() => void openFullView()}
                attachments={attachments}
                onRemoveAttachment={removeAttachment}
                onPickFiles={() => void pickFiles()}
                onPaste={handlePaste}
                dragOver={dragOver}
                attachmentError={attachmentError}
              />
            }
          />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
