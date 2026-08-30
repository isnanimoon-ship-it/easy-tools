import type {
  BlankLineMode,
  CleanResult,
  CleanStats,
  DuplicateOptions,
  DuplicateResultType,
  LineRecord,
  RegexRuleOptions,
  TextCleanerOptions,
} from "./types";

const SPECIAL_SPACE_PATTERN = /[ 　]/g;

export function charCount(text: string): number {
  return [...text].length;
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function convertSpecialWhitespace(
  line: string,
  tabToSpaces: boolean,
  tabSize: number,
  normalizeSpecialSpaces: boolean,
): string {
  let result = line;
  if (tabToSpaces) result = result.replace(/\t/g, " ".repeat(tabSize));
  if (normalizeSpecialSpaces) result = result.replace(SPECIAL_SPACE_PATTERN, " ");
  return result;
}

function collapseRegularSpaces(line: string): string {
  return line.replace(/ {2,}/g, " ");
}

// Runs before every other step, directly on the raw pasted text — this is a
// power-user escape hatch for patterns the built-in options can't express
// (e.g. "drop every line starting with #"), not a replacement for them.
function applyRegexRule(text: string, rule: RegexRuleOptions): { text: string; error: string | null } {
  if (!rule.enabled || rule.pattern === "") return { text, error: null };
  try {
    // "m" (multiline) so ^/$ anchor to each line, not the whole text — the
    // natural expectation for a line-oriented cleanup tool, unlike a
    // general-purpose regex engine where flags are chosen explicitly.
    const regex = new RegExp(rule.pattern, rule.ignoreCase ? "gmi" : "gm");
    return { text: text.replace(regex, rule.replacement), error: null };
  } catch (error) {
    return { text, error: error instanceof Error ? error.message : "Invalid regular expression" };
  }
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function applyBlankLineMode(lines: string[], mode: BlankLineMode): string[] {
  if (mode === "keep") return lines;
  if (mode === "remove") return lines.filter((line) => !isBlank(line));
  const result: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    const blank = isBlank(line);
    if (blank && prevBlank) continue;
    result.push(line);
    prevBlank = blank;
  }
  return result;
}

function buildComparisonKey(cleanedLine: string, options: DuplicateOptions): string {
  let key = cleanedLine;
  if (options.unicodeNormalize) key = key.normalize("NFC");
  if (!options.caseSensitive) key = key.toLowerCase();
  if (options.ignoreSurroundingWhitespace) key = key.trim();
  if (options.ignoreInnerWhitespaceDiff) key = collapseRegularSpaces(key);
  return key;
}

function countByKey(records: LineRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.comparisonKey, (counts.get(record.comparisonKey) ?? 0) + 1);
  }
  return counts;
}

export function deduplicate(
  records: LineRecord[],
  keep: DuplicateOptions["keep"],
): LineRecord[] {
  if (keep === "first") {
    const seen = new Map<string, LineRecord>();
    for (const record of records) {
      if (!seen.has(record.comparisonKey)) seen.set(record.comparisonKey, record);
    }
    return [...seen.values()];
  }
  const seen = new Map<string, LineRecord>();
  for (const record of records) seen.set(record.comparisonKey, record);
  return [...seen.values()].sort((a, b) => a.originalIndex - b.originalIndex);
}

function filterByResultType(
  deduped: LineRecord[],
  counts: Map<string, number>,
  resultType: DuplicateResultType,
): LineRecord[] {
  if (resultType === "unique") return deduped;
  if (resultType === "duplicatesOnly") {
    return deduped.filter((record) => (counts.get(record.comparisonKey) ?? 0) > 1);
  }
  return deduped.filter((record) => (counts.get(record.comparisonKey) ?? 0) === 1);
}

function buildStats(input: {
  originalLines: number;
  resultLines: number;
  originalChars: number;
  resultChars: number;
  uniqueLines?: number;
  duplicateLines?: number;
}): CleanStats {
  return {
    originalLines: input.originalLines,
    resultLines: input.resultLines,
    removedLines: input.originalLines - input.resultLines,
    originalChars: input.originalChars,
    resultChars: input.resultChars,
    ...(input.uniqueLines !== undefined
      ? { uniqueLines: input.uniqueLines, duplicateLines: input.duplicateLines }
      : {}),
  };
}

export function cleanText(text: string, options: TextCleanerOptions): CleanResult {
  const originalChars = charCount(text);
  const originalLineCount = normalizeNewlines(text).split("\n").length;

  const regexResult = applyRegexRule(text, options.regexRule);
  const normalized = normalizeNewlines(regexResult.text);
  const originalLines = normalized.split("\n");

  const processedLines = originalLines.map((line) => {
    let processed = convertSpecialWhitespace(
      line,
      options.whitespace.tabToSpaces,
      options.whitespace.tabSize,
      options.whitespace.normalizeSpecialSpaces,
    );
    if (options.whitespace.trimLines) processed = processed.trim();
    if (options.whitespace.collapseSpaces) processed = collapseRegularSpaces(processed);
    return processed;
  });

  const blankHandled = applyBlankLineMode(processedLines, options.whitespace.blankLines);

  if (options.whitespace.mergeToOneLine) {
    const merged = collapseRegularSpaces(
      blankHandled.join("\n").replace(/\n+/g, " "),
    ).trim();
    return {
      text: merged,
      mergedToOneLine: true,
      regexError: regexResult.error,
      stats: buildStats({
        originalLines: originalLineCount,
        resultLines: merged.length > 0 ? 1 : 0,
        originalChars,
        resultChars: charCount(merged),
      }),
    };
  }

  let finalLines = blankHandled;
  let uniqueLines: number | undefined;
  let duplicateLines: number | undefined;

  if (options.duplicate.enabled) {
    const records: LineRecord[] = blankHandled.map((cleanedLine, index) => ({
      originalLine: originalLines[index],
      cleanedLine,
      comparisonKey: buildComparisonKey(cleanedLine, options.duplicate),
      originalIndex: index,
    }));
    const counts = countByKey(records);
    const deduped = deduplicate(records, options.duplicate.keep);
    const filtered = filterByResultType(deduped, counts, options.duplicate.resultType);
    finalLines = filtered.map((record) => record.cleanedLine);
    uniqueLines = deduped.length;
    duplicateLines = records.length - deduped.length;
  }

  const resultText = finalLines.join("\n");
  return {
    text: resultText,
    mergedToOneLine: false,
    regexError: regexResult.error,
    stats: buildStats({
      originalLines: originalLineCount,
      resultLines: finalLines.length,
      originalChars,
      resultChars: charCount(resultText),
      uniqueLines,
      duplicateLines,
    }),
  };
}
