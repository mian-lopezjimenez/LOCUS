import type { MessageAttachment } from "@/types/attachment";
import { MAX_PDF_PAGES_VISION } from "@/utils/pdfConstants";
import { renderPdfPagesToImages, renderStoredPdfPages } from "@/utils/pdfRender";

export async function resolvePdfAttachments(
  attachments: MessageAttachment[],
): Promise<MessageAttachment[]> {
  const resolved: MessageAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.kind !== "pdf") {
      resolved.push(attachment);
      continue;
    }

    if (!attachment.useVision) {
      resolved.push(attachment);
      continue;
    }

    if (attachment.pageCount > MAX_PDF_PAGES_VISION) {
      throw new Error(
        `El PDF tiene ${attachment.pageCount} páginas. El análisis visual admite como máximo ${MAX_PDF_PAGES_VISION}.`,
      );
    }

    if (!attachment.path) {
      throw new Error(
        `No se puede analizar ${attachment.name} por visión sin el archivo local.`,
      );
    }

    const isStoredPath =
      !attachment.path.includes("\\") && !/^[a-zA-Z]:/.test(attachment.path);

    const pageImages = isStoredPath
      ? await renderStoredPdfPages(attachment.path, attachment.name)
      : await renderPdfPagesToImages(attachment.path, attachment.name);

    if (pageImages.length === 0) {
      throw new Error(`No se pudieron renderizar las páginas de ${attachment.name}.`);
    }

    resolved.push(...pageImages);
  }

  return resolved;
}
