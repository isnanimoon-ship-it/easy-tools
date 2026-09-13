import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildMetadataZip, cleanedFilename, uniqueName } from "./download";

describe("metadata remover downloads", () => {
  it("creates a safe output name with the real extension", () => {
    expect(cleanedFilename("folder\\holiday.photo.jpeg", "image/jpeg")).toBe("holiday.photo-metadata-removed.jpg");
    expect(cleanedFilename("<>.png", "image/png")).toBe("__-metadata-removed.png");
  });
  it("deduplicates names deterministically", () => {
    const used = new Set<string>();
    expect(uniqueName(used, "photo.jpg")).toBe("photo.jpg");
    expect(uniqueName(used, "photo.jpg")).toBe("photo-2.jpg");
  });
  it("stores exact bytes in a ZIP", () => {
    const zip = buildMetadataZip([{ name: "clean.png", bytes: new Uint8Array([1, 2, 3]) }]);
    expect([...unzipSync(zip)["clean.png"]]).toEqual([1, 2, 3]);
  });
});
