import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "./base64";

describe("Base64 byte conversion", () => {
  it.each([[[], ""], [[0x66], "Zg=="], [[0x66,0x6f], "Zm8="], [[0x66,0x6f,0x6f], "Zm9v"]])("encodes byte boundaries", (bytes, expected) => expect(encodeBase64(Uint8Array.from(bytes))).toBe(expected));
  it("accepts padded, unpadded, and ASCII whitespace input", () => {
    for (const input of ["Zm8=", "Zm8", " Zm\n8=\t"]) { const result=decodeBase64(input); expect(result.ok && Array.from(result.bytes)).toEqual([102,111]); }
  });
  it.each(["A", "Zm-8", "Zm_8", "Z=m8", "Zg===", "Zh==", "한글"])("rejects invalid or noncanonical Base64: %s", (input) => expect(decodeBase64(input).ok).toBe(false));
  it("round trips a large byte array without argument overflow", () => { const bytes=new Uint8Array(1024*1024).map((_,i)=>i%256); const decoded=decodeBase64(encodeBase64(bytes)); expect(decoded.ok && decoded.bytes).toEqual(bytes); });
});
