export function clampCropHeight(
  height: number,
  imageHeight: number,
  maxCropHeight: number,
) {
  return Math.max(0, Math.min(Math.round(height), maxCropHeight, imageHeight - 1));
}
export function maxCropHeightFor(imageHeight: number) {
  return Math.min(200, Math.round(imageHeight * 0.15));
}
export function clientYToImageY(
  clientY: number,
  bounds: { top: number; height: number },
  imageHeight: number,
) {
  if (bounds.height <= 0) return null;
  return Math.max(
    0,
    Math.min(
      imageHeight,
      Math.round(((clientY - bounds.top) / bounds.height) * imageHeight),
    ),
  );
}
