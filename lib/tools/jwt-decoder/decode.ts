export const MAX_INPUT_LENGTH = 1_048_576; // 1MB in UTF-16 code units

export type SegmentDecodeResult =
  | { ok: true; raw: string; value: unknown }
  | { ok: false; raw: string; reason: "base64" | "json" };

export type TokenStructure =
  | { kind: "empty" }
  | { kind: "too-large" }
  | { kind: "too-few-segments"; count: number }
  | { kind: "jwe" }
  | { kind: "unsupported-segment-count"; count: number }
  | { kind: "jws"; header: string; payload: string; signature: string };

export function analyzeStructure(input: string): TokenStructure {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { kind: "empty" };
  if (trimmed.length > MAX_INPUT_LENGTH) return { kind: "too-large" };
  const segments = trimmed.split(".");
  if (segments.length < 3) return { kind: "too-few-segments", count: segments.length };
  if (segments.length === 3) {
    const [header, payload, signature] = segments;
    return { kind: "jws", header, payload, signature };
  }
  if (segments.length === 5) return { kind: "jwe" };
  return { kind: "unsupported-segment-count", count: segments.length };
}

function base64UrlToBytes(segment: string): Uint8Array {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded); // throws DOMException on invalid Base64 characters
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function decodeSegment(segment: string): SegmentDecodeResult {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(segment);
  } catch {
    return { ok: false, raw: segment, reason: "base64" };
  }
  let text: string;
  try {
    // fatal:true rejects malformed UTF-8 instead of silently emitting U+FFFD,
    // so a corrupted payload surfaces as a clear decode error, not garbled text.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, raw: segment, reason: "base64" };
  }
  try {
    const value = JSON.parse(text);
    return { ok: true, raw: segment, value };
  } catch {
    return { ok: false, raw: segment, reason: "json" };
  }
}
