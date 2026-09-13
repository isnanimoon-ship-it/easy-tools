import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import { detectDocument, inspectHwpxArchive, MAX_HWP_FILE_BYTES } from "./detect-document";

describe("detectDocument", () => {
  it("recognizes an HWP CFB signature as limited support", () => {
    const bytes = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectDocument("sample.HWP", bytes, bytes.length)).toEqual({ ok: true, format: "hwp", limited: true });
  });

  it("recognizes a HWPX ZIP signature", () => {
    const bytes = zipSync({ mimetype: strToU8("application/hwp+zip"), "Contents/content.hpf": strToU8("<package/>") });
    expect(detectDocument("sample.hwpx", bytes, bytes.length)).toEqual({ ok: true, format: "hwpx", limited: false });
  });

  it("rejects a ZIP without an HWPX central directory", () => {
    expect(inspectHwpxArchive(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]))).toEqual({ ok: false, code: "invalid-signature" });
  });

  it("rejects ZIP files missing the required HWPX package entries", () => {
    const bytes = zipSync({ "document.txt": strToU8("not an HWPX package") });
    expect(inspectHwpxArchive(bytes)).toEqual({ ok: false, code: "invalid-signature" });
  });

  it("rejects unsafe archive paths and extreme compression ratios", () => {
    const traversal = zipSync({ mimetype: strToU8("application/hwp+zip"), "../Contents/content.hpf": strToU8("<package/>") });
    expect(inspectHwpxArchive(traversal)).toEqual({ ok: false, code: "invalid-signature" });

    const highlyCompressed = zipSync({ mimetype: strToU8("application/hwp+zip"), "Contents/content.hpf": new Uint8Array(2_000_000) }, { level: 9 });
    expect(inspectHwpxArchive(highlyCompressed)).toEqual({ ok: false, code: "archive-limit" });
  });

  it("rejects disguised, empty, unsupported, and oversized files", () => {
    expect(detectDocument("fake.hwp", Uint8Array.from([1, 2, 3]), 3)).toEqual({ ok: false, code: "invalid-signature" });
    expect(detectDocument("empty.hwpx", new Uint8Array(), 0)).toEqual({ ok: false, code: "empty-file" });
    expect(detectDocument("notes.txt", Uint8Array.from([1]), 1)).toEqual({ ok: false, code: "unsupported-extension" });
    expect(detectDocument("large.hwpx", Uint8Array.from([0x50, 0x4b, 0x03]), MAX_HWP_FILE_BYTES + 1)).toEqual({ ok: false, code: "file-too-large" });
  });
});
