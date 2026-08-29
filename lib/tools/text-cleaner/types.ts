export type BlankLineMode = "keep" | "collapse" | "remove";
export type DuplicateKeep = "first" | "last";
export type DuplicateResultType = "unique" | "duplicatesOnly" | "onceOnly";
export type TabSize = 2 | 4;

export type WhitespaceOptions = {
  collapseSpaces: boolean;
  trimLines: boolean;
  blankLines: BlankLineMode;
  mergeToOneLine: boolean;
  tabToSpaces: boolean;
  tabSize: TabSize;
  normalizeSpecialSpaces: boolean;
};

export type DuplicateOptions = {
  enabled: boolean;
  caseSensitive: boolean;
  ignoreSurroundingWhitespace: boolean;
  ignoreInnerWhitespaceDiff: boolean;
  unicodeNormalize: boolean;
  keep: DuplicateKeep;
  resultType: DuplicateResultType;
};

export type TextCleanerOptions = {
  whitespace: WhitespaceOptions;
  duplicate: DuplicateOptions;
};

export type LineRecord = {
  originalLine: string;
  cleanedLine: string;
  comparisonKey: string;
  originalIndex: number;
};

export type CleanStats = {
  originalLines: number;
  resultLines: number;
  removedLines: number;
  originalChars: number;
  resultChars: number;
  uniqueLines?: number;
  duplicateLines?: number;
};

export type CleanResult = {
  text: string;
  stats: CleanStats;
  mergedToOneLine: boolean;
};

export const DEFAULT_OPTIONS: TextCleanerOptions = {
  whitespace: {
    collapseSpaces: true,
    trimLines: true,
    blankLines: "collapse",
    mergeToOneLine: false,
    tabToSpaces: false,
    tabSize: 4,
    normalizeSpecialSpaces: false,
  },
  duplicate: {
    enabled: false,
    caseSensitive: true,
    ignoreSurroundingWhitespace: true,
    ignoreInnerWhitespaceDiff: false,
    unicodeNormalize: false,
    keep: "first",
    resultType: "unique",
  },
};
