import { DEFAULT_MODEL } from "@/lib/constants";

export function normalizeModelId(modelId: string): string {
  if (modelId === "openclaw" || modelId.startsWith("openclaw/")) {
    return modelId;
  }
  if (modelId.startsWith("ollama:")) {
    return modelId;
  }
  return `ollama:${modelId}`;
}

export function isDefaultModel(modelId: string): boolean {
  return modelId === DEFAULT_MODEL || modelId === "openclaw";
}
