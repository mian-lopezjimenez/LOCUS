export type ChatRole = "user" | "assistant" | "error";

export type ChatTurn = {
  id: string;
  role: ChatRole;
  content: string;
};

export type StoredTurn = {
  id: string;
  role: string;
  content: string;
};
