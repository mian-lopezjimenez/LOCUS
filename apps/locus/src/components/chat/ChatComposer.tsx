import { Paperclip, Square, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  AttachmentChips,
  DropOverlay,
  VisionNotice,
} from "@/components/chat/AttachmentChips";
import { ModelSelect } from "@/components/chat/SpotlightHeader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PendingAttachment } from "@/types/attachment";
import type { ChatRole } from "@/types/chat";
import type { ModelInfo } from "@/types/models";
import { hasImageAttachments } from "@/utils/attachments";
import { pickVisionModel } from "@/utils/vision";

type ChatComposerProps = {
  query: string;
  loading: boolean;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  attachments: PendingAttachment[];
  onRemoveAttachment: (id: string) => void;
  onPickFiles: () => void;
  onPaste: (event: React.ClipboardEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  dragOver: boolean;
  attachmentError?: string | null;
  visionModelId?: string;
};

export function ChatComposer({
  query,
  loading,
  models,
  selectedModel,
  onModelChange,
  onQueryChange,
  onSubmit,
  onStop,
  inputRef,
  attachments,
  onRemoveAttachment,
  onPickFiles,
  onPaste,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
  attachmentError,
  visionModelId,
}: ChatComposerProps) {
  const selected = models.find((model) => model.id === selectedModel);
  const needsVision = hasImageAttachments(attachments);
  const visionModel = pickVisionModel(models, visionModelId);
  const visionUnavailable =
    needsVision && !selected?.supportsVision && !visionModel;
  const canSubmit =
    (query.trim() || attachments.length > 0) && !visionUnavailable;

  return (
    <footer className="shrink-0 border-t border-border bg-card px-4 py-2.5">
      <VisionNotice visionUnavailable={visionUnavailable} />
      {attachmentError && (
        <p className="mb-2 text-xs text-destructive">{attachmentError}</p>
      )}
      <AttachmentChips attachments={attachments} onRemove={onRemoveAttachment} />

      <div
        className="relative flex items-end gap-2"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <DropOverlay active={dragOver} />
        <Textarea
          ref={inputRef}
          placeholder="Pregunta a LOCUS…"
          value={query}
          rows={1}
          onChange={(event) => onQueryChange(event.target.value)}
          onPaste={onPaste}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          className="min-h-10 max-h-28 flex-1 resize-none bg-secondary py-2 text-sm leading-5"
        />
        {loading ? (
          <TooltipHint content="Detener">
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="size-10 shrink-0"
              onClick={onStop}
              aria-label="Detener generación"
            >
              <Square className="size-4 fill-current" />
            </Button>
          </TooltipHint>
        ) : (
          <Button
            type="button"
            size="icon-sm"
            className="size-10 shrink-0"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Enviar"
          >
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <ModelSelect
          models={models}
          value={selectedModel}
          onChange={onModelChange}
          disabled={loading}
        />
        <TooltipHint content="Adjuntar archivo">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 p-0 text-muted-foreground"
            onClick={onPickFiles}
            disabled={loading}
            aria-label="Adjuntar archivo"
          >
            <Paperclip className="size-3.5" />
          </Button>
        </TooltipHint>
      </div>
    </footer>
  );
}

type MessageListProps = {
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "error";
    content: string;
  }>;
  loading: boolean;
  streamingId: string | null;
  renderMessage: (message: {
    id: string;
    role: "user" | "assistant" | "error";
    content: string;
    streaming?: boolean;
  }) => React.ReactNode;
};

export function MessageList({
  messages,
  loading,
  streamingId,
  renderMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-3 px-3 py-3">
        {messages.length === 0 && !loading && (
          <p className="m-auto text-center text-sm text-muted-foreground">
            Escribe una pregunta para empezar.
          </p>
        )}
        {messages.map((message) =>
          renderMessage({
            ...message,
            streaming: loading && message.id === streamingId,
          }),
        )}
        <div ref={bottomRef} className="h-px shrink-0" />
      </div>
    </ScrollArea>
  );
}

export function MessageBubble({
  role,
  children,
}: {
  role: ChatRole;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        role === "user" &&
          "rounded-lg border border-primary/25 bg-primary/15 px-3 py-2.5",
        role === "assistant" && "px-0.5 py-0.5",
        role === "error" &&
          "rounded-lg border border-destructive/30 bg-destructive/15 px-3 py-2.5 text-destructive-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function MessageRowLayout({
  role,
  children,
}: {
  role: ChatRole;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        role === "user" ? "justify-end" : "justify-start",
      )}
    >
      {children}
    </div>
  );
}
