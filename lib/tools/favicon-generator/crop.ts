import type { CropState } from "./types";

export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/**
 * Computes the source rectangle (in the original bitmap's own pixel space)
 * that a normalized {zoom, panX, panY} crop state selects. Deliberately
 * independent of any on-screen preview size — the same state always yields
 * the same rectangle regardless of how large the preview widget is rendered.
 */
export function cropRect(bitmap: { width: number; height: number }, crop: CropState): CropRect {
  const zoom = Math.max(1, crop.zoom);
  const panX = Math.max(-1, Math.min(1, crop.panX));
  const panY = Math.max(-1, Math.min(1, crop.panY));
  const shortSide = Math.min(bitmap.width, bitmap.height);
  const frame = shortSide / zoom;
  const maxPanX = Math.max(0, (bitmap.width - frame) / 2);
  const maxPanY = Math.max(0, (bitmap.height - frame) / 2);
  const cx = bitmap.width / 2 + panX * maxPanX;
  const cy = bitmap.height / 2 + panY * maxPanY;
  return { sx: cx - frame / 2, sy: cy - frame / 2, sw: frame, sh: frame };
}

export function clampCrop(crop: CropState, minZoom = 1, maxZoom = 4): CropState {
  return {
    zoom: Math.max(minZoom, Math.min(maxZoom, crop.zoom)),
    panX: Math.max(-1, Math.min(1, crop.panX)),
    panY: Math.max(-1, Math.min(1, crop.panY)),
  };
}
