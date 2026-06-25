import { useEffect, useRef } from "react";
import { Square, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatComposer({
  query,
  loading,
  onQueryChange,
  onSubmit,
  onStop,
  inputRef,
}: ChatComposerProps) {
  return (
    <footer className="flex shrink-0 items-end gap-2 border-t border-border bg-card p-3">
      <Textarea
        ref={inputRef}
        placeholder="Pregunta a LOCUS…"
        value={query}
        rows={1}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={loading}
        spellCheck={false}
        autoComplete="off"
        className="min-h-10 max-h-28 resize-none bg-secondary text-sm"
      />
      {loading ? (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onStop}
          aria-label="Detener generación"
          title="Detener"
        >
          <Square className="size-4 fill-current" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={!query.trim()}
          aria-label="Enviar"
        >
          <ArrowRight className="size-4" />
        </Button>
      )}
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
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
  );
}

export function MessageBubble({
  role,
  children,
}: {
  role: "user" | "assistant" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full",
        role === "user" &&
          "rounded-lg border border-primary/25 bg-primary/15 px-3 py-2.5",
        role === "assistant" && "px-0.5",
        role === "error" &&
          "rounded-lg border border-destructive/30 bg-destructive/15 px-3 py-2.5 text-destructive-foreground",
      )}
    >
      {children}
    </div>
  );
}
