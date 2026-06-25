import { invoke } from "@tauri-apps/api/core";
import type { ApiMessage } from "@/utils/attachments";

type ChatSessionOptions = {
  sessionUser?: string;
  sessionKey?: string;
  messageChannel?: string;
};

export async function sendChatMessage(
  messages: ApiMessage[],
  model: string,
  options: ChatSessionOptions = {},
): Promise<string> {
  return invoke<string>("send_chat_message", {
    messages,
    model,
    sessionUser: options.sessionUser ?? null,
    sessionKey: options.sessionKey ?? null,
    messageChannel: options.messageChannel ?? null,
  });
}

export async function sendChatMessageStream(
  messages: ApiMessage[],
  model: string,
  options: ChatSessionOptions = {},
): Promise<string> {
  return invoke<string>("send_chat_message_stream", {
    messages,
    model,
    sessionUser: options.sessionUser ?? null,
    sessionKey: options.sessionKey ?? null,
    messageChannel: options.messageChannel ?? null,
  });
}

export async function cancelChatGeneration(): Promise<void> {
  await invoke("cancel_chat_generation");
}
