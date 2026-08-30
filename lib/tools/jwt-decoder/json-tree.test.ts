import { describe, expect, it } from "vitest";

import { buildJsonTree, collectContainerIds, copyableText } from "./json-tree";

describe("buildJsonTree", () => {
  it("builds primitive leaves with a stable root id", () => {
    expect(buildJsonTree("hi")).toEqual({ kind: "string", id: "$", value: "hi" });
    expect(buildJsonTree(42)).toEqual({ kind: "number", id: "$", value: 42 });
    expect(buildJsonTree(true)).toEqual({ kind: "boolean", id: "$", value: true });
    expect(buildJsonTree(null)).toEqual({ kind: "null", id: "$" });
  });

  it("builds nested objects with dotted ids per key and keeps the raw subtree", () => {
    const tree = buildJsonTree({ a: 1, b: { c: 2 } });
    expect(tree).toEqual({
      kind: "object",
      id: "$",
      raw: { a: 1, b: { c: 2 } },
      entries: [
        { key: "a", value: { kind: "number", id: "$.a", value: 1 } },
        {
          key: "b",
          value: {
            kind: "object",
            id: "$.b",
            raw: { c: 2 },
            entries: [{ key: "c", value: { kind: "number", id: "$.b.c", value: 2 } }],
          },
        },
      ],
    });
  });

  it("builds arrays with index-suffixed ids and keeps the raw subtree", () => {
    const tree = buildJsonTree([1, "two"]);
    expect(tree).toEqual({
      kind: "array",
      id: "$",
      raw: [1, "two"],
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

describe("copyableText", () => {
  it("copies a string claim without its surrounding quotes", () => {
    expect(copyableText(buildJsonTree("user-123"))).toBe("user-123");
  });

  it("copies numbers, booleans, and null as plain text", () => {
    expect(copyableText(buildJsonTree(1735689600))).toBe("1735689600");
    expect(copyableText(buildJsonTree(true))).toBe("true");
    expect(copyableText(buildJsonTree(null))).toBe("null");
  });

  it("copies an object or array claim as pretty-printed JSON of just that subtree", () => {
    const tree = buildJsonTree({ roles: ["admin", "editor"], meta: { level: 2 } });
    if (tree.kind !== "object") throw new Error("expected object");
    const roles = tree.entries.find((entry) => entry.key === "roles")?.value;
    expect(roles && copyableText(roles)).toBe(JSON.stringify(["admin", "editor"], null, 2));
    const meta = tree.entries.find((entry) => entry.key === "meta")?.value;
    expect(meta && copyableText(meta)).toBe(JSON.stringify({ level: 2 }, null, 2));
  });
});

describe("collectContainerIds", () => {
  it("collects only object/array ids, not primitive leaves", () => {
    const tree = buildJsonTree({ a: 1, b: { c: [2, 3] } });
    expect(collectContainerIds(tree)).toEqual(["$", "$.b", "$.b.c"]);
  });

  it("returns an empty list for a root primitive", () => {
    expect(collectContainerIds(buildJsonTree(42))).toEqual([]);
  });
});
