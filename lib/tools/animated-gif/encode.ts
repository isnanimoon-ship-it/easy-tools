import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { fitFrame, normalizeFrameDelay } from "./layout";
import { MAX_OUTPUT_FRAME_PIXELS, type GifFrameSource, type GifSettings } from "./types";

export async function encodeAnimatedGif(frames: GifFrameSource[], settings: GifSettings): Promise<Blob> {
  if (frames.length < 2) throw new Error("At least two frames are required.");
  if (settings.width * settings.height * frames.length > MAX_OUTPUT_FRAME_PIXELS) throw new Error("Output pixel limit exceeded.");

  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");
  const gif = GIFEncoder();

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    context.save();
    context.fillStyle = settings.background;
    context.fillRect(0, 0, settings.width, settings.height);
    const rect = fitFrame(frame.bitmap.width, frame.bitmap.height, settings.width, settings.height, settings.fit);
    context.drawImage(frame.bitmap, rect.x, rect.y, rect.width, rect.height);
    context.restore();
    const rgba = context.getImageData(0, 0, settings.width, settings.height).data;
    const palette = quantize(rgba, settings.colors, { format: "rgb565" });
    const indexed = applyPalette(rgba, palette, "rgb565");
    gif.writeFrame(indexed, settings.width, settings.height, {
      palette,
      delay: normalizeFrameDelay(frame.durationMs),
      repeat: index === 0 ? settings.repeat : undefined,
    });
    await new Promise<void>(resolve => window.setTimeout(resolve, 0));
  }
  gif.finish();
  const bytes = gif.bytes();
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  canvas.width = 0;
  canvas.height = 0;
  return new Blob([output], { type: "image/gif" });
}
