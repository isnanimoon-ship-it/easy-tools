import { describe, expect, it } from "vitest";
import { charCount, convertText, toInitial } from "./convert";

const keep = { removeWhitespace: false };
const strip = { removeWhitespace: true };

describe("toInitial", () => {
  it("maps the first and last Hangul syllables correctly", () => {
    expect(toInitial("가".codePointAt(0)!)).toBe("ㄱ");
    expect(toInitial("힣".codePointAt(0)!)).toBe("ㅎ");
  });
  it("returns null outside the Hangul syllable range", () => {
    expect(toInitial("A".codePointAt(0)!)).toBeNull();
    expect(toInitial("1".codePointAt(0)!)).toBeNull();
    expect(toInitial("ㄱ".codePointAt(0)!)).toBeNull(); // compatibility jamo, not a syllable
  });
});

describe("convertText — SPEC section 14 QA scenarios", () => {
  it("1. 가나다 -> ㄱㄴㄷ", () => {
    expect(convertText("가나다", keep)).toBe("ㄱㄴㄷ");
  });
  it("2. 안녕하세요 -> ㅇㄴㅎㅅㅇ", () => {
    expect(convertText("안녕하세요", keep)).toBe("ㅇㄴㅎㅅㅇ");
  });
  it("3. 까따빠 -> ㄲㄸㅃ (double consonants)", () => {
    expect(convertText("까따빠", keep)).toBe("ㄲㄸㅃ");
  });
  it("4. 쌀 -> ㅆ", () => {
    expect(convertText("쌀", keep)).toBe("ㅆ");
  });
  it("5. 대한민국 -> ㄷㅎㅁㄱ", () => {
    expect(convertText("대한민국", keep)).toBe("ㄷㅎㅁㄱ");
  });
  it("6. 오늘 날씨 좋다 -> ㅇㄴ ㄴㅆ ㅈㄷ (whitespace kept by default)", () => {
    expect(convertText("오늘 날씨 좋다", keep)).toBe("ㅇㄴ ㄴㅆ ㅈㄷ");
  });
  it("7. ABC 가나다 -> ABC ㄱㄴㄷ (Latin preserved)", () => {
    expect(convertText("ABC 가나다", keep)).toBe("ABC ㄱㄴㄷ");
  });
  it("8. 123 가나다 -> 123 ㄱㄴㄷ (digits preserved)", () => {
    expect(convertText("123 가나다", keep)).toBe("123 ㄱㄴㄷ");
  });
  it("9. 안녕! -> ㅇㄴ! (punctuation stays attached, no inserted spacing)", () => {
    expect(convertText("안녕!", keep)).toBe("ㅇㄴ!");
  });
  it("10. 안녕😀 -> ㅇㄴ😀 (emoji preserved, code-point safe)", () => {
    expect(convertText("안녕\u{1F600}", keep)).toBe("ㅇㄴ\u{1F600}");
  });
  it("11. multi-line input converts each line independently and keeps line structure", () => {
    expect(convertText("안녕하세요\n오늘 날씨가 좋네요", keep)).toBe("ㅇㄴㅎㅅㅇ\nㅇㄴ ㄴㅆㄱ ㅈㄴㅇ");
  });
  it("12. standalone compatibility jamo (U+3131 block) passes through unchanged", () => {
    expect(convertText("ㄱ나다", keep)).toBe("ㄱㄴㄷ");
    expect(convertText("ㄱㄴㄷ", keep)).toBe("ㄱㄴㄷ");
  });
  it("13. NFD combining jamo sequence normalizes to NFC before conversion", () => {
    const nfd = "가"; // leading consonant U+1100 + vowel U+1161, decomposed form of 가
    const nfc = "가"; // 가, precomposed
    expect(nfd).not.toBe(nfc);
    expect(nfd.normalize("NFC")).toBe(nfc);
    expect(convertText(nfd, keep)).toBe("ㄱ");
  });
  it("14. empty string converts to empty string without error", () => {
    expect(convertText("", keep)).toBe("");
  });
  it("15. handles a 100,000+ character string without throwing", () => {
    const big = "안녕하세요 ".repeat(20_000); // > 100,000 chars
    expect(big.length).toBeGreaterThan(100_000);
    expect(() => convertText(big, keep)).not.toThrow();
    expect(convertText("안녕하세요 ", keep).length).toBe(convertText("안녕하세요", keep).length + 1);
  });
  it("16. whitespace-removal option strips spaces but always preserves newlines", () => {
    expect(convertText("오늘 날씨 좋다", strip)).toBe("ㅇㄴㄴㅆㅈㄷ");
    expect(convertText("안녕하세요\n오늘 날씨가 좋네요", strip)).toBe("ㅇㄴㅎㅅㅇ\nㅇㄴㄴㅆㄱㅈㄴㅇ");
  });
});

describe("whitespace removal edge cases", () => {
  it("also strips NBSP and full-width space", () => {
    expect(convertText("가 나　다", strip)).toBe("ㄱㄴㄷ");
  });
  it("collapses multiple consecutive spaces entirely rather than to one", () => {
    expect(convertText("가   나", strip)).toBe("ㄱㄴ");
  });
});

describe("charCount", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(charCount("안녕")).toBe(2);
    expect(charCount("안녕\u{1F600}")).toBe(3);
    expect("안녕\u{1F600}".length).toBe(4); // UTF-16 length would overcount the emoji
  });
  it("counts an empty string as zero", () => {
    expect(charCount("")).toBe(0);
  });
});
