"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cleanText } from "@/lib/tools/text-cleaner/pipeline";
import { buildPresetOptions, PRESET_IDS, type PresetId } from "@/lib/tools/text-cleaner/presets";
import type {
  BlankLineMode,
  DuplicateResultType,
  TextCleanerOptions,
} from "@/lib/tools/text-cleaner/types";
import { DEFAULT_OPTIONS } from "@/lib/tools/text-cleaner/types";
import {
  exceedsMaxInput,
  shouldWarnLargeInput,
} from "@/lib/tools/text-cleaner/validation";

const DEBOUNCE_MS = 200;
const LARGE_DEBOUNCE_MS = 500;
const LARGE_INPUT_THRESHOLD = 200_000;
const BLANK_LINE_MODES: BlankLineMode[] = ["keep", "collapse", "remove"];
const RESULT_TYPES: DuplicateResultType[] = ["unique", "duplicatesOnly", "onceOnly"];

function cloneOptions(options: TextCleanerOptions): TextCleanerOptions {
  return {
    whitespace: { ...options.whitespace },
    duplicate: { ...options.duplicate },
    regexRule: { ...options.regexRule },
  };
}

export function TextCleaner() {
  const t = useTranslations("Tools.textCleaner");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TextCleanerOptions>(() => cloneOptions(DEFAULT_OPTIONS));
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [debouncedInput, setDebouncedInput] = useState("");
  const [newline, setNewline] = useState<"lf" | "crlf">("lf");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const delay = input.length > LARGE_INPUT_THRESHOLD ? LARGE_DEBOUNCE_MS : DEBOUNCE_MS;
    const timer = setTimeout(() => setDebouncedInput(input), delay);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const tooLarge = useMemo(() => exceedsMaxInput(debouncedInput), [debouncedInput]);
  const perfWarning = useMemo(
    () => !tooLarge && shouldWarnLargeInput(debouncedInput),
    [debouncedInput, tooLarge],
  );

  const result = useMemo(() => {
    if (tooLarge) return null;
    return cleanText(debouncedInput, options);
  }, [debouncedInput, options, tooLarge]);

  const [prevResult, setPrevResult] = useState(result);
  const [outputValue, setOutputValue] = useState(result ? result.text : "");
  if (result !== prevResult) {
    setPrevResult(result);
    setOutputValue(result ? result.text : "");
  }

  const outputForDownload = newline === "crlf" ? outputValue.replace(/\n/g, "\r\n") : outputValue;

  function updateWhitespace(patch: Partial<TextCleanerOptions["whitespace"]>) {
    setSelectedPreset(null);
    setOptions((prev) => ({
      whitespace: { ...prev.whitespace, ...patch },
      duplicate: prev.duplicate,
      regexRule: prev.regexRule,
    }));
  }
  function updateDuplicate(patch: Partial<TextCleanerOptions["duplicate"]>) {
    setSelectedPreset(null);
    setOptions((prev) => ({
      whitespace: prev.whitespace,
      duplicate: { ...prev.duplicate, ...patch },
      regexRule: prev.regexRule,
    }));
  }
  // The regex rule is independent of the whitespace/duplicate presets, so
  // changing it does not clear the active preset badge, and applying a
  // preset does not discard whatever custom rule the user already set up.
  function updateRegexRule(patch: Partial<TextCleanerOptions["regexRule"]>) {
    setOptions((prev) => ({
      whitespace: prev.whitespace,
      duplicate: prev.duplicate,
      regexRule: { ...prev.regexRule, ...patch },
    }));
  }
  function applyPreset(id: PresetId) {
    setSelectedPreset(id);
    setOptions(buildPresetOptions(id, options.regexRule));
  }
  function resetAll() {
    setInput("");
    setDebouncedInput("");
    setOptions(cloneOptions(DEFAULT_OPTIONS));
    setSelectedPreset(null);
    inputRef.current?.focus();
  }
  async function copyResult() {
    if (!outputValue) return;
    try {
      await navigator.clipboard.writeText(outputValue);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission denied);
      // the button simply stays unconfirmed, no separate error state needed.
    }
  }
  function downloadResult() {
    if (!outputValue) return;
    const blob = new Blob([outputForDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaned-text.txt";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const stats = result?.stats;
  const mergedToOneLine = result?.mergedToOneLine ?? false;
  const dedupActive = options.duplicate.enabled && !mergedToOneLine;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="text-cleaner-presets-heading"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <h2 id="text-cleaner-presets-heading" className="font-bold text-[var(--foreground)]">
          {t("presets.title")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              aria-pressed={selectedPreset === id}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                selectedPreset === id
                  ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {t(`presets.${id}`)}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="text-cleaner-input-label"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label id="text-cleaner-input-label" htmlFor="text-cleaner-input" className="block text-lg font-bold text-[var(--foreground)]">
                {t("input.label")}
              </label>
              <Button variant="secondary" disabled={!input} onClick={resetAll}>
                <RotateCcw size={17} />
                {t("actions.reset")}
              </Button>
            </div>
            <textarea
              ref={inputRef}
              id="text-cleaner-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("input.placeholder")}
              rows={12}
              spellCheck={false}
              className="min-h-72 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 leading-7 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
            />
            {tooLarge ? (
              <p role="alert" className="mt-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">
                {t("input.tooLarge")}
              </p>
            ) : perfWarning ? (
              <p className="mt-3 rounded-xl bg-[var(--warning-bg)] p-3 text-sm font-semibold text-[var(--warning-fg)]">
                {t("input.perfWarning")}
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="text-cleaner-output-label"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label id="text-cleaner-output-label" htmlFor="text-cleaner-output" className="block text-lg font-bold text-[var(--foreground)]">
                {t("output.label")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!outputValue} onClick={copyResult}>
                  <Copy size={17} />
                  {copied ? t("actions.copied") : t("actions.copy")}
                </Button>
                <Button variant="secondary" disabled={!outputValue} onClick={downloadResult}>
                  <Download size={17} />
                  {t("actions.download")}
                </Button>
              </div>
            </div>
            <textarea
              id="text-cleaner-output"
              value={outputValue}
              onChange={(event) => setOutputValue(event.target.value)}
              rows={12}
              spellCheck={false}
              className="min-h-72 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 leading-7 text-[var(--foreground)] focus:border-[var(--primary)]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-muted)]">{t("output.overwriteNotice")}</p>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                {t("output.newline")}
                <select
                  value={newline}
                  onChange={(event) => setNewline(event.target.value as "lf" | "crlf")}
                  className="min-h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                >
                  <option value="lf">LF</option>
                  <option value="crlf">CRLF</option>
                </select>
              </label>
            </div>
          </section>

          {stats ? (
            <section aria-labelledby="text-cleaner-stats-heading">
              <h2 id="text-cleaner-stats-heading" className="text-xl font-bold text-[var(--foreground)]">
                {t("stats.label")}
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {!mergedToOneLine ? (
                  <>
                    <StatCard label={t("stats.originalLines")} value={stats.originalLines} testId="original-lines" />
                    <StatCard label={t("stats.resultLines")} value={stats.resultLines} testId="result-lines" />
                    <StatCard label={t("stats.removedLines")} value={stats.removedLines} testId="removed-lines" />
                  </>
                ) : null}
                <StatCard label={t("stats.originalChars")} value={stats.originalChars} testId="original-chars" />
                <StatCard label={t("stats.resultChars")} value={stats.resultChars} testId="result-chars" />
                {dedupActive && stats.uniqueLines !== undefined ? (
                  <>
                    <StatCard label={t("stats.uniqueLines")} value={stats.uniqueLines} testId="unique-lines" />
                    <StatCard label={t("stats.duplicateLines")} value={stats.duplicateLines ?? 0} testId="duplicate-lines" />
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="font-bold text-[var(--foreground)]">{t("whitespace.title")}</h2>
            <div className="mt-3 space-y-3 text-sm">
              <Checkbox
                checked={options.whitespace.collapseSpaces}
                onChange={(checked) => updateWhitespace({ collapseSpaces: checked })}
                label={t("whitespace.collapseSpaces")}
              />
              <Checkbox
                checked={options.whitespace.trimLines}
                onChange={(checked) => updateWhitespace({ trimLines: checked })}
                label={t("whitespace.trimLines")}
              />
              <Checkbox
                checked={options.whitespace.tabToSpaces}
                onChange={(checked) => updateWhitespace({ tabToSpaces: checked })}
                label={t("whitespace.tabToSpaces")}
              />
              <Checkbox
                checked={options.whitespace.normalizeSpecialSpaces}
                onChange={(checked) => updateWhitespace({ normalizeSpecialSpaces: checked })}
                label={t("whitespace.normalizeSpecialSpaces")}
              />
              <div>
                <p className="font-semibold text-[var(--foreground)]">{t("whitespace.blankLines.title")}</p>
                <div className="mt-2 space-y-2">
                  {BLANK_LINE_MODES.map((mode) => (
                    <label key={mode} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="blank-line-mode"
                        checked={options.whitespace.blankLines === mode}
                        onChange={() => updateWhitespace({ blankLines: mode })}
                        className="size-4"
                      />
                      {t(`whitespace.blankLines.${mode}`)}
                    </label>
                  ))}
                </div>
              </div>
              <Checkbox
                checked={options.whitespace.mergeToOneLine}
                onChange={(checked) => updateWhitespace({ mergeToOneLine: checked })}
                label={t("whitespace.mergeToOneLine")}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <Checkbox
              checked={options.duplicate.enabled}
              onChange={(checked) => updateDuplicate({ enabled: checked })}
              label={t("duplicate.title")}
              bold
            />
            {options.duplicate.enabled ? (
              <div className="mt-3 space-y-3 text-sm">
                {mergedToOneLine ? (
                  <p className="rounded-lg bg-[var(--warning-bg)] p-2 text-xs font-semibold text-[var(--warning-fg)]">
                    {t("duplicate.disabledByMerge")}
                  </p>
                ) : null}
                <Checkbox
                  checked={!options.duplicate.caseSensitive}
                  onChange={(checked) => updateDuplicate({ caseSensitive: !checked })}
                  label={t("duplicate.ignoreCase")}
                />
                <Checkbox
                  checked={options.duplicate.ignoreSurroundingWhitespace}
                  onChange={(checked) => updateDuplicate({ ignoreSurroundingWhitespace: checked })}
                  label={t("duplicate.ignoreSurroundingWhitespace")}
                />
                <Checkbox
                  checked={options.duplicate.ignoreInnerWhitespaceDiff}
                  onChange={(checked) => updateDuplicate({ ignoreInnerWhitespaceDiff: checked })}
                  label={t("duplicate.ignoreInnerWhitespaceDiff")}
                />
                <Checkbox
                  checked={options.duplicate.unicodeNormalize}
                  onChange={(checked) => updateDuplicate({ unicodeNormalize: checked })}
                  label={t("duplicate.unicodeNormalize")}
                />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("duplicate.keep.title")}</p>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="duplicate-keep"
                        checked={options.duplicate.keep === "first"}
                        onChange={() => updateDuplicate({ keep: "first" })}
                        className="size-4"
                      />
                      {t("duplicate.keep.first")}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="duplicate-keep"
                        checked={options.duplicate.keep === "last"}
                        onChange={() => updateDuplicate({ keep: "last" })}
                        className="size-4"
                      />
                      {t("duplicate.keep.last")}
                    </label>
                  </div>
                </div>
                <label className="block">
                  <span className="font-semibold text-[var(--foreground)]">{t("duplicate.resultType.title")}</span>
                  <select
                    value={options.duplicate.resultType}
                    onChange={(event) => updateDuplicate({ resultType: event.target.value as DuplicateResultType })}
                    className="mt-2 min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                  >
                    {RESULT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`duplicate.resultType.${type}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <Checkbox
              checked={options.regexRule.enabled}
              onChange={(checked) => updateRegexRule({ enabled: checked })}
              label={t("regexRule.title")}
              bold
            />
            {options.regexRule.enabled ? (
              <div className="mt-3 space-y-3 text-sm">
                <p className="text-xs text-[var(--text-muted)]">{t("regexRule.help")}</p>
                <label className="block">
                  <span className="font-semibold text-[var(--foreground)]">{t("regexRule.pattern")}</span>
                  <input
                    type="text"
                    value={options.regexRule.pattern}
                    onChange={(event) => updateRegexRule({ pattern: event.target.value })}
                    placeholder={t("regexRule.patternPlaceholder")}
                    spellCheck={false}
                    className="mt-1 min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-[var(--foreground)]">{t("regexRule.replacement")}</span>
                  <input
                    type="text"
                    value={options.regexRule.replacement}
                    onChange={(event) => updateRegexRule({ replacement: event.target.value })}
                    placeholder={t("regexRule.replacementPlaceholder")}
                    spellCheck={false}
                    className="mt-1 min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-xs"
                  />
                </label>
                <Checkbox
                  checked={options.regexRule.ignoreCase}
                  onChange={(checked) => updateRegexRule({ ignoreCase: checked })}
                  label={t("regexRule.ignoreCase")}
                />
                {result?.regexError ? (
                  <p role="alert" className="rounded-lg bg-[var(--error-bg)] p-2 text-xs font-semibold text-[var(--error-fg)]">
                    {t("regexRule.invalidPattern", { message: result.regexError })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  bold,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  bold?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4"
      />
      <span className={bold ? "font-bold text-[var(--foreground)]" : ""}>{label}</span>
    </label>
  );
}

function StatCard({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <dt className="break-keep text-sm font-semibold leading-5 text-[var(--text-muted)]">{label}</dt>
      <dd data-testid={testId} className="mt-2 break-all text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
