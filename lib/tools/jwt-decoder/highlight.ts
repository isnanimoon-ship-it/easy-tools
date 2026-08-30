export type JsonTokenType = "key" | "string" | "number" | "boolean" | "null" | "punctuation";
export type JsonToken = { text: string; type: JsonTokenType };

const TOKEN_PATTERN =
  /"(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function tokenizeJson(pretty: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;
  for (const match of pretty.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: pretty.slice(lastIndex, index), type: "punctuation" });
    }
    const raw = match[0];
    const type: JsonTokenType = raw.endsWith(":")
      ? "key"
      : raw.startsWith('"')
        ? "string"
        : raw === "true" || raw === "false"
          ? "boolean"
          : raw === "null"
            ? "null"
            : "number";
    tokens.push({ text: raw, type });
    lastIndex = index + raw.length;
  }
  if (lastIndex < pretty.length) {
    tokens.push({ text: pretty.slice(lastIndex), type: "punctuation" });
  }
  return tokens;
}
