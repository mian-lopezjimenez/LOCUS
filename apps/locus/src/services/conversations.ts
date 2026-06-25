import { invoke } from "@tauri-apps/api/core";
import type { Conversation, SpotlightStore } from "@/types/conversation";
import type { StoredTurn } from "@/types/chat";

export async function loadSpotlightStore(): Promise<SpotlightStore> {
  return invoke<SpotlightStore>("load_spotlight_store");
}

export async function upsertConversation(
  conversation: Conversation,
): Promise<SpotlightStore> {
  return invoke<SpotlightStore>("upsert_conversation", { conversation });
}

export async function createConversation(): Promise<SpotlightStore> {
  return invoke<SpotlightStore>("create_conversation");
}

export async function setActiveConversation(
  conversationId: string,
): Promise<SpotlightStore> {
  return invoke<SpotlightStore>("set_active_conversation", { conversationId });
}

export async function deleteConversation(
  conversationId: string,
): Promise<SpotlightStore> {
  return invoke<SpotlightStore>("delete_conversation", { conversationId });
}

export function buildConversationPayload(
  conversationId: string,
  existing: Conversation | undefined,
  messages: StoredTurn[],
): Conversation {
  return {
    id: conversationId,
    title: existing?.title ?? "Nueva conversación",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages,
  };
}
