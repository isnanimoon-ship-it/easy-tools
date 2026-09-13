import { describe, expect, it } from "vitest";
import { displayFields } from "./metadata-reader";

describe("metadata detail display", () => {
  it("shows readable common fields in a stable order and flags sensitive values", () => {
    expect(displayFields({ Model: "Camera A", DateTimeOriginal: new Date("2024-01-02T03:04:05Z"), latitude: 37.5, longitude: 127.1, ISO: 100 })).toEqual([
      { tag: "Model", value: "Camera A", sensitive: false },
      { tag: "DateTimeOriginal", value: "2024-01-02T03:04:05.000Z", sensitive: false },
      { tag: "ISO", value: "100", sensitive: false },
      { tag: "latitude", value: "37.5", sensitive: true },
      { tag: "longitude", value: "127.1", sensitive: true },
    ]);
  });

  it("does not expose binary, nested, unknown, or unbounded values", () => {
    const fields = displayFields({ Make: "A".repeat(500), UserComment: new Uint8Array([1, 2]), MakerNote: "secret", Creator: { nested: "secret" } });
    expect(fields).toEqual([{ tag: "Make", value: "A".repeat(300), sensitive: false }]);
  });
});
