import { invoke } from "@tauri-apps/api/core";
import type {
  MessageAttachment,
  PendingAttachment,
  StoredAttachment,
} from "@/types/attachment";

function needsPersistSourcePath(path: string): boolean {
  return path.includes("\\") || /^[a-zA-Z]:/.test(path);
}

type ReadTextResult = { name: string; content: string };
type ReadImageResult = {
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
};
type ReadPdfResult = {
  name: string;
  text: string;
  pageCount: number;
  sizeBytes: number;
};

export async function readTextAttachment(path: string): Promise<ReadTextResult> {
  return invoke<ReadTextResult>("read_text_attachment", { path });
}

export async function readImageAttachment(path: string): Promise<ReadImageResult> {
  return invoke<ReadImageResult>("read_image_attachment", { path });
}

export async function readPdfAttachment(path: string): Promise<ReadPdfResult> {
  return invoke<ReadPdfResult>("read_pdf_attachment", { path });
}

export async function readPdfBytes(path: string): Promise<{ bytes: number[] }> {
  return invoke<{ bytes: number[] }>("read_pdf_bytes", { path });
}

export async function loadPdfBytes(relativePath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("load_pdf_bytes", { relativePath });
  return Uint8Array.from(bytes);
}

export async function persistImageAttachment(
  conversationId: string,
  messageId: string,
  name: string,
  mimeType: string,
  dataUrl: string,
): Promise<string> {
  return invoke<string>("persist_image_attachment", {
    conversationId,
    messageId,
    name,
    mimeType,
    dataUrl,
  });
}

export async function persistPdfAttachment(
  conversationId: string,
  messageId: string,
  sourcePath: string,
): Promise<string> {
  return invoke<string>("persist_pdf_attachment", {
    conversationId,
    messageId,
    sourcePath,
  });
}

export async function loadImageDataUrl(relativePath: string): Promise<string> {
  return invoke<string>("load_image_data_url", { relativePath });
}

export async function persistTurnAttachments(
  conversationId: string,
  messageId: string,
  attachments: MessageAttachment[],
): Promise<MessageAttachment[]> {
  const persisted: MessageAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.kind === "text") {
      persisted.push(attachment);
      continue;
    }

    if (attachment.kind === "pdf") {
      if (attachment.path && needsPersistSourcePath(attachment.path)) {
        const path = await persistPdfAttachment(
          conversationId,
          messageId,
          attachment.path,
        );

        persisted.push({
          kind: "pdf",
          name: attachment.name,
          path,
          text: attachment.text,
          pageCount: attachment.pageCount,
          useVision: attachment.useVision,
        });
        continue;
      }

      persisted.push(attachment);
      continue;
    }

    if (attachment.path) {
      persisted.push({
        ...attachment,
        dataUrl: undefined,
      });
      continue;
    }

    if (!attachment.dataUrl) {
      continue;
    }

    const path = await persistImageAttachment(
      conversationId,
      messageId,
      attachment.name,
      attachment.mimeType,
      attachment.dataUrl,
    );

    persisted.push({
      kind: "image",
      name: attachment.name,
      mimeType: attachment.mimeType,
      path,
      visionDescription: attachment.visionDescription,
    });
  }

  return persisted;
}

export function toStoredAttachments(
  attachments: MessageAttachment[] | undefined,
): StoredAttachment[] | undefined {
  if (!attachments?.length) return undefined;

  return attachments.map((attachment) => {
    if (attachment.kind === "text") {
      return {
        kind: "text",
        name: attachment.name,
        content: attachment.content,
      };
    }

    if (attachment.kind === "pdf") {
      return {
        kind: "pdf",
        name: attachment.name,
        path: attachment.path,
        content: attachment.text,
        pageCount: attachment.pageCount,
        useVision: attachment.useVision,
      };
    }

    return {
      kind: "image",
      name: attachment.name,
      mimeType: attachment.mimeType,
      path: attachment.path,
      visionDescription: attachment.visionDescription,
    };
  });
}

export function fromStoredAttachments(
  stored: StoredAttachment[] | undefined,
): MessageAttachment[] | undefined {
  if (!stored?.length) return undefined;

  return stored.map((attachment) => {
    if (attachment.kind === "text") {
      return {
        kind: "text",
        name: attachment.name,
        content: attachment.content ?? "",
      };
    }

    if (attachment.kind === "pdf") {
      return {
        kind: "pdf",
        name: attachment.name,
        path: attachment.path,
        text: attachment.content ?? "",
        pageCount: attachment.pageCount ?? 0,
        useVision: attachment.useVision ?? false,
      };
    }

    return {
      kind: "image",
      name: attachment.name,
      mimeType: attachment.mimeType ?? "image/png",
      path: attachment.path,
      visionDescription: attachment.visionDescription,
    };
  });
}

export function pendingToMessageAttachments(
  pending: PendingAttachment[],
): MessageAttachment[] {
  return pending.map((attachment) => {
    if (attachment.kind === "text") {
      return {
        kind: "text",
        name: attachment.name,
        content: attachment.content,
      };
    }

    if (attachment.kind === "pdf") {
      return {
        kind: "pdf",
        name: attachment.name,
        path: attachment.path,
        text: attachment.text,
        pageCount: attachment.pageCount,
        useVision: attachment.useVision,
      };
    }

    return {
      kind: "image",
      name: attachment.name,
      mimeType: attachment.mimeType,
      dataUrl: attachment.dataUrl,
    };
  });
}
