import type { ChatTurn } from "@/types/chat";

export function findRetryContext(
  messages: ChatTurn[],
  messageId: string,
): { truncated: ChatTurn[]; userContent: string } | null {
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

  const userContent = messages[userIndex].content.trim();
  if (!userContent) return null;

  return {
    truncated: messages.slice(0, userIndex),
    userContent,
  };
}
