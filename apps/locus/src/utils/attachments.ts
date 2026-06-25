import { loadImageDataUrl } from "@/services/attachments";
import type { MessageAttachment } from "@/types/attachment";
import { compressImageDataUrl } from "@/utils/imageCompress";

export type ApiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ApiMessage = {
  role: string;
  content: string | ApiContentPart[];
};

const MAX_TEXT_BYTES = 512_000;
const MAX_IMAGE_BYTES = 8_000_000;

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "py", "json", "js", "ts", "tsx", "jsx", "rs", "go", "java", "c",
  "cpp", "h", "css", "html", "xml", "yaml", "yml", "toml", "sh", "sql", "csv",
  "rb", "php", "swift", "kt",
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return null;
  return name.slice(dot + 1).toLowerCase();
}

export function isTextFileName(name: string): boolean {
  const ext = extensionOf(name);
  return ext !== null && TEXT_EXTENSIONS.has(ext);
}

export function isImageFileName(name: string): boolean {
  const ext = extensionOf(name);
  return ext !== null && IMAGE_EXTENSIONS.has(ext);
}

export function buildDisplayContent(
  text: string,
  attachments: MessageAttachment[],
): string {
  const labels = attachments.map((attachment) =>
    attachment.kind === "text" ? `📎 ${attachment.name}` : `🖼 ${attachment.name}`,
  );
  const trimmed = text.trim();
  if (labels.length === 0) return trimmed;
  if (!trimmed) return labels.join("\n");
  return `${labels.join("\n")}\n\n${trimmed}`;
}

function appendTextAttachments(
  text: string,
  attachments: MessageAttachment[],
): string {
  let body = text.trim();
  for (const attachment of attachments) {
    if (attachment.kind !== "text") continue;
    body += `\n\n--- ${attachment.name} ---\n${attachment.content}`;
  }
  return body;
}

async function resolveImageUrl(attachment: MessageAttachment & { kind: "image" }) {
  let raw: string;
  if (attachment.dataUrl) {
    raw = attachment.dataUrl;
  } else if (attachment.path) {
    raw = await loadImageDataUrl(attachment.path);
  } else {
    throw new Error(`No se pudo cargar la imagen ${attachment.name}`);
  }
  const { dataUrl } = await compressImageDataUrl(raw);
  return dataUrl;
}

export async function buildApiContent(
  text: string,
  attachments: MessageAttachment[],
  options: { textOnlyImages?: boolean } = {},
): Promise<string | ApiContentPart[]> {
  const images = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "image" } =>
      attachment.kind === "image",
  );

  const textBody = appendTextAttachments(text, attachments);

  if (images.length === 0) {
    return textBody;
  }

  if (options.textOnlyImages) {
    let body = textBody;
    for (const image of images) {
      if (image.visionDescription) {
        body += `\n\n--- ${image.name} (análisis visual) ---\n${image.visionDescription}`;
      }
    }
    return body;
  }

  const parts: ApiContentPart[] = [];
  if (textBody.trim()) {
    parts.push({ type: "text", text: textBody });
  }

  for (const image of images) {
    const url = await resolveImageUrl(image);
    parts.push({ type: "image_url", image_url: { url } });
  }

  return parts;
}

export async function buildApiMessages(
  systemPrompt: string,
  context: Array<{
    role: string;
    content: string;
    attachments?: MessageAttachment[];
    textOnlyImages?: boolean;
  }>,
  userText: string,
  userAttachments: MessageAttachment[],
  options: { textOnlyImages?: boolean } = {},
): Promise<ApiMessage[]> {
  const messages: ApiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const message of context) {
    if (message.role === "error") continue;
    messages.push({
      role: message.role,
      content: await buildApiContent(message.content, message.attachments ?? [], {
        textOnlyImages: message.textOnlyImages,
      }),
    });
  }

  messages.push({
    role: "user",
    content: await buildApiContent(userText, userAttachments, options),
  });

  return messages;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsText(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export async function fileToPendingText(file: File) {
  if (!isTextFileName(file.name)) {
    throw new Error(`Extensión no soportada: ${file.name}`);
  }
  if (file.size > MAX_TEXT_BYTES) {
    throw new Error(`El archivo supera el límite de ${MAX_TEXT_BYTES / 1024} KB`);
  }
  const content = await readFileAsText(file);
  return { name: file.name, content };
}

export async function fileToPendingImage(file: File) {
  if (!isImageFileName(file.name) && !file.type.startsWith("image/")) {
    throw new Error(`No es una imagen válida: ${file.name}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`La imagen supera el límite de ${MAX_IMAGE_BYTES / 1_000_000} MB`);
  }
  const dataUrl = await readFileAsDataUrl(file);
  const { dataUrl: compressed, mimeType } = await compressImageDataUrl(dataUrl);
  return {
    name: file.name || "imagen.png",
    mimeType,
    dataUrl: compressed,
    sizeBytes: file.size,
  };
}

export function hasImageAttachments(attachments: { kind: string }[]): boolean {
  return attachments.some((attachment) => attachment.kind === "image");
}
