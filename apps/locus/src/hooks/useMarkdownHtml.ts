import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/marked";

const STREAM_THROTTLE_MS = 80;

export function useMarkdownHtml(
  content: string,
  enabled: boolean,
  streaming = false,
): string {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!enabled || !content) {
      setHtml("");
      return;
    }

    let cancelled = false;
    const delay = streaming ? STREAM_THROTTLE_MS : 0;

    const timer = window.setTimeout(() => {
      void renderMarkdown(content).then((result) => {
        if (!cancelled) {
          setHtml(result);
        }
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content, enabled, streaming]);

  return html;
}
