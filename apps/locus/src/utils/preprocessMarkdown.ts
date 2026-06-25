import {
  formatPrettyJson,
  formatToolCallMarkdown,
} from "@/utils/formatToolCall";

/** Cierra un fence ``` abierto (útil mientras llega el stream). */
export function closeOpenFences(content: string): string {
  const fenceCount = (content.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    return `${content}\n\`\`\``;
  }
  return content;
}

function unwrapJsonFence(content: string): string | null {
  const trimmed = content.trim();
  const closed = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  if (closed) {
    return closed[1].trim();
  }

  const open = trimmed.match(/^```(?:json)?\s*\n([\s\S]*)$/);
  if (open) {
    return open[1].trim();
  }

  return null;
}

function isBareJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  }
}

function formatBareJson(content: string): string {
  const toolMarkdown = formatToolCallMarkdown(content);
  if (toolMarkdown) {
    return toolMarkdown;
  }

  const prettyJson = formatPrettyJson(content);
  if (prettyJson) {
    return prettyJson;
  }

  return `\`\`\`json\n${content.trimEnd()}\n\`\`\``;
}

/** Prepara el contenido del asistente para marked + Shiki. */
export function preprocessMarkdownContent(content: string): string {
  if (!content.trim()) {
    return content;
  }

  const unwrapped = unwrapJsonFence(content);
  if (unwrapped && isBareJson(unwrapped)) {
    return formatBareJson(unwrapped);
  }

  if (isBareJson(content)) {
    return formatBareJson(content);
  }

  if (content.includes("```")) {
    return closeOpenFences(content);
  }

  return content;
}
