export type Base64DecodeResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "invalid-base64" };

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return binary;
}

export function encodeBase64(bytes: Uint8Array) {
  return btoa(bytesToBinary(bytes));
}

export function decodeBase64(input: string): Base64DecodeResult {
  const normalized = input.replace(/[\u0009\u000a\u000d\u0020]/g, "");
  if (normalized === "") return { ok: true, bytes: new Uint8Array() };
  if (/[^A-Za-z0-9+/=]/.test(normalized) || normalized.length % 4 === 1) {
    return { ok: false, reason: "invalid-base64" };
  }
  const firstPadding = normalized.indexOf("=");
  if (firstPadding !== -1 && (!/^={1,2}$/.test(normalized.slice(firstPadding)) || firstPadding < normalized.length - 2)) {
    return { ok: false, reason: "invalid-base64" };
  }
  const unpadded = normalized.replace(/=+$/, "");
  const padded = unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (encodeBase64(bytes).replace(/=+$/, "") !== unpadded) {
      return { ok: false, reason: "invalid-base64" };
    }
    return { ok: true, bytes };
  } catch {
    return { ok: false, reason: "invalid-base64" };
  }
}
