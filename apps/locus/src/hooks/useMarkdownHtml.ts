import { useEffect, useState } from "react";
import { renderMarkdownParts, type MarkdownPart } from "@/lib/marked";
import { useTheme } from "@/providers/ThemeProvider";

const STREAM_THROTTLE_MS = 80;

export function useMarkdownParts(
  content: string,
  enabled: boolean,
  streaming = false,
): MarkdownPart[] {
  const { resolved } = useTheme();
  const [parts, setParts] = useState<MarkdownPart[]>([]);

  useEffect(() => {
    if (!enabled || !content) {
      setParts([]);
      return;
    }

    let cancelled = false;
    const delay = streaming ? STREAM_THROTTLE_MS : 0;

    const timer = window.setTimeout(() => {
      void renderMarkdownParts(content, resolved).then((result) => {
        if (!cancelled) {
          setParts(result);
        }
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content, enabled, streaming, resolved]);

  return parts;
}
