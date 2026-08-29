export type ValidationError =
  | "unsupported-type"
  | "file-too-large"
  | "dimension-limit"
  | "decode-failed";
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_SIDE = 16_384;
const MIN_DETECTABLE_SIDE = 400;

export function validateFile(file: File): ValidationError | null {
  if (!TYPES.has(file.type)) return "unsupported-type";
  if (file.size > MAX_BYTES) return "file-too-large";
  return null;
}
export function validDimensions(width: number, height: number) {
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_SIDE &&
    height <= MAX_SIDE &&
    width * height <= MAX_PIXELS
  );
}
export function isLandscape(width: number, height: number) {
  return width > height;
}
export function isTooSmallToDetect(width: number, height: number) {
  return Math.min(width, height) < MIN_DETECTABLE_SIDE;
}
export function canAutoDetect(width: number, height: number) {
  return !isLandscape(width, height) && !isTooSmallToDetect(width, height);
}
