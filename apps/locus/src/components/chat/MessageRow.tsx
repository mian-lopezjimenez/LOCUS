import { Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { MessageContent } from "@/components/chat/MessageContent";
import {
  MessageBubble,
  MessageRowLayout,
} from "@/components/chat/ChatComposer";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatRole } from "@/types/chat";
import { copyToClipboard } from "@/utils/clipboard";

type MessageRowProps = {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean;
  loading: boolean;
  onRetry: (messageId: string) => void;
};

export function MessageRow({
  id,
  role,
  content,
  streaming,
  loading,
  onRetry,
}: MessageRowProps) {
  const [copied, setCopied] = useState(false);

  const showActions = Boolean(content) && !streaming && !loading;

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <MessageRowLayout role={role}>
      <div
        className={cn(
          "group relative",
          role === "user" ? "max-w-[min(85%,32rem)] w-fit" : "w-full max-w-full",
        )}
      >
        <MessageBubble role={role}>
          <MessageContent role={role} content={content} streaming={streaming} />
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
