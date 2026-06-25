import { marked, type Token, type Tokens } from "marked";
import { highlightCodeBlock } from "@/lib/shiki";
import type { ResolvedTheme } from "@/types/settings";
import { preprocessMarkdownContent } from "@/utils/preprocessMarkdown";

marked.setOptions({ gfm: true, breaks: true });

async function highlightCodeTokens(
  tokens: Token[],
  resolvedTheme: ResolvedTheme,
): Promise<Token[]> {
  return Promise.all(
    tokens.map(async (token) => {
      if (token.type === "code") {
        const code = token as Tokens.Code;
        const html = await highlightCodeBlock(
          code.text,
          code.lang,
          resolvedTheme,
        );
        return {
          type: "html",
          raw: html,
          block: true,
          pre: false,
          text: html,
        } satisfies Tokens.HTML;
      }

      if ("tokens" in token && Array.isArray(token.tokens)) {
        return {
          ...token,
          tokens: await highlightCodeTokens(token.tokens, resolvedTheme),
        };
      }

      return token;
    }),
  );
}

export type MarkdownPart =
  | { type: "html"; value: string }
  | { type: "code"; value: string };

function isCodeBlockToken(token: Token): boolean {
  if (token.type !== "html") {
    return false;
  }

  const html = token as Tokens.HTML;
  return html.text.includes("shiki-block");
}

function tokensToParts(tokens: Token[]): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  let htmlBuffer: Token[] = [];

  const flushHtml = () => {
    if (htmlBuffer.length > 0) {
      parts.push({ type: "html", value: marked.parser(htmlBuffer) });
      htmlBuffer = [];
    }
  };

  for (const token of tokens) {
    if (isCodeBlockToken(token)) {
      flushHtml();
      parts.push({ type: "code", value: (token as Tokens.HTML).text });
    } else {
      htmlBuffer.push(token);
    }
  }

  flushHtml();
  return parts;
}

export async function renderMarkdownParts(
  content: string,
  resolvedTheme: ResolvedTheme,
): Promise<MarkdownPart[]> {
  const prepared = preprocessMarkdownContent(content);
  const tokens = marked.lexer(prepared);
  const highlighted = await highlightCodeTokens(tokens, resolvedTheme);
  return tokensToParts(highlighted);
}

export async function renderMarkdown(
  content: string,
  resolvedTheme: ResolvedTheme,
): Promise<string> {
  const parts = await renderMarkdownParts(content, resolvedTheme);
  return parts.map((part) => part.value).join("");
}

export { marked };
