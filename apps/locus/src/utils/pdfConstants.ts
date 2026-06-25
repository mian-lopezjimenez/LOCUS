export const MIN_PDF_TEXT_CHARS = 100;
export const MAX_PDF_PAGES_VISION = 10;
export const MAX_PDF_BYTES = 10_000_000;

export function shouldUsePdfVision(text: string, pageCount: number): boolean {
  if (pageCount === 0) return false;
  return text.trim().length < MIN_PDF_TEXT_CHARS;
}
