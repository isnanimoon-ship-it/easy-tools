import { describe, expect, it } from "vitest";

import { summarizeBatchResponse } from "./batch-summary";
import type { RegexResponse } from "./protocol";

describe("summarizeBatchResponse", () => {
  it("reports timeout for a synthetic timeout signal", () => {
    expect(summarizeBatchResponse({ status: "timeout" })).toEqual({ status: "timeout" });
  });

  it("reports a syntax error with its message", () => {
    const response: RegexResponse = { requestId: 1, status: "syntax-error", message: "Invalid group" };
    expect(summarizeBatchResponse(response)).toEqual({ status: "error", message: "Invalid group" });
  });

  it("reports a limit error, falling back to its status when no message is present", () => {
    const response: RegexResponse = { requestId: 1, status: "limit-error", code: "text-too-long" };
    expect(summarizeBatchResponse(response)).toEqual({ status: "error", message: "limit-error" });
  });

  it("reports no match with empty captures", () => {
    const response: RegexResponse = { requestId: 1, status: "success", matches: [], truncated: false, replacement: "", replacementChanged: false, replacementTooLarge: false };
    expect(summarizeBatchResponse(response)).toEqual({ status: "ok", matched: false, matchCount: 0, firstCaptures: [], firstNamed: {} });
  });

  it("reports a match and captures from the first match only", () => {
    const response: RegexResponse = {
      requestId: 1,
      status: "success",
      truncated: false,
      replacement: "",
      replacementChanged: false,
      replacementTooLarge: false,
      matches: [
        { value: "2024-01-02", start: 0, end: 10, captures: ["2024", "01", "02"], named: { year: "2024" }, zeroLength: false },
        { value: "2025-06-07", start: 11, end: 21, captures: ["2025", "06", "07"], named: { year: "2025" }, zeroLength: false },
      ],
    };
    expect(summarizeBatchResponse(response)).toEqual({
      status: "ok",
      matched: true,
      matchCount: 2,
      firstCaptures: ["2024", "01", "02"],
      firstNamed: { year: "2024" },
    });
  });

  it("treats a null capture as unmatched rather than absent", () => {
    const response: RegexResponse = {
      requestId: 1,
      status: "success",
      truncated: false,
      replacement: "",
      replacementChanged: false,
      replacementTooLarge: false,
      matches: [{ value: "a", start: 0, end: 1, captures: [null], named: {}, zeroLength: false }],
    };
    const summary = summarizeBatchResponse(response);
    if (summary.status !== "ok") throw new Error("expected ok status");
    expect(summary.firstCaptures).toEqual([null]);
  });
});
