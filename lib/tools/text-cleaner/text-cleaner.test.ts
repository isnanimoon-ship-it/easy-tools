import { describe, expect, it } from "vitest";
import { charCount, cleanText } from "./pipeline";
import { DEFAULT_OPTIONS, type TextCleanerOptions } from "./types";
import { buildPresetOptions } from "./presets";
import { exceedsMaxInput, inputByteLength, shouldWarnLargeInput } from "./validation";

function options(overrides: {
  whitespace?: Partial<TextCleanerOptions["whitespace"]>;
  duplicate?: Partial<TextCleanerOptions["duplicate"]>;
} = {}): TextCleanerOptions {
  return {
    whitespace: { ...DEFAULT_OPTIONS.whitespace, ...overrides.whitespace },
    duplicate: { ...DEFAULT_OPTIONS.duplicate, ...overrides.duplicate },
  };
}

const noOp = options({
  whitespace: { collapseSpaces: false, trimLines: false, blankLines: "keep" },
});

describe("charCount", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(charCount("\u{1F600}")).toBe(1);
    expect("\u{1F600}".length).toBe(2);
    expect(charCount("a\u{1F600}b")).toBe(3);
  });
});

describe("newline normalization", () => {
  it("normalizes CRLF and CR to LF before any other processing", () => {
    const result = cleanText("a\r\nb\rc\n", noOp);
    expect(result.text).toBe("a\nb\nc\n");
  });
});

describe("special whitespace conversion", () => {
  it("converts tabs to N spaces only when enabled", () => {
    const result = cleanText("a\tb", options({ whitespace: { tabToSpaces: true, tabSize: 4, collapseSpaces: false, trimLines: false, blankLines: "keep" } }));
    expect(result.text).toBe("a    b");
  });
  it("leaves tabs untouched when disabled", () => {
    const result = cleanText("a\tb", noOp);
    expect(result.text).toBe("a\tb");
  });
  it("converts NBSP and ideographic space to regular space only when enabled", () => {
    const withNbsp = "a b　c";
    const on = cleanText(withNbsp, options({ whitespace: { normalizeSpecialSpaces: true, collapseSpaces: false, trimLines: false, blankLines: "keep" } }));
    expect(on.text).toBe("a b c");
    const off = cleanText(withNbsp, noOp);
    expect(off.text).toBe(withNbsp);
  });
});

describe("collapse consecutive spaces", () => {
  it("collapses only regular-space runs, never tabs or other whitespace", () => {
    const result = cleanText("a   b\tc", options({ whitespace: { collapseSpaces: true, trimLines: false, blankLines: "keep" } }));
    expect(result.text).toBe("a b\tc");
  });
});

describe("per-line trim", () => {
  it("trims leading/trailing whitespace per line when enabled", () => {
    const result = cleanText("  a  \n  b  ", options({ whitespace: { trimLines: true, collapseSpaces: false, blankLines: "keep" } }));
    expect(result.text).toBe("a\nb");
  });
});

describe("blank line handling", () => {
  const lines = "a\n\n\nb\n\nc";
  it("keeps all blank lines under keep mode", () => {
    const result = cleanText(lines, options({ whitespace: { blankLines: "keep", collapseSpaces: false, trimLines: false } }));
    expect(result.text).toBe("a\n\n\nb\n\nc");
  });
  it("collapses consecutive blank lines to at most one", () => {
    const result = cleanText(lines, options({ whitespace: { blankLines: "collapse", collapseSpaces: false, trimLines: false } }));
    expect(result.text).toBe("a\n\nb\n\nc");
  });
  it("removes all blank lines", () => {
    const result = cleanText(lines, options({ whitespace: { blankLines: "remove", collapseSpaces: false, trimLines: false } }));
    expect(result.text).toBe("a\nb\nc");
  });
});

describe("merge to one line", () => {
  it("does not produce double spaces from blank lines between real lines", () => {
    const result = cleanText("a\n\nb\n\n\nc", options({ whitespace: { mergeToOneLine: true, blankLines: "keep", collapseSpaces: true, trimLines: true } }));
    expect(result.text).toBe("a b c");
  });
  it("collapses seams even when trim/collapse are otherwise off", () => {
    const result = cleanText("a \n b", options({ whitespace: { mergeToOneLine: true, blankLines: "keep", collapseSpaces: false, trimLines: false } }));
    expect(result.text).toBe("a b");
  });
  it("reports a single result line and hides duplicate stats", () => {
    const result = cleanText("a\nb\nc", options({ whitespace: { mergeToOneLine: true } }));
    expect(result.mergedToOneLine).toBe(true);
    expect(result.stats.resultLines).toBe(1);
    expect(result.stats.uniqueLines).toBeUndefined();
  });
});

describe("duplicate removal", () => {
  it("keeps the first occurrence by default", () => {
    const result = cleanText("a\nb\na\nc", options({ duplicate: { enabled: true } }));
    expect(result.text).toBe("a\nb\nc");
  });
  it("keeps the last occurrence when configured, preserving original order", () => {
    const result = cleanText("a\nb\na\nc", options({ duplicate: { enabled: true, keep: "last" } }));
    expect(result.text).toBe("b\na\nc");
  });
  it("treats case differently when case-sensitive", () => {
    const result = cleanText("Apple\napple", options({ duplicate: { enabled: true, caseSensitive: true } }));
    expect(result.text).toBe("Apple\napple");
  });
  it("treats case the same when case-insensitive", () => {
    const result = cleanText("Apple\napple", options({ duplicate: { enabled: true, caseSensitive: false } }));
    expect(result.text).toBe("Apple");
  });
  it("ignores surrounding whitespace differences when enabled", () => {
    const result = cleanText("a\n a \nb", options({
      whitespace: { trimLines: false, collapseSpaces: false },
      duplicate: { enabled: true, ignoreSurroundingWhitespace: true },
    }));
    expect(result.text).toBe("a\nb");
  });
  it("does not affect output text, only the comparison key", () => {
    const result = cleanText("Apple\napple", options({ duplicate: { enabled: true, caseSensitive: false } }));
    expect(result.text).toBe("Apple");
  });
  it("ignores inner whitespace differences when enabled", () => {
    const result = cleanText("a  b\na b", options({
      whitespace: { collapseSpaces: false, trimLines: false },
      duplicate: { enabled: true, ignoreInnerWhitespaceDiff: true },
    }));
    expect(result.text).toBe("a  b");
  });
  it("compares using NFC normalization when enabled", () => {
    const composed = "가"; // precomposed Hangul syllable
    const decomposed = "가"; // same syllable as decomposed jamo
    expect(composed).not.toBe(decomposed);
    expect(composed.normalize("NFC")).toBe(decomposed.normalize("NFC"));
    const withNormalize = cleanText(`${composed}\n${decomposed}`, options({ duplicate: { enabled: true, unicodeNormalize: true } }));
    expect(withNormalize.stats.resultLines).toBe(1);
    const withoutNormalize = cleanText(`${composed}\n${decomposed}`, options({ duplicate: { enabled: true, unicodeNormalize: false } }));
    expect(withoutNormalize.stats.resultLines).toBe(2);
  });

  it("filters to duplicates-only, keeping one representative per duplicated key", () => {
    const result = cleanText("a\nb\na\nc\nc", options({ duplicate: { enabled: true, resultType: "duplicatesOnly" } }));
    expect(result.text).toBe("a\nc");
  });
  it("filters to once-only lines", () => {
    const result = cleanText("a\nb\na\nc", options({ duplicate: { enabled: true, resultType: "onceOnly" } }));
    expect(result.text).toBe("b\nc");
  });
  it("reports unique/duplicate stats", () => {
    const result = cleanText("a\nb\na\nc", options({ duplicate: { enabled: true } }));
    expect(result.stats.uniqueLines).toBe(3);
    expect(result.stats.duplicateLines).toBe(1);
  });
});

describe("pipeline stage order", () => {
  it("applies special-whitespace conversion before collapse, so a converted tab can be collapsed", () => {
    const result = cleanText("a\t\tb", options({
      whitespace: { tabToSpaces: true, tabSize: 2, collapseSpaces: true, trimLines: false, blankLines: "keep" },
    }));
    expect(result.text).toBe("a b");
  });
});

describe("mandatory combination scenario (SPEC section 24)", () => {
  it("matches the exact spec example", () => {
    const input = "  Apple   \napple\n Banana \nbanana";
    const result = cleanText(input, options({
      whitespace: { collapseSpaces: true, trimLines: true, blankLines: "remove" },
      duplicate: {
        enabled: true,
        caseSensitive: false,
        ignoreSurroundingWhitespace: true,
      },
    }));
    expect(result.text).toBe("Apple\nBanana");
  });
});

describe("presets", () => {
  it("basic preset trims and collapses spaces but keeps blank lines and duplicates", () => {
    const opts = buildPresetOptions("basic");
    const result = cleanText("  a  \n\nb\na", opts);
    expect(result.text).toBe("a\n\nb\na");
  });
  it("removeBlank preset strips all blank lines", () => {
    const opts = buildPresetOptions("removeBlank");
    const result = cleanText("a\n\n\nb", opts);
    expect(result.text).toBe("a\nb");
  });
  it("removeDuplicate preset dedupes while keeping blank lines", () => {
    const opts = buildPresetOptions("removeDuplicate");
    const result = cleanText("a\na\nb", opts);
    expect(result.text).toBe("a\nb");
  });
  it("oneLine preset merges everything into a single line", () => {
    const opts = buildPresetOptions("oneLine");
    const result = cleanText("a\n\nb\nc", opts);
    expect(result.text).toBe("a b c");
  });
  it("full preset trims, removes blanks, and dedupes", () => {
    const opts = buildPresetOptions("full");
    const result = cleanText("  a  \n\na\nb", opts);
    expect(result.text).toBe("a\nb");
  });
});

describe("validation", () => {
  it("measures byte length using UTF-8 encoding", () => {
    expect(inputByteLength("a")).toBe(1);
    expect(inputByteLength("가")).toBe(3);
  });
  it("flags input that exceeds the hard size limit", () => {
    expect(exceedsMaxInput("a".repeat(10))).toBe(false);
  });
  it("warns on large line counts", () => {
    expect(shouldWarnLargeInput("a\n".repeat(60_000))).toBe(true);
    expect(shouldWarnLargeInput("a\nb\nc")).toBe(false);
  });
});
