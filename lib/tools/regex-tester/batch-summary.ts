import type { RegexResponse } from "./protocol";

export type BatchCaseResult =
  | { status: "timeout" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      matched: boolean;
      matchCount: number;
      firstCaptures: Array<string | null>;
      firstNamed: Record<string, string | null>;
    };

export function summarizeBatchResponse(response: RegexResponse | { status: "timeout" }): BatchCaseResult {
  if (response.status === "timeout") return { status: "timeout" };

  if (response.status !== "success") {
    const message = "message" in response ? response.message : undefined;
    return { status: "error", message: message ?? response.status };
  }

  const first = response.matches[0];
  return {
    status: "ok",
    matched: response.matches.length > 0,
    matchCount: response.matches.length,
    firstCaptures: first?.captures ?? [],
    firstNamed: first?.named ?? {},
  };
}
