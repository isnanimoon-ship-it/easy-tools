import type { FrameFit } from "./types";

export type DrawRect = { x: number; y: number; width: number; height: number };

export function fitFrame(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: FrameFit): DrawRect {
  if (![sourceWidth, sourceHeight, targetWidth, targetHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("Dimensions must be positive finite numbers.");
  }
  const scale = fit === "contain"
    ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

export function clampGifDimension(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(1600, Math.round(value)));
}

export function normalizeFrameDelay(value: number) {
  if (!Number.isFinite(value)) return 500;
  return Math.max(20, Math.min(10_000, Math.round(value / 10) * 10));
}

