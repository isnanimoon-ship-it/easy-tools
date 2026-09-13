import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, validMetadataDimensions, validateMetadataImage } from "./file-validation";

function fake(type: string, bytes: number[], size = bytes.length) {
  return { type, size, slice: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }) as Blob };
}

describe("image metadata input validation", () => {
  it.each([
    ["image/jpeg", [0xff,0xd8,0xff]],
    ["image/png", [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
    ["image/webp", [..."RIFF0000WEBP"].map(char => char.charCodeAt(0))],
  ])("accepts %s with a matching signature", async (type, bytes) => expect(await validateMetadataImage(fake(type, bytes))).toEqual({ ok: true, mime: type }));
  it("rejects unsupported, oversized, and mismatched inputs", async () => {
    expect(await validateMetadataImage(fake("image/gif", [0x47]))).toEqual({ ok: false, reason: "unsupported-format" });
    expect(await validateMetadataImage(fake("image/jpeg", [0xff,0xd8,0xff], MAX_FILE_BYTES + 1))).toEqual({ ok: false, reason: "file-too-large" });
    expect(await validateMetadataImage(fake("image/png", [0xff,0xd8,0xff]))).toEqual({ ok: false, reason: "signature-mismatch" });
  });
  it("applies dimension and pixel limits", () => {
    expect(validMetadataDimensions(6000, 4000)).toBe(true);
    expect(validMetadataDimensions(6001, 4000)).toBe(false);
    expect(validMetadataDimensions(12001, 1)).toBe(false);
    expect(validMetadataDimensions(0, 10)).toBe(false);
  });
});
