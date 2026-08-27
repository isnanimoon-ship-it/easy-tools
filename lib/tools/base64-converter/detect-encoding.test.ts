import { describe, expect, it } from "vitest";
import { detectAndDecode } from "./detect-encoding";

describe("automatic encoding detection", () => {
  it("detects UTF BOMs", async () => {
    expect(await detectAndDecode(Uint8Array.from([0xef,0xbb,0xbf,0x41]))).toMatchObject({ok:true,encoding:"utf-8",confidence:"bom",value:"A"});
    expect(await detectAndDecode(Uint8Array.from([0xff,0xfe,0x41,0]))).toMatchObject({ok:true,encoding:"utf-16le",confidence:"bom",value:"A"});
    expect(await detectAndDecode(Uint8Array.from([0xfe,0xff,0,0x41]))).toMatchObject({ok:true,encoding:"utf-16be",confidence:"bom",value:"A"});
  });
  it("uses strict UTF-8 first", async()=>expect(await detectAndDecode(new TextEncoder().encode("한글"))).toMatchObject({ok:true,encoding:"utf-8",confidence:"estimated"}));
  it("only makes low-confidence UTF-16 guesses for strong zero patterns", async()=>expect(await detectAndDecode(Uint8Array.from([0x41,0,0x42,0]))).toMatchObject({ok:true,encoding:"utf-16le",confidence:"low",value:"AB"}));
  it("does not pretend ambiguous legacy bytes are certain", async()=>expect(await detectAndDecode(Uint8Array.from([0xb0,0xa1]))).toEqual({ok:false,reason:"ambiguous"}));
});
