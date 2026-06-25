import { invoke } from "@tauri-apps/api/core";

export async function sendChatMessageStream(
  messages: Array<{ role: string; content: string }>,
  model: string,
): Promise<string> {
  return invoke<string>("send_chat_message_stream", { messages, model });
}

export async function cancelChatGeneration(): Promise<void> {
  await invoke("cancel_chat_generation");
}
