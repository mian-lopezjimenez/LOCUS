import {
  OPENCLAW_GATEWAY_URL,
  type ServiceHealth,
} from "@locus/shared";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  /** ID de agente OpenClaw (`openclaw/default`) o modelo Ollama (`ollama:qwen3:8b`). */
  model?: string;
  token?: string;
};

export async function checkGatewayReachable(
  baseUrl = OPENCLAW_GATEWAY_URL,
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  }
}

export async function createChatCompletion(
  options: ChatCompletionOptions,
): Promise<string> {
  const { messages, model = "openclaw/default", token } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const gatewayModel =
    model === "openclaw" || model.startsWith("openclaw/")
      ? model
      : "openclaw/default";
  const ollamaName = model.startsWith("ollama:")
    ? model.slice("ollama:".length)
    : model.startsWith("openclaw/") || model === "openclaw"
      ? null
      : model;
  if (ollamaName) {
    headers["x-openclaw-model"] = `ollama/${ollamaName}`;
  }

  const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: gatewayModel,
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenClaw chat failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function mergeServiceHealth(
  ollama: boolean,
  openclaw: boolean,
  errors: Partial<Pick<ServiceHealth, "ollamaError" | "openclawError">> = {},
): ServiceHealth {
  return { ollama, openclaw, ...errors };
}
