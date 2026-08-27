export type CharacterEncoding = "utf-8" | "utf-16le" | "utf-16be" | "ascii" | "iso-8859-1" | "windows-1252" | "euc-kr" | "shift_jis";
export type EncodingResult<T> = { ok: true; value: T } | { ok: false; reason: "unrepresentable" | "invalid-bytes" | "load-failed" };

function equalBytes(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function singleByteString(bytes: Uint8Array) {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return value;
}

function encodeUtf16(input: string, littleEndian: boolean) {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < input.length; index += 1) view.setUint16(index * 2, input.charCodeAt(index), littleEndian);
  return bytes;
}

function decodeUtf16(bytes: Uint8Array, littleEndian: boolean): EncodingResult<string> {
  if (bytes.length % 2 !== 0) return { ok: false, reason: "invalid-bytes" };
  try {
    const valid = new TextDecoder(littleEndian ? "utf-16le" : "utf-16be", { fatal: true }).decode(bytes);
    return { ok: true, value: valid.replace(/^\uFEFF/, "") };
  } catch {
    return { ok: false, reason: "invalid-bytes" };
  }
}

async function loadIconv() {
  try {
    return await import("iconv-lite");
  } catch {
    return null;
  }
}

export async function encodeText(input: string, encoding: CharacterEncoding): Promise<EncodingResult<Uint8Array>> {
  if (encoding === "utf-8") return { ok: true, value: new TextEncoder().encode(input) };
  if (encoding === "utf-16le") return { ok: true, value: encodeUtf16(input, true) };
  if (encoding === "utf-16be") return { ok: true, value: encodeUtf16(input, false) };
  if (encoding === "ascii") {
    if (Array.from(input).some((character) => (character.codePointAt(0) ?? Infinity) > 0x7f)) return { ok: false, reason: "unrepresentable" };
    return { ok: true, value: Uint8Array.from(input, (character) => character.charCodeAt(0)) };
  }
  if (encoding === "iso-8859-1") {
    if (Array.from(input).some((character) => (character.codePointAt(0) ?? Infinity) > 0xff)) return { ok: false, reason: "unrepresentable" };
    return { ok: true, value: Uint8Array.from(input, (character) => character.charCodeAt(0)) };
  }
  const iconv = await loadIconv();
  if (!iconv) return { ok: false, reason: "load-failed" };
  try {
    const bytes = new Uint8Array(iconv.encode(input, encoding));
    if (iconv.decode(bytes, encoding) !== input) return { ok: false, reason: "unrepresentable" };
    return { ok: true, value: bytes };
  } catch {
    return { ok: false, reason: "unrepresentable" };
  }
}

export async function decodeText(bytes: Uint8Array, encoding: CharacterEncoding): Promise<EncodingResult<string>> {
  if (encoding === "utf-8") {
    try { return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "") }; }
    catch { return { ok: false, reason: "invalid-bytes" }; }
  }
  if (encoding === "utf-16le") return decodeUtf16(bytes, true);
  if (encoding === "utf-16be") return decodeUtf16(bytes, false);
  if (encoding === "ascii") {
    if (bytes.some((byte) => byte > 0x7f)) return { ok: false, reason: "invalid-bytes" };
    return { ok: true, value: singleByteString(bytes) };
  }
  if (encoding === "iso-8859-1") return { ok: true, value: singleByteString(bytes) };
  const iconv = await loadIconv();
  if (!iconv) return { ok: false, reason: "load-failed" };
  try {
    const value = iconv.decode(bytes, encoding);
    const roundTrip = new Uint8Array(iconv.encode(value, encoding));
    if (value.includes("\uFFFD") || !equalBytes(bytes, roundTrip)) return { ok: false, reason: "invalid-bytes" };
    return { ok: true, value };
  } catch {
    return { ok: false, reason: "invalid-bytes" };
  }
}
