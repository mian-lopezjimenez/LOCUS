import type { ChatRole, ChatTurn, StoredTurn } from "@/types/chat";

export function mapStoredTurns(stored: StoredTurn[]): ChatTurn[] {
  return stored.map((message) => ({
    id: message.id,
    role: message.role as ChatRole,
    content: message.content,
  }));
}

export function toStoredTurns(turns: ChatTurn[]): StoredTurn[] {
  return turns.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
  }));
}
