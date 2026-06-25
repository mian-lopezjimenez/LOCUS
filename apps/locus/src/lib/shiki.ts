import { createHighlighter, type Highlighter } from "shiki";

const THEME = "github-dark";

const LANGS = [
  "json",
  "javascript",
  "typescript",
  "python",
  "rust",
  "bash",
  "shell",
  "markdown",
  "plaintext",
  "yaml",
  "toml",
  "html",
  "css",
  "sql",
  "ruby",
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function guessLanguage(text: string, lang?: string): string {
  if (lang) {
    return lang;
  }
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "plaintext";
}

export async function highlightCodeBlock(
  text: string,
  lang?: string,
): Promise<string> {
  const highlighter = await getHighlighter();
  const language = guessLanguage(text, lang);

  const loadedLangs = highlighter.getLoadedLanguages();
  const resolvedLang = loadedLangs.includes(language)
    ? language
    : "plaintext";

  const html = highlighter.codeToHtml(text, {
    lang: resolvedLang,
    theme: THEME,
    transformers: [
      {
        pre(node) {
          node.properties.class = `shiki-block ${String(node.properties.class ?? "")}`.trim();
          node.properties.tabindex = undefined;
        },
      },
    ],
  });

  return html;
}
