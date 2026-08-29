import { DEFAULT_OPTIONS, type TextCleanerOptions } from "./types";

export type PresetId = "basic" | "removeBlank" | "removeDuplicate" | "oneLine" | "full";

export const PRESET_IDS: PresetId[] = [
  "basic",
  "removeBlank",
  "removeDuplicate",
  "oneLine",
  "full",
];

function cloneDefaults(): TextCleanerOptions {
  return {
    whitespace: { ...DEFAULT_OPTIONS.whitespace },
    duplicate: { ...DEFAULT_OPTIONS.duplicate },
  };
}

export function buildPresetOptions(id: PresetId): TextCleanerOptions {
  const options = cloneDefaults();
  switch (id) {
    case "basic":
      options.whitespace.collapseSpaces = true;
      options.whitespace.trimLines = true;
      options.whitespace.blankLines = "keep";
      options.whitespace.mergeToOneLine = false;
      options.duplicate.enabled = false;
      return options;
    case "removeBlank":
      options.whitespace.collapseSpaces = true;
      options.whitespace.trimLines = true;
      options.whitespace.blankLines = "remove";
      options.whitespace.mergeToOneLine = false;
      options.duplicate.enabled = false;
      return options;
    case "removeDuplicate":
      options.whitespace.collapseSpaces = true;
      options.whitespace.trimLines = true;
      options.whitespace.blankLines = "keep";
      options.whitespace.mergeToOneLine = false;
      options.duplicate.enabled = true;
      options.duplicate.keep = "first";
      options.duplicate.resultType = "unique";
      return options;
    case "oneLine":
      options.whitespace.collapseSpaces = true;
      options.whitespace.trimLines = true;
      options.whitespace.blankLines = "remove";
      options.whitespace.mergeToOneLine = true;
      options.duplicate.enabled = false;
      return options;
    case "full":
      options.whitespace.collapseSpaces = true;
      options.whitespace.trimLines = true;
      options.whitespace.blankLines = "remove";
      options.whitespace.mergeToOneLine = false;
      options.duplicate.enabled = true;
      options.duplicate.keep = "first";
      options.duplicate.resultType = "unique";
      return options;
  }
}
