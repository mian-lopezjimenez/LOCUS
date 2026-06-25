export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
