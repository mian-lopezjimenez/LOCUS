import { marked, type Token, type Tokens } from "marked";
import { highlightCodeBlock } from "@/lib/shiki";
import { preprocessMarkdownContent } from "@/utils/preprocessMarkdown";

marked.setOptions({ gfm: true, breaks: true });

async function highlightCodeTokens(tokens: Token[]): Promise<Token[]> {
  return Promise.all(
    tokens.map(async (token) => {
      if (token.type === "code") {
        const code = token as Tokens.Code;
        const html = await highlightCodeBlock(code.text, code.lang);
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
          tokens: await highlightCodeTokens(token.tokens),
        };
      }

      return token;
    }),
  );
}

export async function renderMarkdown(content: string): Promise<string> {
  const prepared = preprocessMarkdownContent(content);
  const tokens = marked.lexer(prepared);
  const highlighted = await highlightCodeTokens(tokens);
  return marked.parser(highlighted);
}

export { marked };
