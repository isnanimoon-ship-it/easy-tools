import type { PDFDocument } from "pdf-lib";

export type PageSize = "a4" | "letter";
export type Orientation = "portrait" | "landscape";
export type Margin = "normal" | "none";

const PAGE_POINTS: Record<PageSize, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
export const MAX_IMAGES = 20;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_TOTAL_PIXELS = 120_000_000;

export function pageGeometry(size: PageSize, orientation: Orientation, margin: Margin, imageWidth: number, imageHeight: number) {
  const [short, long] = PAGE_POINTS[size];
  const width = orientation === "portrait" ? short : long;
  const height = orientation === "portrait" ? long : short;
  const inset = margin === "normal" ? 28.35 : 0; // 10 mm
  const scale = Math.min((width - inset * 2) / imageWidth, (height - inset * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  return { width, height, x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, drawWidth, drawHeight };
}

export async function renderJpeg(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob || blob.type !== "image/jpeg") throw new Error("jpeg-unavailable");
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: bitmap.width, height: bitmap.height };
  } finally { bitmap.close(); }
}

export async function addImagePage(doc: PDFDocument, jpeg: Uint8Array, imageWidth: number, imageHeight: number, size: PageSize, orientation: Orientation, margin: Margin) {
  const image = await doc.embedJpg(jpeg);
  const geometry = pageGeometry(size, orientation, margin, imageWidth, imageHeight);
  const page = doc.addPage([geometry.width, geometry.height]);
  page.drawImage(image, { x: geometry.x, y: geometry.y, width: geometry.drawWidth, height: geometry.drawHeight });
}
