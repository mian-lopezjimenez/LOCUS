export function openClawConversationUser(conversationId: string): string {
  return `locus:conv:${conversationId}`;
}

export function openClawVisionSessionKey(messageId: string): string {
  return `locus:vision:${messageId}`;
}

export function openClawTurnSessionKey(turnId: string): string {
  return `locus:turn:${turnId}`;
}
