import { describe, expect, it } from "vitest";

import { hashVisitor } from "./visitor-hash";

describe("hashVisitor", () => {
  it("is deterministic for the same ip, user agent, and day", async () => {
    const day = new Date("2026-08-30T10:00:00Z");
    const a = await hashVisitor("203.0.113.1", "Mozilla/5.0", day);
    const b = await hashVisitor("203.0.113.1", "Mozilla/5.0", new Date("2026-08-30T23:59:00Z"));
    expect(a).toBe(b);
  });

  it("changes when the calendar day changes", async () => {
    const a = await hashVisitor("203.0.113.1", "Mozilla/5.0", new Date("2026-08-30T23:59:00Z"));
    const b = await hashVisitor("203.0.113.1", "Mozilla/5.0", new Date("2026-08-31T00:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("changes when the ip or user agent changes", async () => {
    const day = new Date("2026-08-30T10:00:00Z");
    const base = await hashVisitor("203.0.113.1", "Mozilla/5.0", day);
    expect(await hashVisitor("203.0.113.2", "Mozilla/5.0", day)).not.toBe(base);
    expect(await hashVisitor("203.0.113.1", "Other/1.0", day)).not.toBe(base);
  });

  it("never stores the raw ip in the output", async () => {
    const hash = await hashVisitor("203.0.113.1", "Mozilla/5.0", new Date("2026-08-30T10:00:00Z"));
    expect(hash).not.toContain("203.0.113.1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
