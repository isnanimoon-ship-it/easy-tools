type ScanState = "normal" | "single" | "double" | "backtick" | "bracket" | "line-comment" | "block-comment";

const TIGHT_OPERATORS = new Set(["=", "<", ">", "!"]);
const NO_SPACE_BEFORE = new Set([",", ";", ")"]);
const NO_SPACE_AFTER = new Set(["(", ","]);

/**
 * Collapses formatted SQL to a compact single-line form. String/identifier-quoted regions and
 * comments are tracked with a small state machine so their contents are never touched; comments
 * are dropped entirely (standard minifier behavior) and everything else has whitespace collapsed,
 * with a few punctuation/operator pairs (`,` `;` `(` `)` `=` `<` `>` `!`) tightened further.
 */
export function minifySql(sqlText: string): string {
  const chars = [...sqlText];
  let state: ScanState = "normal";
  let output = "";
  let pendingSpace = false;

  function emit(char: string) {
    if (pendingSpace) {
      const previous = output.at(-1);
      if (previous !== undefined && !NO_SPACE_AFTER.has(previous) && !NO_SPACE_BEFORE.has(char)) {
        output += " ";
      }
      pendingSpace = false;
    }
    output += char;
  }

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const next = chars[i + 1];

    if (state === "single" || state === "double" || state === "backtick" || state === "bracket") {
      output += char;
      if (state === "single" && char === "\\") {
        output += next ?? "";
        i += 1;
        continue;
      }
      const closer = state === "single" ? "'" : state === "double" ? '"' : state === "backtick" ? "`" : "]";
      if (char === closer) {
        if (next === closer) {
          output += next;
          i += 1;
        } else {
          state = "normal";
        }
      }
      continue;
    }

    if (state === "line-comment") {
      if (char === "\n") {
        state = "normal";
        pendingSpace = true;
      }
      continue;
    }

    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        i += 1;
        state = "normal";
        pendingSpace = true;
      }
      continue;
    }

    // state === "normal"
    if (char === "'" || char === '"' || char === "`" || char === "[") {
      emit(char);
      state = char === "'" ? "single" : char === '"' ? "double" : char === "`" ? "backtick" : "bracket";
      continue;
    }
    if (char === "-" && next === "-") {
      state = "line-comment";
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      state = "block-comment";
      i += 1;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (TIGHT_OPERATORS.has(char)) {
      pendingSpace = false;
      output += char;
      let lookahead = i + 1;
      while (lookahead < chars.length && /\s/.test(chars[lookahead])) lookahead += 1;
      i = lookahead - 1;
      continue;
    }
    emit(char);
  }

  return output.trim();
}
