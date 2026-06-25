import type { ChatTurn } from "@/types/chat";

const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_MESSAGES_WITH_IMAGE = 4;
const MAX_MESSAGE_CHARS = 3_500;
const MAX_MESSAGE_CHARS_WITH_IMAGE = 2_000;
const MAX_VISION_DESCRIPTION_CHARS = 1_200;

export function truncateText(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}

export function trimContextForApi(
  context: ChatTurn[],
  options: { hasImagesInCurrentMessage?: boolean } = {},
): ChatTurn[] {
  const maxMessages = options.hasImagesInCurrentMessage
    ? MAX_CONTEXT_MESSAGES_WITH_IMAGE
    : MAX_CONTEXT_MESSAGES;
  const maxChars = options.hasImagesInCurrentMessage
    ? MAX_MESSAGE_CHARS_WITH_IMAGE
    : MAX_MESSAGE_CHARS;

  return context
    .filter((message) => message.role !== "error")
    .slice(-maxMessages)
    .map((message) => ({
      ...message,
      content: truncateText(message.prompt ?? message.content, maxChars),
      prompt: message.prompt
        ? truncateText(message.prompt, maxChars)
        : undefined,
      attachments: message.attachments?.map((attachment) => {
        if (attachment.kind !== "image" || !attachment.visionDescription) {
          return attachment;
        }
        return {
          ...attachment,
          visionDescription: truncateText(
            attachment.visionDescription,
            MAX_VISION_DESCRIPTION_CHARS,
          ),
        };
      }),
    }));
}

export function truncateVisionDescription(description: string): string {
  return truncateText(description, MAX_VISION_DESCRIPTION_CHARS);
}
