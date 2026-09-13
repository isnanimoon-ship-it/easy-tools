import { describe, expect, it } from "vitest";
import { DISPLAY_TAGS } from "./metadata-reader";
import { fieldDescription, fieldHelp } from "./field-help";

describe("metadata field help", () => {
  it("explains every displayed field in each locale", () => {
    for (const tag of DISPLAY_TAGS) {
      for (const locale of ["ko", "en", "ja"]) {
        expect(fieldDescription(tag, locale), `${locale}: ${tag}`).toBeTruthy();
      }
    }
    expect(Object.keys(fieldHelp).sort()).toEqual([...DISPLAY_TAGS].sort());
  });
});
