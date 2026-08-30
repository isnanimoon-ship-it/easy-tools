import { describe, expect, it } from "vitest";
import { analyzeClaims } from "./claims";
import { analyzeStructure, decodeSegment, MAX_INPUT_LENGTH } from "./decode";
import { prettyJson, tokenizeJson } from "./highlight";
import { buildSampleJwt } from "./sample";

function encodeBase64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const NOW = Date.parse("2026-08-30T12:00:00Z");

describe("analyzeStructure — SPEC section 8/13 pipeline", () => {
  it("treats empty input as idle, not an error", () => {
    expect(analyzeStructure("")).toEqual({ kind: "empty" });
    expect(analyzeStructure("   ")).toEqual({ kind: "empty" });
  });
  it("rejects input over the 1MB hard limit", () => {
    const huge = "a".repeat(MAX_INPUT_LENGTH + 1);
    expect(analyzeStructure(huge)).toEqual({ kind: "too-large" });
  });
  it("flags 1 segment as too few", () => {
    expect(analyzeStructure("abc")).toEqual({ kind: "too-few-segments", count: 1 });
  });
  it("flags 2 segments as too few", () => {
    expect(analyzeStructure("abc.def")).toEqual({ kind: "too-few-segments", count: 2 });
  });
  it("recognizes exactly 3 segments as a JWS", () => {
    expect(analyzeStructure("h.p.s")).toEqual({ kind: "jws", header: "h", payload: "p", signature: "s" });
  });
  it("recognizes exactly 5 segments as JWE", () => {
    expect(analyzeStructure("a.b.c.d.e")).toEqual({ kind: "jwe" });
  });
  it("flags 4 segments as an unsupported count", () => {
    expect(analyzeStructure("a.b.c.d")).toEqual({ kind: "unsupported-segment-count", count: 4 });
  });
  it("flags 6+ segments as an unsupported count", () => {
    expect(analyzeStructure("a.b.c.d.e.f")).toEqual({ kind: "unsupported-segment-count", count: 6 });
  });
});

describe("decodeSegment — Base64URL + UTF-8 + JSON", () => {
  it("decodes a normal ASCII header", () => {
    const segment = encodeBase64Url({ alg: "HS256", typ: "JWT" });
    expect(decodeSegment(segment)).toEqual({ ok: true, raw: segment, value: { alg: "HS256", typ: "JWT" } });
  });
  it("decodes Korean payload text without producing replacement characters", () => {
    const segment = encodeBase64Url({ name: "홍길동" });
    const result = decodeSegment(segment);
    expect(result).toEqual({ ok: true, raw: segment, value: { name: "홍길동" } });
    expect(JSON.stringify(result)).not.toContain("�");
  });
  it("decodes Japanese payload text correctly", () => {
    const segment = encodeBase64Url({ name: "田中" });
    expect(decodeSegment(segment)).toEqual({ ok: true, raw: segment, value: { name: "田中" } });
  });
  it("decodes emoji payload text correctly", () => {
    const segment = encodeBase64Url({ mood: "\u{1F600}" });
    expect(decodeSegment(segment)).toEqual({ ok: true, raw: segment, value: { mood: "\u{1F600}" } });
  });
  it("fails with reason base64 on invalid Base64URL characters", () => {
    const result = decodeSegment("not-valid-base64!!!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("base64");
  });
  it("fails with reason base64 on malformed UTF-8 byte sequences", () => {
    // A lone continuation byte (0x80) is invalid UTF-8 on its own.
    const invalidUtf8 = btoa(String.fromCharCode(0x80)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const result = decodeSegment(invalidUtf8);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("base64");
  });
  it("fails with reason json when the decoded text is not valid JSON", () => {
    const rawText = "not json at all";
    const bytes = new TextEncoder().encode(rawText);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const notJsonSegment = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const result = decodeSegment(notJsonSegment);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("json");
  });
  it("decodes nested objects and arrays", () => {
    const segment = encodeBase64Url({ roles: ["admin", "user"], meta: { level: 2 } });
    const result = decodeSegment(segment);
    expect(result).toEqual({
      ok: true,
      raw: segment,
      value: { roles: ["admin", "user"], meta: { level: 2 } },
    });
  });
});

describe("analyzeClaims — SPEC section 7/19 time analysis", () => {
  it("returns null for a non-object payload", () => {
    expect(analyzeClaims("just a string", NOW)).toBeNull();
    expect(analyzeClaims(["array"], NOW)).toBeNull();
    expect(analyzeClaims(null, NOW)).toBeNull();
  });
  it("reports exp absent as status none", () => {
    const analysis = analyzeClaims({}, NOW);
    expect(analysis?.exp).toEqual({ present: false });
    expect(analysis?.expirationStatus).toBe("none");
  });
  it("reports an exp one hour in the future as not-expired, with a matching relative time", () => {
    const oneHourLater = Math.floor(NOW / 1000) + 3600;
    const analysis = analyzeClaims({ exp: oneHourLater }, NOW, "ko");
    expect(analysis?.expirationStatus).toBe("not-expired");
    expect(analysis?.exp).toMatchObject({ present: true, valid: true, seconds: oneHourLater });
    if (analysis?.exp.present && analysis.exp.valid) {
      expect(analysis.exp.relative).toContain("1시간");
      expect(analysis.exp.utc).toBe("2026-08-30 13:00:00 UTC");
    }
  });
  it("reports an exp one hour in the past as expired", () => {
    const oneHourAgo = Math.floor(NOW / 1000) - 3600;
    const analysis = analyzeClaims({ exp: oneHourAgo }, NOW, "ko");
    expect(analysis?.expirationStatus).toBe("expired");
    if (analysis?.exp.present && analysis.exp.valid) {
      expect(analysis.exp.relative).toContain("1시간");
    }
  });
  it("treats a non-numeric exp as present but invalid, never NaN/Invalid Date leaking through", () => {
    const analysis = analyzeClaims({ exp: "not-a-number" }, NOW);
    expect(analysis?.exp).toEqual({ present: true, valid: false });
    expect(analysis?.expirationStatus).toBe("invalid");
  });
  it("reports nbf in the future as not-yet-active", () => {
    const future = Math.floor(NOW / 1000) + 60;
    const analysis = analyzeClaims({ nbf: future }, NOW);
    expect(analysis?.notBeforeStatus).toBe("not-yet-active");
  });
  it("reports nbf in the past or now as active", () => {
    const past = Math.floor(NOW / 1000) - 60;
    const analysis = analyzeClaims({ nbf: past }, NOW);
    expect(analysis?.notBeforeStatus).toBe("active");
  });
  it("flags an iat in the future without treating the token as invalid", () => {
    const future = Math.floor(NOW / 1000) + 60;
    const analysis = analyzeClaims({ iat: future }, NOW);
    expect(analysis?.iatInFuture).toBe(true);
  });
  it("does not flag a past iat as future", () => {
    const past = Math.floor(NOW / 1000) - 60;
    const analysis = analyzeClaims({ iat: past }, NOW);
    expect(analysis?.iatInFuture).toBe(false);
  });
  it("passes through iss/sub/jti as-is", () => {
    const analysis = analyzeClaims({ iss: "https://issuer.example", sub: "user-1", jti: "abc-123" }, NOW);
    expect(analysis?.iss).toBe("https://issuer.example");
    expect(analysis?.sub).toBe("user-1");
    expect(analysis?.jti).toBe("abc-123");
  });
  it("handles aud as a string", () => {
    const analysis = analyzeClaims({ aud: "my-api" }, NOW);
    expect(analysis?.aud).toBe("my-api");
  });
  it("handles aud as an array", () => {
    const analysis = analyzeClaims({ aud: ["service-a", "service-b"] }, NOW);
    expect(analysis?.aud).toEqual(["service-a", "service-b"]);
  });
});

describe("tokenizeJson — SPEC section 6 (no HTML strings, round-trips exactly)", () => {
  it("round-trips a simple object back to the exact original text", () => {
    const pretty = prettyJson({ alg: "HS256", typ: "JWT" });
    const tokens = tokenizeJson(pretty);
    expect(tokens.map((t) => t.text).join("")).toBe(pretty);
  });
  it("classifies keys, strings, numbers, booleans, and null correctly", () => {
    const pretty = prettyJson({ name: "Kim", age: 30, active: true, note: null });
    const tokens = tokenizeJson(pretty);
    expect(tokens.some((t) => t.type === "key" && t.text.startsWith('"name"'))).toBe(true);
    expect(tokens.some((t) => t.type === "string" && t.text === '"Kim"')).toBe(true);
    expect(tokens.some((t) => t.type === "number" && t.text === "30")).toBe(true);
    expect(tokens.some((t) => t.type === "boolean" && t.text === "true")).toBe(true);
    expect(tokens.some((t) => t.type === "null" && t.text === "null")).toBe(true);
  });
  it("never produces a token containing raw HTML — a script-like string stays a single string token", () => {
    const pretty = prettyJson({ evil: "<script>alert(1)</script>" });
    const tokens = tokenizeJson(pretty);
    const stringToken = tokens.find((t) => t.type === "string" && t.text.includes("script"));
    expect(stringToken?.text).toBe('"<script>alert(1)</script>"');
    expect(tokens.map((t) => t.text).join("")).toBe(pretty);
  });
  it("round-trips a string value containing an escaped quote", () => {
    const pretty = prettyJson({ quote: 'she said \\"hi\\"' });
    const tokens = tokenizeJson(pretty);
    expect(tokens.map((t) => t.text).join("")).toBe(pretty);
  });
});

describe("buildSampleJwt — SPEC section 12", () => {
  it("produces a well-formed 3-segment token that decodes back to the expected shape", () => {
    const jwt = buildSampleJwt(NOW);
    const structure = analyzeStructure(jwt);
    expect(structure.kind).toBe("jws");
    if (structure.kind !== "jws") return;
    const header = decodeSegment(structure.header);
    const payload = decodeSegment(structure.payload);
    expect(header).toEqual({ ok: true, raw: structure.header, value: { alg: "HS256", typ: "JWT" } });
    expect(payload.ok).toBe(true);
    if (payload.ok) {
      const value = payload.value as { iat: number; exp: number; name: string };
      expect(value.exp - value.iat).toBe(3600);
      expect(value.iat).toBe(Math.floor(NOW / 1000));
      expect(value.name).toBe("홍길동");
    }
  });
  it("always reports as not-expired regardless of when it is generated", () => {
    const jwt = buildSampleJwt(NOW);
    const structure = analyzeStructure(jwt);
    if (structure.kind !== "jws") throw new Error("expected jws");
    const payload = decodeSegment(structure.payload);
    if (!payload.ok) throw new Error("expected payload decode success");
    const analysis = analyzeClaims(payload.value, NOW);
    expect(analysis?.expirationStatus).toBe("not-expired");
  });
});

describe("end-to-end pipeline via a hand-built JWT", () => {
  it("decodes header and payload independently — a broken header does not block a valid payload", () => {
    const payloadSegment = encodeBase64Url({ sub: "123" });
    const jwt = `not-valid-base64!!!.${payloadSegment}.sig`;
    const structure = analyzeStructure(jwt);
    expect(structure.kind).toBe("jws");
    if (structure.kind !== "jws") return;
    const header = decodeSegment(structure.header);
    const payload = decodeSegment(structure.payload);
    expect(header.ok).toBe(false);
    expect(payload).toEqual({ ok: true, raw: structure.payload, value: { sub: "123" } });
  });
});
