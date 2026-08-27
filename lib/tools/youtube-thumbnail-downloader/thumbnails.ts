export const THUMBNAIL_VARIANTS = [
  { key: "max", filename: "maxresdefault.jpg", minWidth: 1280, minHeight: 720 },
  { key: "sd", filename: "sddefault.jpg", minWidth: 640, minHeight: 480 },
  { key: "hq", filename: "hqdefault.jpg", minWidth: 480, minHeight: 360 },
  { key: "mq", filename: "mqdefault.jpg", minWidth: 320, minHeight: 180 },
  { key: "default", filename: "default.jpg", minWidth: 120, minHeight: 90 },
] as const;

export type ThumbnailVariant = (typeof THUMBNAIL_VARIANTS)[number];
export type ThumbnailKey = ThumbnailVariant["key"];

export function createThumbnailUrl(videoId: string, filename: ThumbnailVariant["filename"]): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("Invalid video ID");
  if (!THUMBNAIL_VARIANTS.some((variant) => variant.filename === filename)) throw new Error("Invalid thumbnail filename");
  return `https://i.ytimg.com/vi/${videoId}/${filename}`;
}

export function isUsableThumbnail(variant: ThumbnailVariant, width: number, height: number): boolean {
  return width >= variant.minWidth && height >= variant.minHeight;
}
