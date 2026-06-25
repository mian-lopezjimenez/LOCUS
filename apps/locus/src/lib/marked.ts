import { marked } from "marked";
import hljs from "highlight.js";

marked.setOptions({ gfm: true, breaks: true });

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language =
        lang && hljs.getLanguage(lang) ? lang : undefined;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const langClass = language ? `language-${language}` : "language-plaintext";

      return `<pre class="hljs-block"><code class="hljs ${langClass}">${highlighted}</code></pre>`;
    },
  },
});

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}

export { marked };
