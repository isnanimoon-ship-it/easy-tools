import type { SupportedImageMime } from "./types";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_PIXELS = 24_000_000;
export const MAX_TOTAL_PIXELS = 120_000_000;
export const MAX_DIMENSION = 12_000;

export type FileValidationError = "unsupported-format" | "file-too-large" | "signature-mismatch";

export async function validateMetadataImage(file: Pick<File, "type" | "size" | "slice">): Promise<{ ok: true; mime: SupportedImageMime } | { ok: false; reason: FileValidationError }> {
  if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) return { ok: false, reason: "unsupported-format" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "file-too-large" };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  const webp = bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
  const valid = file.type === "image/jpeg" ? jpeg : file.type === "image/png" ? png : webp;
  return valid ? { ok: true, mime: file.type as SupportedImageMime } : { ok: false, reason: "signature-mismatch" };
}

export function validMetadataDimensions(width: number, height: number) {
  return Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 && width <= MAX_DIMENSION && height <= MAX_DIMENSION && width * height <= MAX_PIXELS;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

