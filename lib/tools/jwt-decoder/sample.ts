// Placeholder Base64URL string in the correct shape; V1 never verifies signatures,
// so this never needs to be a real HMAC output.
const SAMPLE_SIGNATURE = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function encodeBase64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildSampleJwt(nowMs: number = Date.now()): string {
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "1234567890",
    name: "홍길동",
    iss: "https://example.com",
    aud: ["service-a", "service-b"],
    iat,
    exp,
  };
  return `${encodeBase64Url(header)}.${encodeBase64Url(payload)}.${SAMPLE_SIGNATURE}`;
}
