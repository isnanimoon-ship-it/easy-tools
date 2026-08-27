export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 24_000_000;
export const MAX_DIMENSION = 12_000;
export type ImageFormat = "PNG" | "JPEG" | "WebP";
export type FileValidationError = "unsupported-type" | "signature-mismatch" | "file-too-large";

const typeMap: Record<string, ImageFormat> = { "image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WebP" };
async function readBytes(blob: Blob) {
  if (typeof blob.arrayBuffer === "function") return new Uint8Array(await blob.arrayBuffer());
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image file"));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}
export async function validateImageFile(file: Pick<File, "type" | "size" | "slice">): Promise<{ ok: true; format: ImageFormat } | { ok: false; reason: FileValidationError }> {
  const format = typeMap[file.type]; if (!format) return { ok: false, reason: "unsupported-type" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "file-too-large" };
  const bytes = await readBytes(file.slice(0, 12));
  const png = bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return (format === "PNG" && png) || (format === "JPEG" && jpeg) || (format === "WebP" && webp) ? { ok: true, format } : { ok: false, reason: "signature-mismatch" };
}
export function validateImageDimensions(width: number, height: number) { return Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 && width <= MAX_DIMENSION && height <= MAX_DIMENSION && width * height <= MAX_PIXELS; }
export function formatFileSize(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${Math.round(bytes / 102.4) / 10} KiB`; return `${Math.round(bytes / 1024 ** 2 * 10) / 10} MiB`; }
