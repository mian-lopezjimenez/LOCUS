import type { StoredTurn } from "./chat";

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredTurn[];
};

export type SpotlightStore = {
  activeConversationId: string;
  conversations: Conversation[];
};
