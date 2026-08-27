import { decodeText, type CharacterEncoding, type EncodingResult } from "./character-encoding";

export type DetectionResult =
  | { ok: true; value: string; encoding: CharacterEncoding; confidence: "bom" | "estimated" | "low" }
  | { ok: false; reason: "ambiguous" | "invalid-bytes" };

function alternatingZeroConfidence(bytes: Uint8Array, zeroParity: 0 | 1) {
  if (bytes.length < 4 || bytes.length % 2 !== 0) return false;
  let zeroes = 0;
  for (let index = zeroParity; index < bytes.length; index += 2) if (bytes[index] === 0) zeroes += 1;
  return zeroes / (bytes.length / 2) >= 0.6;
}

async function detected(bytes: Uint8Array, encoding: CharacterEncoding, confidence: "bom" | "estimated" | "low", strip: number): Promise<DetectionResult> {
  const result: EncodingResult<string> = await decodeText(bytes.subarray(strip), encoding);
  return result.ok ? { ok: true, value: result.value, encoding, confidence } : { ok: false, reason: "invalid-bytes" };
}

export async function detectAndDecode(bytes: Uint8Array): Promise<DetectionResult> {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return detected(bytes, "utf-8", "bom", 3);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return detected(bytes, "utf-16le", "bom", 2);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return detected(bytes, "utf-16be", "bom", 2);
  if (alternatingZeroConfidence(bytes, 1)) return detected(bytes, "utf-16le", "low", 0);
  if (alternatingZeroConfidence(bytes, 0)) return detected(bytes, "utf-16be", "low", 0);
  const utf8 = await decodeText(bytes, "utf-8");
  if (utf8.ok) return { ok: true, value: utf8.value, encoding: "utf-8", confidence: "estimated" };
  return { ok: false, reason: "ambiguous" };
}
