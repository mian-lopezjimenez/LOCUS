import * as pdfjs from "pdfjs-dist";
import type { MessageAttachment } from "@/types/attachment";
import { loadPdfBytes, readPdfBytes } from "@/services/attachments";
import { compressImageForVision } from "@/utils/imageCompress";
import { MAX_PDF_PAGES_VISION } from "@/utils/pdfConstants";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

async function loadPdfDocument(source: string | ArrayBuffer) {
  const data =
    typeof source === "string"
      ? new Uint8Array((await readPdfBytes(source)).bytes)
      : new Uint8Array(source);

  return pdfjs.getDocument({ data }).promise;
}

export async function renderPdfPagesToImages(
  source: string | ArrayBuffer,
  baseName: string,
  maxPages = MAX_PDF_PAGES_VISION,
): Promise<MessageAttachment[]> {
  const doc = await loadPdfDocument(source);
  const pageLimit = Math.min(doc.numPages, maxPages);

  if (pageLimit === 0) {
    throw new Error("El PDF no tiene páginas renderizables.");
  }

  const images: MessageAttachment[] = [];

  for (let pageNum = 1; pageNum <= pageLimit; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo renderizar el PDF.");
    }

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const { dataUrl, mimeType } = await compressImageForVision(rawDataUrl);

    images.push({
      kind: "image",
      name: `${baseName} — pág. ${pageNum}`,
      mimeType,
      dataUrl,
    });
  }

  return images;
}

export async function renderStoredPdfPages(
  relativePath: string,
  baseName: string,
  maxPages = MAX_PDF_PAGES_VISION,
): Promise<MessageAttachment[]> {
  const bytes = await loadPdfBytes(relativePath);
  return renderPdfPagesToImages(bytes.buffer as ArrayBuffer, baseName, maxPages);
}
