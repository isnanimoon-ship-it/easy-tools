import { describe, expect, it } from "vitest";
import { decodeText, encodeText, type CharacterEncoding } from "./character-encoding";

async function roundTrip(text: string, encoding: CharacterEncoding) {
  const encoded=await encodeText(text,encoding); expect(encoded.ok).toBe(true); if(!encoded.ok)return;
  const decoded=await decodeText(encoded.value,encoding); expect(decoded).toEqual({ok:true,value:text});
}

describe("character encoding", () => {
  it.each([["Hello 123 !","ascii"],["Héllo","iso-8859-1"],["€ “quote”","windows-1252"],["안녕하세요","euc-kr"],["こんにちは","shift_jis"],["한글 日本語 😀","utf-8"],["한글 😀","utf-16le"],["日本語 😀","utf-16be"]] as const)("round trips %s with %s", roundTrip);
  it("keeps ISO-8859-1 distinct from Windows-1252", async () => {
    const latin=await encodeText("\u0080","iso-8859-1"); const win=await encodeText("€","windows-1252");
    expect(latin.ok && Array.from(latin.value)).toEqual([0x80]); expect(win.ok && Array.from(win.value)).toEqual([0x80]);
    expect((await encodeText("€","iso-8859-1")).ok).toBe(false);
  });
  it.each([["한글","ascii"],["😀","iso-8859-1"],["😀","euc-kr"],["한글","shift_jis"]] as const)("rejects %s when %s cannot represent it", async (text,encoding)=>expect((await encodeText(text,encoding)).ok).toBe(false));
  it("rejects malformed byte sequences", async () => {
    expect((await decodeText(Uint8Array.from([0xff]),"utf-8")).ok).toBe(false);
    expect((await decodeText(Uint8Array.from([0x41]),"utf-16le")).ok).toBe(false);
    expect((await decodeText(Uint8Array.from([0x81]),"shift_jis")).ok).toBe(false);
    expect((await decodeText(Uint8Array.from([0x81]),"euc-kr")).ok).toBe(false);
    expect((await decodeText(Uint8Array.from([0x81]),"windows-1252")).ok).toBe(false);
  });
});
