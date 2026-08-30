export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function srgbToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexToRgb(hexA));
  const l2 = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Looser than WCAG AA body-text (4.5:1) — favicon content is 1-3 large
// characters, not paragraph text, so the bar for "readable" is lower.
export const LOW_CONTRAST_THRESHOLD = 3;

export function isLowContrast(background: string, foreground: string): boolean {
  return contrastRatio(background, foreground) < LOW_CONTRAST_THRESHOLD;
}
