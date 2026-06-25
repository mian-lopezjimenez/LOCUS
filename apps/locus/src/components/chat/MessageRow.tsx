import { Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageBubble } from "@/components/chat/ChatComposer";
import { Button } from "@/components/ui/button";
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
  const canRetry = showActions;

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative w-full">
      {showActions && (
        <div
          className={cn(
            "absolute top-0 right-0 z-10 flex gap-0.5 rounded-md border border-border/60 bg-card/95 p-0.5 shadow-sm",
            "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={copied ? "Copiado" : "Copiar"}
            aria-label={copied ? "Copiado" : "Copiar mensaje"}
            onClick={() => void handleCopy()}
          >
            <Copy className="size-3.5" />
          </Button>
          {canRetry && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Reintentar"
              aria-label="Reintentar mensaje"
              onClick={() => onRetry(id)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      <MessageBubble role={role}>
        <MessageContent role={role} content={content} streaming={streaming} />
      </MessageBubble>
    </div>
  );
}
