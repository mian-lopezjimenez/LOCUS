import { Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import {
  MessageBubble,
  MessageRowLayout,
} from "@/components/chat/ChatComposer";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProcessingPhase } from "@/hooks/useChatStream";
import type { MessageAttachment } from "@/types/attachment";
import type { ChatRole } from "@/types/chat";
import { copyToClipboard } from "@/utils/clipboard";

type MessageRowProps = {
  id: string;
  role: ChatRole;
  content: string;
  prompt?: string;
  attachments?: MessageAttachment[];
  streaming?: boolean;
  loading: boolean;
  processingPhase?: ProcessingPhase;
  onRetry: (messageId: string) => void;
};

export function MessageRow({
  id,
  role,
  content,
  prompt,
  attachments,
  streaming,
  loading,
  processingPhase,
  onRetry,
}: MessageRowProps) {
  const [copied, setCopied] = useState(false);

  const displayText =
    attachments && attachments.length > 0 && prompt ? prompt : content;

  const showActions = Boolean(displayText || attachments?.length) && !streaming && !loading;

  const handleCopy = async () => {
    const ok = await copyToClipboard(displayText || content);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const statusLabel =
    role === "assistant" && streaming && processingPhase === "vision"
      ? "Analizando imagen…"
      : undefined;

  return (
    <MessageRowLayout role={role}>
      <div
        className={cn(
          "group relative",
          role === "user" ? "max-w-[min(85%,32rem)] w-fit" : "w-full max-w-full",
        )}
      >
        <MessageBubble role={role}>
          {attachments && attachments.length > 0 && (
            <MessageAttachments attachments={attachments} />
          )}
          {role === "assistant" || displayText ? (
            <MessageContent
              role={role}
              content={displayText || content}
              streaming={streaming}
              statusLabel={statusLabel}
            />
          ) : null}
        </MessageBubble>

        {showActions && (
          <div
            className={cn(
              "mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <TooltipHint content={copied ? "Copiado" : "Copiar"}>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={copied ? "Copiado" : "Copiar mensaje"}
                onClick={() => void handleCopy()}
              >
                <Copy className="size-3.5" />
              </Button>
            </TooltipHint>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="Reintentar mensaje"
              onClick={() => onRetry(id)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </MessageRowLayout>
  );
}
