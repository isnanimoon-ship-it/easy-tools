export type SqlCommaStyle = "trailing" | "leading";

const UNSAFE_LINE_MARKERS = ["'", '"', "--", "/*", "*/"];

function isSafeToRewrite(line: string): boolean {
  return !UNSAFE_LINE_MARKERS.some((marker) => line.includes(marker));
}

/**
 * sql-formatter's default output always uses trailing commas. This converts that output to a
 * leading-comma style by moving each line's trailing comma to the start of the following line,
 * in a single forward pass that carries a "pending comma" flag between lines.
 *
 * As a safety measure (see SPEC 6.4), a comma is relocated only when both the line it came from
 * and the line it would move onto are free of quote characters and comment markers; otherwise the
 * comma is left exactly where sql-formatter put it, rather than risking a rewrite inside a string
 * literal or comment.
 */
export function applyCommaStyle(formattedSql: string, style: SqlCommaStyle): string {
  if (style === "trailing") return formattedSql;

  const lines = formattedSql.split("\n");
  const output: string[] = [];
  let pendingComma = false;

  for (const originalLine of lines) {
    let line = originalLine;

    if (pendingComma) {
      const indentMatch = /^[ \t]*/.exec(line);
      const indent = indentMatch ? indentMatch[0] : "";
      const rest = line.slice(indent.length);
      if (rest !== "" && isSafeToRewrite(line)) {
        line = `${indent}, ${rest}`;
      } else {
        // Can't safely move the comma onto this line (blank, or contains a string/comment marker) —
        // restore it onto the line it already belongs to instead of dropping it.
        output[output.length - 1] += ",";
      }
      pendingComma = false;
    }

    const trailingCommaMatch = /^(.*[^\s,]),[ \t]*$/.exec(line);
    if (trailingCommaMatch && isSafeToRewrite(line)) {
      output.push(trailingCommaMatch[1]);
      pendingComma = true;
    } else {
      output.push(line);
    }
  }

  if (pendingComma) output[output.length - 1] += ",";

  return output.join("\n");
}
