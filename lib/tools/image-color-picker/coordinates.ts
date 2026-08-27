export type RectLike = { left: number; top: number; width: number; height: number };
export function clientPointToPixel(clientX: number, clientY: number, rect: RectLike, sourceWidth: number, sourceHeight: number) {
  if (!(rect.width > 0 && rect.height > 0 && Number.isInteger(sourceWidth) && sourceWidth > 0 && Number.isInteger(sourceHeight) && sourceHeight > 0)) return null;
  const localX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const localY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  return { x: Math.min(sourceWidth - 1, Math.floor(localX / rect.width * sourceWidth)), y: Math.min(sourceHeight - 1, Math.floor(localY / rect.height * sourceHeight)) };
}
export function isValidPixelCoordinate(x: number, y: number, width: number, height: number) { return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height; }
