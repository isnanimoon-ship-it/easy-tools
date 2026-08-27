import { describe, expect, it } from "vitest";
import { createThumbnailUrl, isUsableThumbnail, THUMBNAIL_VARIANTS } from "./thumbnails";

describe("thumbnail helpers", () => {
  it("creates fixed HTTPS CDN URLs in display order", () => {
    expect(THUMBNAIL_VARIANTS.map((item) => createThumbnailUrl("dQw4w9WgXcQ", item.filename))).toEqual([
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", "https://i.ytimg.com/vi/dQw4w9WgXcQ/sddefault.jpg",
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
    ]);
  });
  it("rejects IDs and filenames outside the allowlists", () => {
    expect(() => createThumbnailUrl("../bad", "default.jpg")).toThrow();
    expect(() => createThumbnailUrl("dQw4w9WgXcQ", "evil.jpg" as never)).toThrow();
  });
  it("requires both natural dimensions and rejects 120x90 placeholders", () => {
    expect(isUsableThumbnail(THUMBNAIL_VARIANTS[0], 1280, 720)).toBe(true);
    expect(isUsableThumbnail(THUMBNAIL_VARIANTS[0], 1280, 90)).toBe(false);
    expect(isUsableThumbnail(THUMBNAIL_VARIANTS[0], 120, 90)).toBe(false);
  });
});
