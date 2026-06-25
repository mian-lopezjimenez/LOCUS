import type { MessageAttachment } from "@/types/attachment";
import type { ChatTurn } from "@/types/chat";

function formatAttachmentBlock(attachment: MessageAttachment): string {
  if (attachment.kind === "text") {
    return `\n\n--- ${attachment.name} ---\n${attachment.content}`;
  }

  if (attachment.kind === "pdf") {
    if (!attachment.useVision && attachment.text.trim()) {
      return `\n\n--- ${attachment.name} ---\n${attachment.text}`;
    }
    const mode = attachment.useVision ? "análisis visual" : "sin texto extraíble";
    return `\n\n> 📄 ${attachment.name} (${mode}, ${attachment.pageCount} pág.)`;
  }

  const visionNote = attachment.visionDescription
    ? `\n\n[Análisis visual]\n${attachment.visionDescription}\n[/Análisis visual]`
    : "";
  return `\n\n> 🖼 ${attachment.name}${visionNote}`;
}

function formatUserMessage(turn: ChatTurn): string {
  const body = (turn.prompt ?? turn.content).trim();
  const attachmentBlocks = (turn.attachments ?? []).map(formatAttachmentBlock).join("");
  return `${body}${attachmentBlocks}`.trim() || "_(mensaje vacío)_";
}

function roleHeading(role: ChatTurn["role"]): string {
  switch (role) {
    case "user":
      return "Usuario";
    case "assistant":
      return "Asistente";
    case "error":
      return "Error";
  }
}

export function formatConversationMarkdown(
  title: string,
  turns: ChatTurn[],
  exportedAt = new Date(),
): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `_Exportado desde LOCUS el ${exportedAt.toLocaleString("es-ES")}_`,
    "",
  ];

  const exportable = turns.filter(
    (turn) =>
      turn.role !== "assistant" ||
      turn.content.trim().length > 0,
  );

  if (exportable.length === 0) {
    lines.push("_Conversación vacía._");
    return lines.join("\n");
  }

  for (const turn of exportable) {
    lines.push(`## ${roleHeading(turn.role)}`, "");

    if (turn.role === "user") {
      lines.push(formatUserMessage(turn));
    } else if (turn.role === "error") {
      lines.push(`> ${turn.content.trim()}`);
    } else {
      lines.push(turn.content.trim() || "_(sin contenido)_");
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function defaultExportFilename(title: string, exportedAt = new Date()): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const date = exportedAt.toISOString().slice(0, 10);
  const base = slug || "conversacion";
  return `locus-${base}-${date}.md`;
}
