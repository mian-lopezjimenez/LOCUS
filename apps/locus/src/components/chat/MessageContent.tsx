import { CodeBlockScroll } from "@/components/chat/CodeBlockScroll";
import { useMarkdownParts } from "@/hooks/useMarkdownHtml";
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
  "chat-markdown text-sm leading-relaxed [&_ol]:my-2 [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:pl-5 [&_code]:font-mono [&_code]:text-[0.88em] [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5";

export function MessageContent({ role, content, streaming }: MessageContentProps) {
  const useMarkdown = role === "assistant" && Boolean(content);
  const parts = useMarkdownParts(content, useMarkdown, streaming);

  if (role === "assistant" && streaming && !content) {
    return <TypingIndicator />;
  }

  if (useMarkdown) {
    if (parts.length === 0 && streaming) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
    }

    if (parts.length > 0) {
      return (
        <div className={markdownClassName}>
          {parts.map((part, index) =>
            part.type === "code" ? (
              <CodeBlockScroll key={index} html={part.value} />
            ) : (
              <div
                key={index}
                dangerouslySetInnerHTML={{ __html: part.value }}
              />
            ),
          )}
        </div>
      );
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
}
