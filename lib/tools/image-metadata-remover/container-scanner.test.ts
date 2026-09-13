import { describe, expect, it } from "vitest";
import { inspectContainer } from "./container-scanner";

const ascii = (value: string) => [...value].map(char => char.charCodeAt(0));
const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const le32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
const pngChunk = (type: string, data: number[] = []) => [...be32(data.length), ...ascii(type), ...data, 0, 0, 0, 0];
const webpChunk = (type: string, data: number[] = []) => [...ascii(type), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];

describe("image metadata container scanner", () => {
  it("finds JPEG metadata segments and stops safely at scan data", () => {
    const segment = (marker: number, data: number[]) => [0xff, marker, ((data.length + 2) >>> 8) & 255, (data.length + 2) & 255, ...data];
    const bytes = new Uint8Array([0xff, 0xd8, ...segment(0xe1, [...ascii("Exif\0\0"), 1]), ...segment(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0")), ...segment(0xe2, ascii("ICC_PROFILE\0")), ...segment(0xed, [1]), ...segment(0xfe, ascii("note")), 0xff, 0xda]);
    expect(inspectContainer(bytes, "image/jpeg").kinds).toEqual(["exif", "xmp", "icc", "iptc", "comment"]);
  });

  it("finds PNG text, XMP, EXIF, ICC, and animation chunks", () => {
    const bytes = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, ...pngChunk("eXIf"), ...pngChunk("tEXt", ascii("Author\0Kim")), ...pngChunk("iTXt", ascii("XML:com.adobe.xmp\0data")), ...pngChunk("iCCP"), ...pngChunk("acTL"), ...pngChunk("IEND")]);
    expect(inspectContainer(bytes, "image/png")).toEqual({ kinds: ["exif", "text", "xmp", "icc"], animated: true });
  });

  it("finds WebP metadata and animation chunks", () => {
    const body = [...webpChunk("EXIF", [1]), ...webpChunk("XMP ", [2]), ...webpChunk("ICCP", [3]), ...webpChunk("ANIM", [4])];
    const bytes = new Uint8Array([...ascii("RIFF"), ...le32(body.length + 4), ...ascii("WEBP"), ...body]);
    expect(inspectContainer(bytes, "image/webp")).toEqual({ kinds: ["exif", "xmp", "icc"], animated: true });
  });

  it("returns no metadata for clean containers and tolerates truncation", () => {
    expect(inspectContainer(new Uint8Array([0xff, 0xd8, 0xff, 0xda]), "image/jpeg")).toEqual({ kinds: [], animated: false });
    expect(inspectContainer(new Uint8Array([0x89,0x50]), "image/png")).toEqual({ kinds: [], animated: false });
  });
});

