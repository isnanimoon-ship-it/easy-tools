import type { ImageMime } from "@/lib/tools/image-compressor/file-validation";
import { placementPoint, rotatedBounds, tilePoints, type Size } from "./layout";
import type { WatermarkSettings } from "./types";

const FONT_STACK = { sans: "system-ui, sans-serif", serif: "serif", mono: "ui-monospace, monospace" } as const;

export function outputMime(input: ImageMime, selected: WatermarkSettings["outputMime"]): ImageMime { return selected === "original" ? input : selected; }
export function outputExtension(mime: ImageMime) { return mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp"; }
export function outputFilename(name: string, mime: ImageMime) {
  const base = name.replace(/\.[^.]*$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim();
  return `${base ? `${base}-watermarked` : "watermarked-image"}.${outputExtension(mime)}`;
}

function textMetrics(context: CanvasRenderingContext2D, settings: WatermarkSettings, size: Size) {
  const fontSize = Math.max(8, Math.round(Math.min(size.width, size.height) * settings.sizePercent / 100));
  context.font = `${settings.bold ? 700 : 400} ${fontSize}px ${FONT_STACK[settings.fontFamily]}`;
  const lines = settings.text.split("\n");
  const lineHeight = fontSize * 1.2;
  const width = Math.max(...lines.map(line => context.measureText(line || " ").width));
  return { lines, fontSize, lineHeight, width, height: lineHeight * lines.length };
}

export function drawWatermarked(context: CanvasRenderingContext2D, base: CanvasImageSource, logo: CanvasImageSource | null, settings: WatermarkSettings, size: Size) {
  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(base, 0, 0, size.width, size.height);
  context.save();
  context.globalAlpha = settings.opacity / 100;

  let item: Size;
  let drawItem: (point: { x: number; y: number }) => void;
  if (settings.mode === "image" && logo) {
    const source = logo as { width: number; height: number };
    const width = Math.min(size.width, size.height) * settings.imageSizePercent / 100;
    const height = width * source.height / source.width;
    item = { width, height };
    drawItem = ({ x, y }) => { context.save(); context.translate(x, y); context.rotate(settings.rotation * Math.PI / 180); context.drawImage(logo, -width / 2, -height / 2, width, height); context.restore(); };
  } else {
    const metrics = textMetrics(context, settings, size);
    item = { width: metrics.width, height: metrics.height };
    drawItem = ({ x, y }) => {
      context.save(); context.translate(x, y); context.rotate(settings.rotation * Math.PI / 180);
      context.textAlign = "center"; context.textBaseline = "middle"; context.fillStyle = settings.color;
      if (settings.effect === "shadow") { context.shadowColor = "rgba(0,0,0,.75)"; context.shadowBlur = Math.max(2, metrics.fontSize * 0.12); context.shadowOffsetX = metrics.fontSize * 0.06; context.shadowOffsetY = metrics.fontSize * 0.06; }
      if (settings.effect === "background") { const pad = metrics.fontSize * 0.35; context.fillStyle = "rgba(0,0,0,.55)"; context.fillRect(-metrics.width / 2 - pad, -metrics.height / 2 - pad, metrics.width + pad * 2, metrics.height + pad * 2); context.fillStyle = settings.color; }
      metrics.lines.forEach((line, index) => context.fillText(line, 0, (index - (metrics.lines.length - 1) / 2) * metrics.lineHeight));
      context.restore();
    };
  }

  const bounds = rotatedBounds(item, settings.rotation);
  if (settings.repeat) tilePoints(size, bounds, settings.gapPercent / 100).forEach(drawItem);
  else drawItem(placementPoint(size, bounds, settings.position, Math.min(size.width, size.height) * settings.marginPercent / 100));
  context.restore();
}

export async function renderWatermark(base: ImageBitmap, logo: ImageBitmap | null, settings: WatermarkSettings, inputMime: ImageMime) {
  const canvas = document.createElement("canvas"); canvas.width = base.width; canvas.height = base.height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("canvas-unavailable");
  const mime = outputMime(inputMime, settings.outputMime);
  drawWatermarked(context, base, logo, settings, { width: canvas.width, height: canvas.height });
  if (mime === "image/jpeg") { context.globalCompositeOperation = "destination-over"; context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.globalCompositeOperation = "source-over"; }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, mime === "image/png" ? undefined : settings.quality / 100));
  canvas.width = 0; canvas.height = 0;
  if (!blob || blob.type !== mime) throw new Error("encode-failed");
  const check = await createImageBitmap(blob); try { if (check.width !== base.width || check.height !== base.height) throw new Error("decode-failed"); } finally { check.close(); }
  return { blob, mime, width: base.width, height: base.height };
}
