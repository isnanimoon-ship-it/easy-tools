export type JsonTreeNode =
  | { kind: "object"; id: string; entries: { key: string; value: JsonTreeNode }[]; raw: Record<string, unknown> }
  | { kind: "array"; id: string; items: JsonTreeNode[]; raw: unknown[] }
  | { kind: "string"; id: string; value: string }
  | { kind: "number"; id: string; value: number }
  | { kind: "boolean"; id: string; value: boolean }
  | { kind: "null"; id: string };

function buildNode(value: unknown, id: string): JsonTreeNode {
  if (value === null) return { kind: "null", id };
  if (Array.isArray(value)) {
    return { kind: "array", id, items: value.map((item, index) => buildNode(item, `${id}.${index}`)), raw: value };
  }
  if (typeof value === "object") {
    const raw = value as Record<string, unknown>;
    return {
      kind: "object",
      id,
      entries: Object.entries(raw).map(([key, entryValue]) => ({
        key,
        value: buildNode(entryValue, `${id}.${key}`),
      })),
      raw,
    };
  }
  if (typeof value === "string") return { kind: "string", id, value };
  if (typeof value === "number") return { kind: "number", id, value };
  return { kind: "boolean", id, value: value as boolean };
}

export function buildJsonTree(value: unknown): JsonTreeNode {
  return buildNode(value, "$");
}

/**
 * Text a "copy" button on this node should place on the clipboard. Strings copy as their raw
 * content (no surrounding quotes) since claim values are usually pasted elsewhere as plain text;
 * containers copy as pretty-printed JSON of their own subtree.
 */
export function copyableText(node: JsonTreeNode): string {
  switch (node.kind) {
    case "string":
      return node.value;
    case "number":
    case "boolean":
      return String(node.value);
    case "null":
      return "null";
    case "object":
    case "array":
      return JSON.stringify(node.raw, null, 2);
  }
}

export function collectContainerIds(node: JsonTreeNode, out: string[] = []): string[] {
  if (node.kind === "object") {
    out.push(node.id);
    node.entries.forEach((entry) => collectContainerIds(entry.value, out));
  } else if (node.kind === "array") {
    out.push(node.id);
    node.items.forEach((item) => collectContainerIds(item, out));
  }
  return out;
}
