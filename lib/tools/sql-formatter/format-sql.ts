import { format } from "sql-formatter";

export type SqlDialect = "sql" | "mysql" | "postgresql" | "tsql" | "plsql" | "sqlite";
export type SqlKeywordCase = "upper" | "lower" | "preserve";
export type SqlIndentStyle = "2-spaces" | "4-spaces" | "tab";
export type SqlLogicalOperatorNewline = "before" | "after";

export type SqlFormatOptions = {
  dialect: SqlDialect;
  keywordCase: SqlKeywordCase;
  indent: SqlIndentStyle;
  logicalOperatorNewline: SqlLogicalOperatorNewline;
};

export const SQL_DIALECTS: readonly SqlDialect[] = ["sql", "mysql", "postgresql", "tsql", "plsql", "sqlite"];
export const KEYWORD_CASES: readonly SqlKeywordCase[] = ["upper", "lower", "preserve"];
export const INDENT_STYLES: readonly SqlIndentStyle[] = ["2-spaces", "4-spaces", "tab"];

export const DEFAULT_SQL_FORMAT_OPTIONS: SqlFormatOptions = {
  dialect: "sql",
  keywordCase: "upper",
  indent: "4-spaces",
  logicalOperatorNewline: "before",
};

export const MAX_SQL_LENGTH = 300_000;

export type SqlFormatError = "input-too-long" | "parse-error";
export type SqlFormatResult = { ok: true; value: string } | { ok: false; reason: SqlFormatError; detail?: string };

function tabWidthFor(indent: SqlIndentStyle): number {
  if (indent === "2-spaces") return 2;
  if (indent === "tab") return 1;
  return 4;
}

export function formatSql(sqlText: string, options: SqlFormatOptions): SqlFormatResult {
  if (sqlText.trim() === "") return { ok: true, value: "" };
  if (sqlText.length > MAX_SQL_LENGTH) return { ok: false, reason: "input-too-long" };

  try {
    // sql-formatter treats an explicitly present `keywordCase: undefined` key differently from an
    // omitted key: the former silently drops all keywords from the output instead of preserving
    // their original case. The case options are only included in the config object when the user
    // did not choose "preserve", so omission (not undefined) is what signals "leave case as-is".
    const caseOptions = options.keywordCase === "preserve"
      ? {}
      : { keywordCase: options.keywordCase, dataTypeCase: options.keywordCase, functionCase: options.keywordCase };
    const value = format(sqlText, {
      language: options.dialect,
      ...caseOptions,
      tabWidth: tabWidthFor(options.indent),
      useTabs: options.indent === "tab",
      logicalOperatorNewline: options.logicalOperatorNewline,
    });
    return { ok: true, value };
  } catch (error) {
    return { ok: false, reason: "parse-error", detail: error instanceof Error ? error.message : undefined };
  }
}
