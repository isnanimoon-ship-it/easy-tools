import type { ContainerInspection, MetadataKind, SupportedImageMime } from "./types";

const unique = (values: MetadataKind[]) => [...new Set(values)];
const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
const u16be = (b: Uint8Array, p: number) => (b[p] << 8) | b[p + 1];
const u32be = (b: Uint8Array, p: number) => ((b[p] * 0x1000000) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3]) >>> 0;
const u32le = (b: Uint8Array, p: number) => (b[p] + (b[p + 1] << 8) + (b[p + 2] << 16) + (b[p + 3] * 0x1000000)) >>> 0;

export function inspectContainer(bytes: Uint8Array, mime: SupportedImageMime): ContainerInspection {
  if (mime === "image/jpeg") return inspectJpeg(bytes);
  if (mime === "image/png") return inspectPng(bytes);
  return inspectWebp(bytes);
}

function inspectJpeg(bytes: Uint8Array): ContainerInspection {
  const kinds: MetadataKind[] = [];
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { kinds, animated: false };
  let p = 2;
  while (p + 3 < bytes.length) {
    if (bytes[p] !== 0xff) break;
    while (bytes[p] === 0xff) p++;
    const marker = bytes[p++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (p + 2 > bytes.length) break;
    const length = u16be(bytes, p);
    if (length < 2 || p + length > bytes.length) break;
    const data = p + 2;
    const head = ascii(bytes, data, Math.min(p + length, data + 40));
    if (marker === 0xe1 && head.startsWith("Exif\0\0")) kinds.push("exif");
    else if (marker === 0xe1 && (head.startsWith("http://ns.adobe.com/xap/1.0/") || head.startsWith("http://ns.adobe.com/xmp/extension/"))) kinds.push("xmp");
    else if (marker === 0xed) kinds.push("iptc");
    else if (marker === 0xe2 && head.startsWith("ICC_PROFILE\0")) kinds.push("icc");
    else if (marker === 0xfe) kinds.push("comment");
    p += length;
  }
  return { kinds: unique(kinds), animated: false };
}

function inspectPng(bytes: Uint8Array): ContainerInspection {
  const kinds: MetadataKind[] = [];
  let animated = false;
  let p = 8;
  while (p + 12 <= bytes.length) {
    const length = u32be(bytes, p);
    if (length > bytes.length - p - 12) break;
    const type = ascii(bytes, p + 4, p + 8);
    if (type === "eXIf") kinds.push("exif");
    else if (["tEXt", "zTXt", "iTXt"].includes(type)) {
      const payload = ascii(bytes, p + 8, Math.min(p + 8 + length, p + 72));
      kinds.push(type === "iTXt" && payload.startsWith("XML:com.adobe.xmp\0") ? "xmp" : "text");
    }
    else if (type === "iCCP") kinds.push("icc");
    else if (type === "acTL") animated = true;
    p += length + 12;
    if (type === "IEND") break;
  }
  return { kinds: unique(kinds), animated };
}

function inspectWebp(bytes: Uint8Array): ContainerInspection {
  const kinds: MetadataKind[] = [];
  let animated = false;
  let p = 12;
  while (p + 8 <= bytes.length) {
    const type = ascii(bytes, p, p + 4);
    const length = u32le(bytes, p + 4);
    if (length > bytes.length - p - 8) break;
    if (type === "EXIF") kinds.push("exif");
    else if (type === "XMP ") kinds.push("xmp");
    else if (type === "ICCP") kinds.push("icc");
    else if (type === "ANIM" || type === "ANMF") animated = true;
    p += 8 + length + (length % 2);
  }
  return { kinds: unique(kinds), animated };
}
