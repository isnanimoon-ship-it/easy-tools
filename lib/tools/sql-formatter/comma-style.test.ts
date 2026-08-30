import { describe, expect, it } from "vitest";

import { applyCommaStyle } from "./comma-style";

describe("applyCommaStyle — trailing (no-op)", () => {
  it("returns the input unchanged", () => {
    const formatted = "SELECT\n  id,\n  name,\n  email\nFROM\n  users;";
    expect(applyCommaStyle(formatted, "trailing")).toBe(formatted);
  });
});

describe("applyCommaStyle — leading", () => {
  it("moves each trailing comma to the start of the following line", () => {
    const formatted = "SELECT\n  id,\n  name,\n  email\nFROM\n  users;";
    expect(applyCommaStyle(formatted, "leading")).toBe("SELECT\n  id\n  , name\n  , email\nFROM\n  users;");
  });

  it("preserves indentation width when moving the comma", () => {
    const formatted = "SELECT\n    id,\n    name\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe("SELECT\n    id\n    , name\nFROM users;");
  });

  it("leaves a line with no trailing comma untouched", () => {
    const formatted = "SELECT\n    id\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("does not rewrite a line containing a single-quoted string, even with a trailing comma", () => {
    const formatted = "SELECT\n    'a, b',\n    name\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("does not rewrite a line containing a double-quoted identifier", () => {
    const formatted = 'SELECT\n    "my, column",\n    name\nFROM users;';
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("does not rewrite a line-comment line even if it ends with a comma-like character", () => {
    const formatted = "SELECT\n    id, -- keep me,\n    name\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("does not rewrite when the following line itself contains a string or comment marker", () => {
    const formatted = "SELECT\n    id,\n    'literal'\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("does not rewrite the last column before a blank line", () => {
    const formatted = "SELECT\n    id,\n\nFROM users;";
    expect(applyCommaStyle(formatted, "leading")).toBe(formatted);
  });

  it("handles multiple independent comma-separated blocks (e.g. SELECT and GROUP BY)", () => {
    const formatted = "SELECT\n  a,\n  b\nFROM t\nGROUP BY\n  a,\n  b;";
    expect(applyCommaStyle(formatted, "leading")).toBe("SELECT\n  a\n  , b\nFROM t\nGROUP BY\n  a\n  , b;");
  });
});
