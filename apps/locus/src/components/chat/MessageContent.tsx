import { renderMarkdown } from "@/lib/marked";
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

const markdownClassName =
  "text-sm leading-relaxed [&_ol]:my-2 [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:pl-5 [&_code]:font-mono [&_code]:text-[0.88em] [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_.hljs-block]:my-2 [&_.hljs-block]:overflow-x-auto [&_.hljs-block]:rounded-lg [&_.hljs-block]:border [&_.hljs-block]:border-border/50 [&_.hljs-block]:bg-[#0d1117] [&_.hljs-block]:p-3 [&_.hljs-block_code]:bg-transparent [&_.hljs-block_code]:p-0";

export function MessageContent({ role, content, streaming }: MessageContentProps) {
  if (role === "assistant" && streaming && !content) {
    return <TypingIndicator />;
  }

  if (role === "assistant" && !streaming && content) {
    return (
      <div
        className={markdownClassName}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
}
