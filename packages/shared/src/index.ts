export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const OPENCLAW_GATEWAY_URL = "http://127.0.0.1:18789";

export type ServiceStatus = {
  ollama: boolean;
  openclaw: boolean;
};

export type ServiceHealth = ServiceStatus & {
  ollamaError?: string;
  openclawError?: string;
};
