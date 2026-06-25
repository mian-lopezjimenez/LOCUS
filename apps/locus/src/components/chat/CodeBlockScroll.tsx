import { ScrollArea } from "@/components/ui/scroll-area";

type CodeBlockScrollProps = {
  html: string;
};

export function CodeBlockScroll({ html }: CodeBlockScrollProps) {
  return (
    <ScrollArea
      orientation="both"
      className="my-2 w-full max-h-96 rounded-lg border border-border/50 bg-code-block-bg"
    >
      <div
        className="w-max min-w-full p-3 [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:whitespace-pre [&_pre]:m-0 [&_pre]:border-0 [&_pre]:bg-transparent [&_pre]:p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ScrollArea>
  );
}
