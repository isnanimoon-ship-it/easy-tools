import { inspectContainer } from "./container-scanner";
import { validMetadataDimensions } from "./file-validation";
import type { SupportedImageMime } from "./types";

export type CleanResult = { blob: Blob; width: number; height: number; verified: boolean };

export async function decodeDimensions(file: Blob) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close(); }
}

export async function removeImageMetadata(file: Blob, mime: SupportedImageMime, quality = 0.92): Promise<CleanResult> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let canvas: HTMLCanvasElement | null = null;
  try {
    if (!validMetadataDimensions(bitmap.width, bitmap.height)) throw new Error("invalid-dimensions");
    canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("encode-failed");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas!.toBlob(value => value ? resolve(value) : reject(new Error("encode-failed")), mime, mime === "image/png" ? undefined : quality));
    if (blob.type !== mime) throw new Error("encoder-unsupported");
    const output = new Uint8Array(await blob.arrayBuffer());
    const scan = inspectContainer(output, mime);
    const verification = await createImageBitmap(blob);
    try {
      if (verification.width !== bitmap.width || verification.height !== bitmap.height) throw new Error("verification-failed");
    } finally { verification.close(); }
    // Chromium may add a fresh standard ICC profile while encoding JPEG. The
    // source profile is never copied through Canvas, and ICC contains no GPS,
    // author, capture, or device fields. All privacy-bearing blocks still fail.
    const privacyKinds = scan.kinds.filter(kind => kind !== "icc");
    return { blob, width: bitmap.width, height: bitmap.height, verified: privacyKinds.length === 0 && !scan.animated };
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
