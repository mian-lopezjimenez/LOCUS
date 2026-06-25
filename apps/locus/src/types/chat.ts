import type { MessageAttachment, StoredAttachment } from "@/types/attachment";

export type ChatRole = "user" | "assistant" | "error";

export type ChatTurn = {
  id: string;
  role: ChatRole;
  content: string;
  /** Texto escrito por el usuario (sin etiquetas de adjuntos). */
  prompt?: string;
  attachments?: MessageAttachment[];
};

export type StoredTurn = {
  id: string;
  role: string;
  content: string;
  prompt?: string;
  attachments?: StoredAttachment[];
};
