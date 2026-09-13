export const MAX_HWP_FILE_BYTES = 25 * 1024 * 1024;

export type PreflightFormat = "hwp" | "hwpx";
export type PreflightResult =
  | { ok: true; format: PreflightFormat; limited: boolean }
  | { ok: false; code: "unsupported-extension" | "file-too-large" | "invalid-signature" | "empty-file" | "archive-limit" };

const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export function detectDocument(fileName: string, bytes: Uint8Array, size: number): PreflightResult {
  if (size === 0) return { ok: false, code: "empty-file" };
  if (size > MAX_HWP_FILE_BYTES) return { ok: false, code: "file-too-large" };

  const extension = fileName.toLocaleLowerCase().split(".").pop();
  if (extension !== "hwp" && extension !== "hwpx") return { ok: false, code: "unsupported-extension" };

  if (extension === "hwp") {
    const isCfb = CFB_SIGNATURE.every((value, index) => bytes[index] === value);
    return isCfb ? { ok: true, format: "hwp", limited: true } : { ok: false, code: "invalid-signature" };
  }

  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2] ?? -1);
  if (!isZip) return { ok: false, code: "invalid-signature" };
  if (bytes.length === size) {
    const archive = inspectHwpxArchive(bytes);
    if (!archive.ok) return archive;
  }
  return { ok: true, format: "hwpx", limited: false };
}

const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_ARCHIVE_BYTES = 150 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 50 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1_000;

export function inspectHwpxArchive(bytes: Uint8Array): { ok: true } | { ok: false; code: "invalid-signature" | "archive-limit" } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) return { ok: false, code: "invalid-signature" };
  const entries = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) return { ok: false, code: "archive-limit" };
  if (entries === 0 || entries > MAX_ARCHIVE_ENTRIES || directoryOffset + directorySize > bytes.length) return { ok: false, code: entries > MAX_ARCHIVE_ENTRIES ? "archive-limit" : "invalid-signature" };

  let offset = directoryOffset;
  let expanded = 0;
  let hasMimetype = false;
  let hasContent = false;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) return { ok: false, code: "invalid-signature" };
    const compressed = view.getUint32(offset + 20, true);
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > bytes.length) return { ok: false, code: "invalid-signature" };
    let name: string;
    try { name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)).replaceAll("\\", "/"); }
    catch { return { ok: false, code: "invalid-signature" }; }
    if (name.startsWith("/") || name.split("/").includes("..") || name.includes("\0")) return { ok: false, code: "invalid-signature" };
    expanded += uncompressed;
    if (uncompressed > MAX_ARCHIVE_ENTRY_BYTES || expanded > MAX_ARCHIVE_BYTES || (uncompressed > 0 && (compressed === 0 || uncompressed / compressed > MAX_COMPRESSION_RATIO))) return { ok: false, code: "archive-limit" };
    if (name === "mimetype") hasMimetype = true;
    if (name.toLocaleLowerCase() === "contents/content.hpf") hasContent = true;
    offset = next;
  }
  return hasMimetype && hasContent ? { ok: true } : { ok: false, code: "invalid-signature" };
}

export function formatBytes(bytes: number, locale: string) {
  const mib = bytes / 1024 / 1024;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(mib)} MiB`;
}
