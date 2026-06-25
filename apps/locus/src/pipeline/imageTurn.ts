import { sendChatMessage } from "@/services/chat";
import {
  SYSTEM_PROMPT,
  VISION_DELEGATION_SYSTEM_ADDENDUM,
  VISION_OPENCLAW_AGENT,
} from "@/lib/constants";
import { openClawVisionSessionKey } from "@/lib/openclawSession";
import { newId } from "@/utils/id";
import type { MessageAttachment } from "@/types/attachment";
import type { ModelInfo } from "@/types/models";
import type { ApiMessage } from "@/utils/attachments";
import { buildApiContent, hasImageAttachments } from "@/utils/attachments";
import { truncateVisionDescription } from "@/utils/contextLimits";
import { assertValidVisionDescription, isVisionFailure } from "@/pipeline/visionFailure";

export type ImageTurnInput = {
  userText: string;
  attachments: MessageAttachment[];
  chatModelId: string;
  models: ModelInfo[];
};

export type TextOnlyPlan = {
  kind: "text_only";
  chatModelId: string;
  userText: string;
  attachments: MessageAttachment[];
  context: Array<{
    role: string;
    content: string;
    attachments?: MessageAttachment[];
  }>;
};

export type VisionThenChatPlan = {
  kind: "vision_then_chat";
  chatModelId: string;
  userText: string;
  attachments: MessageAttachment[];
  images: Array<MessageAttachment & { kind: "image" }>;
};

export type ImageTurnPlan = TextOnlyPlan | VisionThenChatPlan;

function visionPrompt(userText: string, imageCount: number): string {
  const countLabel = imageCount === 1 ? "la imagen" : `las ${imageCount} imágenes`;
  const question = userText.trim()
    ? `El usuario pregunta: «${userText.trim()}».`
    : "";

  return [
    question,
    `Analiza ${countLabel}. Incluye objetos, texto legible y detalles relevantes.`,
    "Responde en español, breve (máximo 12 líneas). No inventes nada que no esté en la imagen.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function inspectTurn(input: ImageTurnInput): ImageTurnPlan {
  const { userText, attachments, chatModelId } = input;

  if (!hasImageAttachments(attachments)) {
    return {
      kind: "text_only",
      chatModelId,
      userText,
      attachments,
      context: [],
    };
  }

  const images = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "image" } =>
      attachment.kind === "image",
  );

  return {
    kind: "vision_then_chat",
    chatModelId,
    userText,
    attachments,
    images,
  };
}

export async function runVisionStep(
  plan: VisionThenChatPlan,
  userText: string,
): Promise<string> {
  const content = await buildApiContent(
    visionPrompt(userText, plan.images.length),
    plan.images,
    { forVision: true },
  );

  const raw = await sendChatMessage(
    [{ role: "user", content }],
    VISION_OPENCLAW_AGENT,
    {
      sessionKey: openClawVisionSessionKey(newId()),
      messageChannel: "locus-vision",
    },
  );

  return assertValidVisionDescription(
    truncateVisionDescription(raw.trim()),
  );
}

export function applyVisionDescription(
  attachments: MessageAttachment[],
  description: string,
): MessageAttachment[] {
  return attachments.map((attachment) => {
    if (attachment.kind !== "image") return attachment;
    return { ...attachment, visionDescription: description };
  });
}

function formatVisionBlock(
  attachments: MessageAttachment[],
): string {
  const blocks = attachments
    .filter(
      (attachment): attachment is MessageAttachment & { kind: "image" } =>
        attachment.kind === "image" &&
        !!attachment.visionDescription &&
        !isVisionFailure(attachment.visionDescription),
    )
    .map(
      (image) =>
        `[Análisis visual de la imagen — ${image.name}]\n${image.visionDescription}\n[/Análisis visual]`,
    );

  if (blocks.length === 0) {
    throw new Error("No hay análisis visual disponible para esta imagen.");
  }

  return blocks.join("\n\n");
}

export async function buildChatPayload(
  plan: ImageTurnPlan,
  context: TextOnlyPlan["context"],
  visionDescription?: string,
): Promise<ApiMessage[]> {
  if (plan.kind === "text_only") {
    const messages: ApiMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

    for (const message of context) {
      if (message.role === "error") continue;
      const hasImages = (message.attachments ?? []).some(
        (attachment) => attachment.kind === "image",
      );
      messages.push({
        role: message.role,
        content: await buildApiContent(
          message.content,
          message.attachments ?? [],
          { textOnlyImages: hasImages },
        ),
      });
    }

    messages.push({
      role: "user",
      content: await buildApiContent(plan.userText, plan.attachments),
    });

    return messages;
  }

  const attachments = visionDescription
    ? applyVisionDescription(plan.attachments, visionDescription)
    : plan.attachments;

  const visionBlock = formatVisionBlock(attachments);
  const question = plan.userText.trim() || "¿Qué hay en la imagen?";
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${VISION_DELEGATION_SYSTEM_ADDENDUM}`;

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${visionBlock}\n\nPregunta del usuario: ${question}`,
    },
  ];
}

export function isVisionCapable(models: ModelInfo[]): boolean {
  return models.some((model) => model.supportsVision);
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
