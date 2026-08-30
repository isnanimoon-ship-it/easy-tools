export type JsonTreeNode =
  | { kind: "object"; id: string; entries: { key: string; value: JsonTreeNode }[] }
  | { kind: "array"; id: string; items: JsonTreeNode[] }
  | { kind: "string"; id: string; value: string }
  | { kind: "number"; id: string; value: number }
  | { kind: "boolean"; id: string; value: boolean }
  | { kind: "null"; id: string };

function buildNode(value: unknown, id: string): JsonTreeNode {
  if (value === null) return { kind: "null", id };
  if (Array.isArray(value)) {
    return { kind: "array", id, items: value.map((item, index) => buildNode(item, `${id}.${index}`)) };
  }
  if (typeof value === "object") {
    return {
      kind: "object",
      id,
      entries: Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => ({
        key,
        value: buildNode(entryValue, `${id}.${key}`),
      })),
    };
  }
  if (typeof value === "string") return { kind: "string", id, value };
  if (typeof value === "number") return { kind: "number", id, value };
  return { kind: "boolean", id, value: value as boolean };
}

export function buildJsonTree(value: unknown): JsonTreeNode {
  return buildNode(value, "$");
}

export type JsonKeyMatch = { id: string; ancestorIds: string[] };

export function collectKeyMatches(root: JsonTreeNode, query: string): JsonKeyMatch[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const matches: JsonKeyMatch[] = [];

  function walk(node: JsonTreeNode, ancestorIds: string[]) {
    if (node.kind === "object") {
      const withSelf = [...ancestorIds, node.id];
      for (const entry of node.entries) {
        if (entry.key.toLowerCase().includes(trimmed)) {
          matches.push({ id: entry.value.id, ancestorIds: withSelf });
        }
        walk(entry.value, withSelf);
      }
    } else if (node.kind === "array") {
      const withSelf = [...ancestorIds, node.id];
      node.items.forEach((item) => walk(item, withSelf));
    }
  }

  walk(root, []);
  return matches;
}
