import type { MessageAttachment } from "@/types/attachment";
import type { ChatTurn } from "@/types/chat";

export function findRetryContext(
  messages: ChatTurn[],
  messageId: string,
): {
  truncated: ChatTurn[];
  userText: string;
  userAttachments: MessageAttachment[];
} | null {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) return null;

  let userIndex = index;
  if (messages[index].role !== "user") {
    userIndex = -1;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) return null;
  }

  const userMessage = messages[userIndex];
  const userText = (userMessage.prompt ?? userMessage.content).trim();
  const userAttachments = userMessage.attachments ?? [];
  if (!userText && userAttachments.length === 0) return null;

  return {
    truncated: messages.slice(0, userIndex),
    userText,
    userAttachments,
  };
}