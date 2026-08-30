import { DEFAULT_OPTIONS, type RegexRuleOptions, type TextCleanerOptions } from "./types";

export type PresetId = "basic" | "removeBlank" | "removeDuplicate" | "oneLine" | "full";

export const PRESET_IDS: PresetId[] = [
  "basic",
  "removeBlank",
  "removeDuplicate",
  "oneLine",
  "full",
];

// Presets only ever describe a whitespace/duplicate strategy — the regex
// rule is an independent, orthogonal step, so clicking a preset must not
// silently discard whatever custom rule the user already set up.
function cloneDefaults(regexRule: RegexRuleOptions): TextCleanerOptions {
  return {
    whitespace: { ...DEFAULT_OPTIONS.whitespace },
    duplicate: { ...DEFAULT_OPTIONS.duplicate },
    regexRule: { ...regexRule },
  };
}

export function buildPresetOptions(id: PresetId, regexRule: RegexRuleOptions = DEFAULT_OPTIONS.regexRule): TextCleanerOptions {
  const options = cloneDefaults(regexRule);
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
