const MAX_IMAGE_SIDE = 896;
const VISION_IMAGE_SIDE = 384;
const JPEG_QUALITY = 0.75;
const VISION_JPEG_QUALITY = 0.65;

export async function compressImageDataUrl(
  dataUrl: string,
  maxSide = MAX_IMAGE_SIDE,
  quality = JPEG_QUALITY,
): Promise<{ dataUrl: string; mimeType: string }> {
  const img = await loadImage(dataUrl);
  const { width, height } = img;
  if (width === 0 || height === 0) {
    throw new Error("Imagen inválida");
  }

  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  if (scale === 1 && dataUrl.startsWith("data:image/jpeg")) {
    return { dataUrl, mimeType: "image/jpeg" };
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen");
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const compressed = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: compressed, mimeType: "image/jpeg" };
}

export async function compressImageForVision(dataUrl: string) {
  return compressImageDataUrl(dataUrl, VISION_IMAGE_SIDE, VISION_JPEG_QUALITY);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo decodificar la imagen"));
    img.src = dataUrl;
  });
}
