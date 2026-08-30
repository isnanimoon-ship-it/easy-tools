import { describe, expect, it } from "vitest";

import { buildJsonTree, collectKeyMatches } from "./json-tree";

describe("buildJsonTree", () => {
  it("builds primitive leaves with a stable root id", () => {
    expect(buildJsonTree("hi")).toEqual({ kind: "string", id: "$", value: "hi" });
    expect(buildJsonTree(42)).toEqual({ kind: "number", id: "$", value: 42 });
    expect(buildJsonTree(true)).toEqual({ kind: "boolean", id: "$", value: true });
    expect(buildJsonTree(null)).toEqual({ kind: "null", id: "$" });
  });

  it("builds nested objects with dotted ids per key", () => {
    const tree = buildJsonTree({ a: 1, b: { c: 2 } });
    expect(tree).toEqual({
      kind: "object",
      id: "$",
      entries: [
        { key: "a", value: { kind: "number", id: "$.a", value: 1 } },
        {
          key: "b",
          value: {
            kind: "object",
            id: "$.b",
            entries: [{ key: "c", value: { kind: "number", id: "$.b.c", value: 2 } }],
          },
        },
      ],
    });
  });

  it("builds arrays with index-suffixed ids", () => {
    const tree = buildJsonTree([1, "two"]);
    expect(tree).toEqual({
      kind: "array",
      id: "$",
      items: [
        { kind: "number", id: "$.0", value: 1 },
        { kind: "string", id: "$.1", value: "two" },
      ],
    });
  });

  it("preserves object key insertion order", () => {
    const tree = buildJsonTree({ z: 1, a: 2 });
    if (tree.kind !== "object") throw new Error("expected object");
    expect(tree.entries.map((entry) => entry.key)).toEqual(["z", "a"]);
  });
});

describe("collectKeyMatches", () => {
  it("returns nothing for a blank query", () => {
    expect(collectKeyMatches(buildJsonTree({ name: "a" }), "")).toEqual([]);
    expect(collectKeyMatches(buildJsonTree({ name: "a" }), "   ")).toEqual([]);
  });

  it("matches keys case-insensitively as a substring", () => {
    const tree = buildJsonTree({ userName: "a", userAge: 1, other: 2 });
    const matches = collectKeyMatches(tree, "USER");
    expect(matches.map((match) => match.id)).toEqual(["$.userName", "$.userAge"]);
  });

  it("does not match array indices, only object keys", () => {
    const tree = buildJsonTree({ list: [1, 2, 3] });
    expect(collectKeyMatches(tree, "0")).toEqual([]);
  });

  it("finds matches nested inside arrays and records the correct ancestor chain", () => {
    const tree = buildJsonTree({ items: [{ label: "x" }, { label: "y" }] });
    const matches = collectKeyMatches(tree, "label");
    expect(matches).toEqual([
      { id: "$.items.0.label", ancestorIds: ["$", "$.items", "$.items.0"] },
      { id: "$.items.1.label", ancestorIds: ["$", "$.items", "$.items.1"] },
    ]);
  });

  it("returns matches in document (pre-order) order", () => {
    const tree = buildJsonTree({ b: { name: 1 }, a: { name: 2 } });
    const matches = collectKeyMatches(tree, "name");
    expect(matches.map((match) => match.id)).toEqual(["$.b.name", "$.a.name"]);
  });
});
