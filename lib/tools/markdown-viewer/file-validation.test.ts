import { describe, expect, it } from "vitest";
import { decodeMarkdownBytes, MAX_MARKDOWN_FILE_BYTES, validateMarkdownFileMeta } from "./file-validation";

describe("Markdown file validation", () => {
  it("accepts the supported extensions case-insensitively", () => {
    for (const name of ["readme.md", "notes.MARKDOWN", "draft.txt"]) expect(validateMarkdownFileMeta({ name, size: 1 })).toBeNull();
  });
  it("rejects empty, oversized, and unsupported files", () => {
    expect(validateMarkdownFileMeta({ name: "empty.md", size: 0 })).toBe("empty-file");
    expect(validateMarkdownFileMeta({ name: "large.md", size: MAX_MARKDOWN_FILE_BYTES + 1 })).toBe("file-too-large");
    expect(validateMarkdownFileMeta({ name: "page.html", size: 10 })).toBe("unsupported-extension");
  });
  it("decodes UTF-8 and its BOM without changing Unicode", () => {
    const text = "안녕하세요 日本語 😀";
    expect(decodeMarkdownBytes(new TextEncoder().encode(text))).toEqual({ ok: true, text });
    expect(decodeMarkdownBytes(Uint8Array.from([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)]))).toEqual({ ok: true, text });
  });
  it("rejects NUL bytes and malformed UTF-8", () => {
    expect(decodeMarkdownBytes(Uint8Array.from([65, 0, 66]))).toEqual({ ok: false, error: "binary-file" });
    expect(decodeMarkdownBytes(Uint8Array.from([0xc3, 0x28]))).toEqual({ ok: false, error: "invalid-utf8" });
  });
});
