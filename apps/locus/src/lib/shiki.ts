import { createHighlighter, type Highlighter } from "shiki";
import type { ResolvedTheme } from "@/types/settings";

const SHIKI_THEMES: Record<ResolvedTheme, string> = {
  light: "github-light",
  dark: "github-dark",
};

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
      themes: ["github-light", "github-dark"],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

export function getShikiTheme(resolved: ResolvedTheme): string {
  return SHIKI_THEMES[resolved];
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
  lang: string | undefined,
  resolvedTheme: ResolvedTheme,
): Promise<string> {
  const highlighter = await getHighlighter();
  const language = guessLanguage(text, lang);
  const theme = getShikiTheme(resolvedTheme);

  const loadedLangs = highlighter.getLoadedLanguages();
  const resolvedLang = loadedLangs.includes(language)
    ? language
    : "plaintext";

  const html = highlighter.codeToHtml(text, {
    lang: resolvedLang,
    theme,
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
