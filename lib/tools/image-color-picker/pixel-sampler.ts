import type { Rgba } from "./color";
export function sampleImagePixel(image: CanvasImageSource, canvas: HTMLCanvasElement, x: number, y: number): Rgba | null {
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb", willReadFrequently: true }); if (!context) return null;
  context.imageSmoothingEnabled = false; context.clearRect(0, 0, 1, 1);
  try { context.drawImage(image, x, y, 1, 1, 0, 0, 1, 1); const data = context.getImageData(0, 0, 1, 1, { colorSpace: "srgb", pixelFormat: "rgba-unorm8" }).data; return {r:data[0],g:data[1],b:data[2],a:data[3]}; } catch { return null; }
}
