import type { ChatRole, ChatTurn, StoredTurn } from "@/types/chat";
import { fromStoredAttachments, toStoredAttachments } from "@/services/attachments";

export function mapStoredTurns(stored: StoredTurn[]): ChatTurn[] {
  return stored.map((message) => ({
    id: message.id,
    role: message.role as ChatRole,
    content: message.content,
    prompt: message.prompt,
    attachments: fromStoredAttachments(message.attachments),
  }));
}

export function toStoredTurns(turns: ChatTurn[]): StoredTurn[] {
  return turns.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    prompt: message.prompt,
    attachments: toStoredAttachments(message.attachments),
  }));
}
