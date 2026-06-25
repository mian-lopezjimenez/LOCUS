const VISION_FAILURE_PATTERNS = [
  /no puedo ver im[aá]genes/i,
  /can(?:not|'t) see (?:the )?image/i,
  /could not be included in the context/i,
  /size limitations/i,
  /context overflow/i,
  /describe la imagen/i,
  /descr[ií]b(?:e|a) lo que ves/i,
];

export function isVisionFailure(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return true;
  return VISION_FAILURE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function assertValidVisionDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed || isVisionFailure(trimmed)) {
    throw new Error(
      "OpenClaw no pudo analizar la imagen. Comprueba que el agente locus-vision está configurado y reinicia el gateway.",
    );
  }
  return trimmed;
}
