import { describe, expect, it } from "vitest";
import { outputExtension, outputFilename, outputMime } from "./render";

describe("image watermark output", () => {
  it("keeps the source type when requested", () => {
    expect(outputMime("image/png", "original")).toBe("image/png");
    expect(outputMime("image/png", "image/jpeg")).toBe("image/jpeg");
  });
  it("maps MIME types to file extensions", () => {
    expect(outputExtension("image/jpeg")).toBe("jpg");
    expect(outputExtension("image/png")).toBe("png");
    expect(outputExtension("image/webp")).toBe("webp");
  });
  it("creates safe result filenames", () => {
    expect(outputFilename("photo.original.png", "image/webp")).toBe("photo.original-watermarked.webp");
    expect(outputFilename("bad:name?.jpg", "image/jpeg")).toBe("bad-name--watermarked.jpg");
    expect(outputFilename(".png", "image/png")).toBe("watermarked-image.png");
  });
});
