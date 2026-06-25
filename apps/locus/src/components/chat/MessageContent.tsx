import { marked } from "@/lib/marked";
import type { ChatRole } from "@/types/chat";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Generando respuesta">
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
    </div>
  );
}

type MessageContentProps = {
  role: ChatRole;
  content: string;
  streaming?: boolean;
};

export function MessageContent({ role, content, streaming }: MessageContentProps) {
  if (role === "assistant" && streaming && !content) {
    return <TypingIndicator />;
  }

  if (role === "assistant" && !streaming && content) {
    return (
      <div
        className="text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_ol]:my-2 [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/35 [&_pre]:p-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
}
