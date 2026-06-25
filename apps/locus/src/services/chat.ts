import { invoke } from "@tauri-apps/api/core";
import type { ApiMessage } from "@/utils/attachments";

export async function sendChatMessage(
  messages: ApiMessage[],
  model: string,
): Promise<string> {
  return invoke<string>("send_chat_message", { messages, model });
}

export async function sendChatMessageStream(
  messages: ApiMessage[],
  model: string,
): Promise<string> {
  return invoke<string>("send_chat_message_stream", { messages, model });
}

export async function cancelChatGeneration(): Promise<void> {
  await invoke("cancel_chat_generation");
}
