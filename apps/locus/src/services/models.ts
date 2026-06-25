import { invoke } from "@tauri-apps/api/core";
import type { ModelInfo } from "@/types/models";

export async function listChatModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("list_chat_models");
}
