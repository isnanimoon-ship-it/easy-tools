export type ValidationError =
  | "unsupported-type"
  | "file-too-large"
  | "animated-image"
  | "dimension-limit"
  | "decode-failed";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_SIDE = 16_384;

export function validateFile(file: File): ValidationError | null {
  if (!TYPES.has(file.type)) return "unsupported-type";
  if (file.size > MAX_BYTES) return "file-too-large";
  return null;
}

export function validDimensions(width: number, height: number): boolean {
  return width > 0 && height > 0 && width <= MAX_SIDE && height <= MAX_SIDE && width * height <= MAX_PIXELS;
}

export async function isAnimatedWebp(file: File): Promise<boolean> {
  if (file.type !== "image/webp") return false;
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 1_000_000)).arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return text.includes("ANIM") || text.includes("ANMF");
}
