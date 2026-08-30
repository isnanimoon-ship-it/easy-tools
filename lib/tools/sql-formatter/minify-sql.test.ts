import { describe, expect, it } from "vitest";

import { minifySql } from "./minify-sql";

describe("minifySql — basic collapsing", () => {
  it("collapses a formatted SELECT to the target compact form", () => {
    expect(minifySql("SELECT id, name\nFROM users\nWHERE id = 1;")).toBe("SELECT id,name FROM users WHERE id=1;");
  });

  it("collapses multi-line, multi-space formatted SQL to a single line", () => {
    const formatted = "SELECT\n    a,\n    b,\n    c\nFROM users\nWHERE\n    a = 1\n    AND b = 2;";
    expect(minifySql(formatted)).toBe("SELECT a,b,c FROM users WHERE a=1 AND b=2;");
  });

  it("returns an empty string for blank input", () => {
    expect(minifySql("")).toBe("");
    expect(minifySql("   \n\t")).toBe("");
  });

  it("collapses runs of whitespace between keywords to a single space", () => {
    expect(minifySql("SELECT   a\n\n\nFROM     t")).toBe("SELECT a FROM t");
  });
});

describe("minifySql — string literal safety", () => {
  it("does not alter internal whitespace inside a single-quoted string", () => {
    expect(minifySql("SELECT 'hello   world' FROM t;")).toBe("SELECT 'hello   world' FROM t;");
  });

  it("does not treat SQL keywords inside a string literal as real tokens", () => {
    expect(minifySql("SELECT 'SELECT FROM WHERE' AS label FROM t;")).toBe("SELECT 'SELECT FROM WHERE' AS label FROM t;");
  });

  it("preserves a doubled single quote (escaped quote) inside a string literal", () => {
    expect(minifySql("SELECT 'it''s   fine' FROM t;")).toBe("SELECT 'it''s   fine' FROM t;");
  });

  it("preserves a backslash-escaped quote inside a string literal", () => {
    expect(minifySql("SELECT 'a\\'b   c' FROM t;")).toBe("SELECT 'a\\'b   c' FROM t;");
  });

  it("does not strip whitespace around punctuation that appears inside a string literal", () => {
    expect(minifySql("SELECT 'a, b ; c' FROM t;")).toBe("SELECT 'a, b ; c' FROM t;");
  });

  it("does not tighten operator characters that appear inside a string literal", () => {
    expect(minifySql("SELECT 'a = b < c > d' FROM t;")).toBe("SELECT 'a = b < c > d' FROM t;");
  });
});

describe("minifySql — identifier quoting safety", () => {
  it("preserves whitespace inside a double-quoted identifier", () => {
    expect(minifySql('SELECT "my   column" FROM t;')).toBe('SELECT "my   column" FROM t;');
  });

  it("preserves whitespace inside a backtick-quoted MySQL identifier", () => {
    expect(minifySql("SELECT `my   column` FROM t;")).toBe("SELECT `my   column` FROM t;");
  });

  it("preserves whitespace inside a bracket-quoted SQL Server identifier", () => {
    expect(minifySql("SELECT [my   column] FROM t;")).toBe("SELECT [my   column] FROM t;");
  });
});

describe("minifySql — comment handling", () => {
  it("removes a line comment entirely, including its content", () => {
    expect(minifySql("SELECT a -- this is a comment\nFROM t;")).toBe("SELECT a FROM t;");
  });

  it("removes a block comment entirely, including its content", () => {
    expect(minifySql("SELECT a /* block comment */ FROM t;")).toBe("SELECT a FROM t;");
  });

  it("does not treat comment markers inside a string literal as real comments", () => {
    expect(minifySql("SELECT '-- not a comment' FROM t;")).toBe("SELECT '-- not a comment' FROM t;");
    expect(minifySql("SELECT '/* not a comment */' FROM t;")).toBe("SELECT '/* not a comment */' FROM t;");
  });
});

describe("minifySql — punctuation and operator tightening", () => {
  it("removes the space after a comma", () => {
    expect(minifySql("SELECT a, b, c FROM t;")).toBe("SELECT a,b,c FROM t;");
  });

  it("removes space around = < >", () => {
    expect(minifySql("SELECT * FROM t WHERE a = 1 AND b < 2 AND c > 3;")).toBe(
      "SELECT * FROM t WHERE a=1 AND b<2 AND c>3;",
    );
  });

  it("removes space around <= >= <> !=", () => {
    expect(minifySql("SELECT * FROM t WHERE a <= 1 AND b >= 2 AND c <> 3;")).toBe(
      "SELECT * FROM t WHERE a<=1 AND b>=2 AND c<>3;",
    );
  });

  it("removes space immediately inside parentheses", () => {
    expect(minifySql("SELECT COUNT( a ) FROM t;")).toBe("SELECT COUNT(a) FROM t;");
  });
});

describe("minifySql — round trip against the formatter", () => {
  it("produces output that still contains every identifier from a CTE query", () => {
    const formatted =
      "WITH\n    active_users AS (\n        SELECT\n            id,\n            name\n        FROM users\n        WHERE status = 'active'\n    )\nSELECT\n    *\nFROM active_users;";
    const minified = minifySql(formatted);
    expect(minified).not.toContain("\n");
    for (const token of ["WITH", "active_users", "id,name", "users", "status='active'", "active_users;"]) {
      expect(minified).toContain(token);
    }
  });
});
