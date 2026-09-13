import { describe, expect, it } from "vitest";

import { formatRelativeMinutes } from "./format";

describe("formatRelativeMinutes", () => {
  it("formats minutes ago in each supported locale", () => {
    expect(formatRelativeMinutes(13, "ko")).toBe("13분 전");
    expect(formatRelativeMinutes(13, "en")).toBe("13 minutes ago");
    expect(formatRelativeMinutes(1, "ko")).toBe("1분 전");
  });

  it("rounds fractional minutes", () => {
    expect(formatRelativeMinutes(2.6, "en")).toBe("3 minutes ago");
  });
});
