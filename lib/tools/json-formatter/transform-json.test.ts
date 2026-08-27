import { describe, expect, it } from "vitest";

import { formatJson, isBlankJsonInput, minifyJson } from "./transform-json";

function valueOf(result: ReturnType<typeof formatJson>) {
  if (!result.ok) throw new Error("Expected valid JSON");
  return result.value;
}

describe("JSON transforms", () => {
  it("recognizes empty and Unicode-whitespace-only input", () => {
    expect(isBlankJsonInput("")).toBe(true);
    expect(isBlankJsonInput(" \t\n\u3000")).toBe(true);
    expect(isBlankJsonInput("null")).toBe(false);
  });

  it.each(["null", "true", "false", "-0", "1e+3", '"text"'])
  ("accepts the top-level primitive %s", (input) => {
    expect(valueOf(formatJson(input))).toBe(input);
  });

  it("formats nested objects and arrays with two spaces and LF", () => {
    const result = formatJson('{"a":[1,{"b":true}],"empty":{}}');
    expect(valueOf(result)).toBe('{\n  "a": [\n    1,\n    {\n      "b": true\n    }\n  ],\n  "empty": {}\n}');
  });

  it("minifies CRLF input without changing whitespace inside strings", () => {
    expect(valueOf(minifyJson('{\r\n "text": "a b\\n c"\r\n}')))
      .toBe('{"text":"a b\\n c"}');
  });

  it("preserves duplicate keys, key order, numeric lexemes, and escape spelling", () => {
    const input = '{"z":9007199254740993,"z":1e+3,"negative":-0,"escaped":"\\uAC00"}';
    const formatted = valueOf(formatJson(input));
    expect(formatted).toContain('"z": 9007199254740993');
    expect(formatted).toContain('"z": 1e+3');
    expect(formatted).toContain('"negative": -0');
    expect(formatted).toContain('"escaped": "\\uAC00"');
    expect(valueOf(minifyJson(formatted))).toBe(input);
  });

  it("is idempotent in both modes and never adds a trailing newline", () => {
    const formatted = valueOf(formatJson('{ "a": [1, 2] }'));
    const minified = valueOf(minifyJson(formatted));
    expect(valueOf(formatJson(formatted))).toBe(formatted);
    expect(valueOf(minifyJson(minified))).toBe(minified);
    expect(formatted.endsWith("\n")).toBe(false);
  });

  it.each(["{'a':1}", '{"a":1,}', '{"a":undefined}', '{"a":NaN}', '{/*x*/"a":1}'])
  ("rejects non-standard JSON without returning transformed text: %s", (input) => {
    expect(formatJson(input).ok).toBe(false);
    expect(minifyJson(input).ok).toBe(false);
  });

  it("returns parser location when the runtime supplies one", () => {
    const result = formatJson('{\n  "a": 1,\n  "b" 2\n}');
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.line !== undefined) {
      expect(result.error.line).toBeGreaterThan(0);
      expect(result.error.column).toBeGreaterThan(0);
    }
  });
});
