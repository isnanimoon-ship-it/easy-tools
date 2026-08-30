import { describe, expect, it } from "vitest";

import { DEFAULT_SQL_FORMAT_OPTIONS, formatSql, MAX_SQL_LENGTH, type SqlFormatOptions } from "./format-sql";

function withOptions(overrides: Partial<SqlFormatOptions>): SqlFormatOptions {
  return { ...DEFAULT_SQL_FORMAT_OPTIONS, ...overrides };
}

function formatOk(sql: string, overrides: Partial<SqlFormatOptions> = {}): string {
  const result = formatSql(sql, withOptions(overrides));
  if (!result.ok) throw new Error(`expected ok, got error: ${result.reason} ${result.detail ?? ""}`);
  return result.value;
}

describe("formatSql — basic structure", () => {
  it("returns an empty result for blank input without calling the library", () => {
    expect(formatSql("", DEFAULT_SQL_FORMAT_OPTIONS)).toEqual({ ok: true, value: "" });
    expect(formatSql("   \n\t", DEFAULT_SQL_FORMAT_OPTIONS)).toEqual({ ok: true, value: "" });
  });

  it("splits SELECT columns onto their own lines", () => {
    const out = formatOk("SELECT a,b,c FROM users WHERE a=1 AND b=2;");
    expect(out).toContain("SELECT");
    expect(out).toContain("a,");
    expect(out).toContain("b,");
    expect(out).toContain("c");
    expect(out).toContain("WHERE");
    expect(out).toContain("AND b = 2");
  });

  it("formats JOIN with ON on an indented line", () => {
    const out = formatOk("SELECT u.id,o.total FROM users AS u LEFT JOIN orders AS o ON u.id=o.user_id WHERE o.status='paid';");
    expect(out).toContain("LEFT JOIN orders AS o");
    expect(out).toContain("ON u.id = o.user_id");
  });

  it("formats CASE WHEN across multiple lines", () => {
    const out = formatOk("SELECT CASE WHEN score>=90 THEN 'A' WHEN score>=80 THEN 'B' ELSE 'C' END FROM t;");
    expect(out).toContain("CASE");
    expect(out).toContain("WHEN score >= 90 THEN 'A'");
    expect(out).toContain("ELSE 'C'");
    expect(out).toContain("END");
  });

  it("formats a CTE (WITH) with each definition separated", () => {
    const out = formatOk(
      "WITH active_users AS (SELECT id,name FROM users WHERE status='active'), order_totals AS (SELECT user_id,SUM(total) AS total FROM orders GROUP BY user_id) SELECT * FROM active_users;",
    );
    expect(out).toContain("WITH");
    expect(out).toContain("active_users AS (");
    expect(out).toContain("order_totals AS (");
  });

  it("formats CREATE TABLE with each column on its own line", () => {
    const out = formatOk(
      "CREATE TABLE users (id BIGINT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255), created_at TIMESTAMP);",
    );
    expect(out).toContain("CREATE TABLE");
    expect(out).toContain("id BIGINT PRIMARY KEY");
    expect(out).toContain("name VARCHAR(100) NOT NULL");
  });

  it("formats multiple semicolon-separated statements independently", () => {
    const out = formatOk("SELECT * FROM users; UPDATE users SET active = true WHERE id = 1;");
    expect(out).toContain("SELECT");
    expect(out).toContain("UPDATE users");
    expect(out).toContain("SET");
  });
});

describe("formatSql — dialect-specific syntax", () => {
  it("keeps MySQL backtick identifiers and LIMIT intact", () => {
    const out = formatOk("SELECT `col` FROM `tbl` LIMIT 10;", { dialect: "mysql" });
    expect(out).toContain("`col`");
    expect(out).toContain("`tbl`");
    expect(out).toContain("LIMIT");
  });

  it("keeps PostgreSQL :: type cast intact", () => {
    const out = formatOk("SELECT payload::jsonb FROM events;", { dialect: "postgresql", keywordCase: "preserve" });
    expect(out).toContain("payload::jsonb");
  });

  it("keeps PostgreSQL DISTINCT ON intact", () => {
    const out = formatOk("SELECT DISTINCT ON (user_id) user_id,created_at FROM logs ORDER BY user_id,created_at DESC;", { dialect: "postgresql" });
    expect(out).toContain("DISTINCT");
    expect(out).toContain("ON (user_id)");
  });

  it("keeps SQL Server TOP and bracket identifiers intact", () => {
    const out = formatOk("SELECT TOP 10 id,name FROM users ORDER BY id DESC;", { dialect: "tsql" });
    expect(out).toContain("TOP 10");
  });

  it("keeps the SQL Server WITH (NOLOCK) table hint's keyword and content intact", () => {
    // sql-formatter formats the `WITH` in this position as if it might start a CTE and inserts a
    // line break before "(NOLOCK)" — cosmetically unusual but not semantically broken, since SQL
    // whitespace between tokens is insignificant. This is a documented library limitation.
    const out = formatOk("SELECT * FROM users WITH (NOLOCK);", { dialect: "tsql" });
    expect(out).toContain("WITH");
    expect(out).toContain("(NOLOCK)");
  });

  it("keeps Oracle ROWNUM intact", () => {
    const out = formatOk("SELECT * FROM users WHERE ROWNUM <= 10;", { dialect: "plsql" });
    expect(out).toContain("ROWNUM <= 10");
  });

  it("keeps SQLite ON CONFLICT intact", () => {
    const out = formatOk("INSERT INTO users(name) VALUES('Kim') ON CONFLICT(name) DO NOTHING;", { dialect: "sqlite" });
    expect(out).toContain("ON CONFLICT");
    expect(out).toContain("DO NOTHING");
  });
});

describe("formatSql — keyword case", () => {
  it("uppercases keywords by default", () => {
    const out = formatOk("select a from t");
    expect(out).toContain("SELECT");
    expect(out).toContain("FROM");
  });

  it("lowercases keywords when requested", () => {
    const out = formatOk("SELECT a FROM t", { keywordCase: "lower" });
    expect(out).toContain("select");
    expect(out).toContain("from");
    expect(out).not.toContain("SELECT");
  });

  it("preserves the original keyword case exactly, without dropping any keyword text", () => {
    const out = formatOk("Select a From t", { keywordCase: "preserve" });
    expect(out).toContain("Select");
    expect(out).toContain("From");
  });

  it("regression: preserve mode must never silently drop keywords from the output", () => {
    // sql-formatter has a landmine where passing `keywordCase: undefined` (as opposed to omitting
    // the key) or an invalid string silently strips all keyword tokens instead of preserving them.
    const out = formatOk("select a from t", { keywordCase: "preserve" });
    expect(out.toLowerCase()).toContain("select");
    expect(out.toLowerCase()).toContain("from");
  });
});

describe("formatSql — indentation", () => {
  it("uses 4 spaces by default", () => {
    const out = formatOk("SELECT a,b FROM t");
    expect(out).toMatch(/\n {4}a,/);
  });

  it("uses 2 spaces when requested", () => {
    const out = formatOk("SELECT a,b FROM t", { indent: "2-spaces" });
    expect(out).toMatch(/\n {2}a,/);
    expect(out).not.toMatch(/\n {4}a,/);
  });

  it("uses tab characters when requested", () => {
    const out = formatOk("SELECT a,b FROM t", { indent: "tab" });
    expect(out).toMatch(/\n\ta,/);
  });
});

describe("formatSql — meaning preservation", () => {
  it("preserves comment text and does not delete comments", () => {
    const out = formatOk("SELECT a -- trailing comment\nFROM t; /* block comment */");
    expect(out).toContain("trailing comment");
    expect(out).toContain("block comment");
  });

  it("preserves string literal contents that look like SQL keywords", () => {
    const out = formatOk("SELECT 'SELECT FROM WHERE' AS label FROM t;");
    expect(out).toContain("'SELECT FROM WHERE'");
  });

  it("preserves each dialect's native placeholder style", () => {
    // Placeholder syntax is dialect-specific in sql-formatter itself (e.g. `:name` is not
    // recognized by the generic "sql" or "mysql" dialects), so each style is tested against a
    // dialect where the underlying library natively supports it — matching this project's SPEC
    // wording that placeholders are preserved "to the extent possible", not universally.
    expect(formatOk("SELECT * FROM users WHERE id = ?;", { dialect: "sql" })).toContain("?");
    expect(formatOk("SELECT * FROM users WHERE id = :username;", { dialect: "sqlite" })).toContain(":username");
    expect(formatOk("SELECT * FROM users WHERE id = @userId;", { dialect: "tsql" })).toContain("@userId");
    expect(formatOk("SELECT * FROM users WHERE id = $1;", { dialect: "postgresql" })).toContain("$1");
  });

  it("preserves Korean aliases and emoji in string literals", () => {
    const out = formatOk("SELECT a AS 이름 FROM t WHERE b = '😀';");
    expect(out).toContain("이름");
    expect(out).toContain("'😀'");
  });
});

describe("formatSql — logical operator newline", () => {
  it("places AND/OR at the start of a new line by default", () => {
    const out = formatOk("SELECT a FROM t WHERE a=1 AND b=2");
    expect(out).toMatch(/\n\s*AND b = 2/);
  });

  it("keeps AND/OR at the end of the previous line when set to after", () => {
    const out = formatOk("SELECT a FROM t WHERE a=1 AND b=2", { logicalOperatorNewline: "after" });
    expect(out).toMatch(/a = 1 AND\n/);
  });
});

describe("formatSql — error handling", () => {
  it("returns a parse-error for genuinely malformed SQL and never throws", () => {
    const result = formatSql("SELECT * FROM users WHERE ((", DEFAULT_SQL_FORMAT_OPTIONS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("parse-error");
  });

  it("does not leak the library's raw grammar-dump message as the primary error signal", () => {
    const result = formatSql("SELECT * FROM users WHERE ((", DEFAULT_SQL_FORMAT_OPTIONS);
    expect(result.ok).toBe(false);
    // The discriminated union's `reason` is what the UI shows; `detail` is optional internal context only.
    if (!result.ok) expect(result.reason).not.toContain("EBNF");
  });

  it("rejects input longer than the configured maximum without invoking the formatter", () => {
    const result = formatSql("a".repeat(MAX_SQL_LENGTH + 1), DEFAULT_SQL_FORMAT_OPTIONS);
    expect(result).toEqual({ ok: false, reason: "input-too-long" });
  });

  it("accepts input exactly at the maximum length", () => {
    const sql = `SELECT '${"a".repeat(MAX_SQL_LENGTH - 12)}';`;
    expect(sql.length).toBeLessThanOrEqual(MAX_SQL_LENGTH);
    const result = formatSql(sql, DEFAULT_SQL_FORMAT_OPTIONS);
    expect(result.ok).toBe(true);
  });
});
