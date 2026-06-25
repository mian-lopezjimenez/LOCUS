import { sendChatMessage } from "@/services/chat";
import type { MessageAttachment } from "@/types/attachment";
import type { ModelInfo } from "@/types/models";
import { buildApiContent } from "@/utils/attachments";
import { truncateVisionDescription } from "@/utils/contextLimits";

function visionUserPrompt(userText: string, imageCount: number): string {
  const countLabel = imageCount === 1 ? "la imagen" : `las ${imageCount} imágenes`;
  const question = userText.trim()
    ? `El usuario pregunta: «${userText.trim()}».`
    : "";

  return [
    question,
    `Analiza ${countLabel} adjunta(s). Incluye objetos, texto legible y detalles relevantes para responder.`,
    "Responde en español, de forma breve (máximo 12 líneas), sin introducción.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function pickVisionModel(
  models: ModelInfo[],
  preferredId?: string,
): ModelInfo | null {
  const visionModels = models.filter((model) => model.supportsVision);
  if (visionModels.length === 0) return null;

  if (preferredId) {
    const preferred = visionModels.find((model) => model.id === preferredId);
    if (preferred) return preferred;
  }

  const qwenVl = visionModels.find((model) => {
    const label = model.label.toLowerCase();
    return label.includes("qwen") && label.includes("vl");
  });
  if (qwenVl) return qwenVl;

  return visionModels[0] ?? null;
}

export function modelSupportsVision(
  modelId: string,
  models: ModelInfo[],
): boolean {
  return models.find((model) => model.id === modelId)?.supportsVision ?? false;
}

export function needsVisionDelegation(
  attachments: MessageAttachment[],
  chatModelId: string,
  models: ModelInfo[],
): boolean {
  const hasImages = attachments.some((attachment) => attachment.kind === "image");
  if (!hasImages) return false;
  return !modelSupportsVision(chatModelId, models);
}

async function describeImages(
  userText: string,
  images: Array<MessageAttachment & { kind: "image" }>,
  visionModelId: string,
): Promise<string> {
  const content = await buildApiContent(
    visionUserPrompt(userText, images.length),
    images,
    { forVision: true },
  );
  const description = await sendChatMessage(
    [{ role: "user", content }],
    visionModelId,
  );

  const trimmed = truncateVisionDescription(description.trim());
  if (!trimmed) {
    throw new Error("El modelo de visión no devolvió una descripción");
  }
  return trimmed;
}

export async function enrichAttachmentsWithVision(
  userText: string,
  attachments: MessageAttachment[],
  visionModelId: string,
): Promise<MessageAttachment[]> {
  const images = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "image" } =>
      attachment.kind === "image",
  );

  if (images.length === 0) return attachments;

  const missing = images.filter((image) => !image.visionDescription);
  if (missing.length === 0) return attachments;

  const description = await describeImages(userText, missing, visionModelId);

  return attachments.map((attachment) => {
    if (attachment.kind !== "image" || attachment.visionDescription) {
      return attachment;
    }
    return { ...attachment, visionDescription: description };
  });
}

export async function prepareAttachmentsForChatModel(
  userText: string,
  attachments: MessageAttachment[],
  chatModelId: string,
  models: ModelInfo[],
  visionModelId?: string,
): Promise<{
  attachments: MessageAttachment[];
  textOnlyImages: boolean;
  visionModelUsed?: string;
}> {
  if (!needsVisionDelegation(attachments, chatModelId, models)) {
    return { attachments, textOnlyImages: false };
  }

  const visionModel = pickVisionModel(models, visionModelId);
  if (!visionModel) {
    throw new Error(
      "No hay ningún modelo de visión instalado. Ejecuta «ollama pull qwen2.5vl:7b» o similar.",
    );
  }

  const enriched = await enrichAttachmentsWithVision(
    userText,
    attachments,
    visionModel.id,
  );

  return {
    attachments: enriched,
    textOnlyImages: true,
    visionModelUsed: visionModel.id,
  };
}
