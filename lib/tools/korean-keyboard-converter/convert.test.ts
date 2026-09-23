import { describe, expect, it } from "vitest";
import { englishKeysToKorean, koreanToEnglishKeys } from "./convert";

describe("Korean keyboard typo conversion", () => {
  it("restores common English-keyboard typos", () => {
    expect(englishKeysToKorean("dkssudgktpdy")).toBe("안녕하세요");
    expect(englishKeysToKorean("rkatkgkqslek")).toBe("감사합니다");
  });
  it("handles compound vowels, finals, spaces, and punctuation", () => {
    expect(englishKeysToKorean("rhkwk")).toBe("과자");
    expect(englishKeysToKorean("dkswdma")).toBe("앉음");
    expect(englishKeysToKorean("dkssud! 123")).toBe("안녕! 123");
  });
  it("converts Korean back to two-set keyboard strokes", () => {
    expect(koreanToEnglishKeys("안녕하세요")).toBe("dkssudgktpdy");
    expect(koreanToEnglishKeys("과자 앉음!")).toBe("rhkwk dkswdma!");
  });
  it("preserves unrelated characters", () => {
    expect(englishKeysToKorean("hello@example.com")).toBe("ㅗ디ㅣㅐ@ㄷㅌ므ㅔㅣㄷ.채ㅡ");
    expect(koreanToEnglishKeys("ABC 123")).toBe("ABC 123");
  });
});
