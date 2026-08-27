import { describe, expect, it } from "vitest";

import { countText } from "./count-text";

describe("countText", () => {
  it("returns zero for empty input", () => {
    expect(countText("", "en")).toEqual({
      characters: 0,
      charactersWithoutWhitespace: 0,
      words: 0,
      lines: 0,
    });
  });

  it.each([
    ["Hello world", "en", 11, 10, 2, 1],
    ["안녕 세상", "ko", 5, 4, 2, 1],
    ["one\ntwo\n", "en", 8, 6, 2, 3],
    ["a\r\nb", "en", 3, 2, 2, 2],
    ["a\rb", "en", 3, 2, 2, 2],
  ])(
    "counts %j using the approved rules",
    (text, locale, characters, withoutWhitespace, words, lines) => {
      expect(countText(text, locale)).toEqual({
        characters,
        charactersWithoutWhitespace: withoutWhitespace,
        words,
        lines,
      });
    },
  );

  it("excludes every Unicode whitespace character from the second metric", () => {
    expect(countText(" \t\n\u00a0", "en")).toEqual({
      characters: 4,
      charactersWithoutWhitespace: 0,
      words: 0,
      lines: 2,
    });
  });

  it("counts user-perceived graphemes rather than UTF-16 code units", () => {
    expect(countText("e\u0301", "en").characters).toBe(1);
    expect(countText("👩🏽‍💻", "en").characters).toBe(1);
  });

  it("uses locale-aware Japanese word segmentation", () => {
    const text = "今日は晴れです";
    const expected = Array.from(
      new Intl.Segmenter("ja", { granularity: "word" }).segment(text),
    ).filter((part) => part.isWordLike).length;

    expect(countText(text, "ja").words).toBe(expected);
  });

  it("handles a large input without changing its result", () => {
    const text = "a".repeat(100_000);
    expect(countText(text, "en")).toEqual({
      characters: 100_000,
      charactersWithoutWhitespace: 100_000,
      words: 1,
      lines: 1,
    });
  });
});
