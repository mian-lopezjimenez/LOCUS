type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  html: "html",
  css: "css",
  sql: "sql",
  toml: "toml",
  rb: "ruby",
  ruby: "ruby",
};

function langFromPath(path: string): string {
  const fileName = path.split(/[/\\]/).pop() ?? path;
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : undefined;
  return (ext && EXT_TO_LANG[ext]) || "plaintext";
}

function fileNameFromPath(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function tryParseJsonObject(text: string): unknown | null {
  try {
    const parsed = JSON.parse(text.trim());
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function isToolCall(value: unknown): value is ToolCall {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as ToolCall).name === "string"
  );
}

function normalizeArguments(
  args: unknown,
): Record<string, unknown> | null {
  if (args && typeof args === "object") {
    return args as Record<string, unknown>;
  }
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function formatWriteCall(tool: ToolCall): string | null {
  if (tool.name !== "write") {
    return null;
  }

  const args = normalizeArguments(tool.arguments);
  if (!args) {
    return null;
  }

  const path = typeof args.path === "string" ? args.path : null;
  const content = typeof args.content === "string" ? args.content : null;

  if (!path || content === null) {
    return null;
  }

  const lang = langFromPath(path);
  const fileName = fileNameFromPath(path);

  return `**Crear archivo** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\``;
}

/** Convierte tool calls JSON de OpenClaw en markdown legible con código resaltado. */
export function formatToolCallMarkdown(content: string): string | null {
  const parsed = tryParseJsonObject(content);
  if (!parsed || !isToolCall(parsed)) {
    return null;
  }

  const writeFormatted = formatWriteCall(parsed);
  if (writeFormatted) {
    return writeFormatted;
  }

  return `**Herramienta** \`${parsed.name}\`\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
}

/** JSON válido formateado con sangría (no tool call reconocible). */
export function formatPrettyJson(content: string): string | null {
  const parsed = tryParseJsonObject(content);
  if (parsed === null) {
    return null;
  }

  return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
}
