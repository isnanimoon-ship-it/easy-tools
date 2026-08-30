"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { generatePassphrase, type PassphraseSeparator } from "@/lib/tools/password-generator/generate-passphrase";
import { generatePassword, type PasswordOptions } from "@/lib/tools/password-generator/generate-password";
import { getPasswordStrength, type PasswordStrength } from "@/lib/tools/password-generator/password-strength";

type SeparatorId = "hyphen" | "underscore" | "period" | "space" | "none";
const SEPARATOR_IDS: SeparatorId[] = ["hyphen", "underscore", "period", "space", "none"];
const SEPARATOR_VALUES: Record<SeparatorId, PassphraseSeparator> = { hyphen: "-", underscore: "_", period: ".", space: " ", none: "" };

export type PasswordGeneratorLabels = {
  modeLabel: string; modeCharacters: string; modePassphrase: string;
  lengthGroup: string; rangeLabel: string; numberLabel: string; characterTypes: string;
  uppercase: string; lowercase: string; numbers: string; symbols: string;
  wordCountGroup: string; wordCountRangeLabel: string; wordCountNumberLabel: string;
  optionsGroup: string; separatorLabel: string; separators: Record<SeparatorId, string>; capitalizeLabel: string; includeNumberLabel: string;
  generate: string; resultLabel: string; emptyResult: string; copy: string; copied: string;
  strengthLabel: string; strength: Record<PasswordStrength, string>; strengthDescription: Record<PasswordStrength, string>; strengthNotice: string;
  allDisabledError: string; lengthError: string; wordCountError: string; randomError: string; copyError: string;
};

type Mode = "characters" | "passphrase";
type Feedback = "all-disabled" | "length" | "word-count" | "random" | "copy-error" | "copied" | null;
type Result = { text: string; length: number; poolSize: number };

const initialOptions: PasswordOptions = { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true };

function tabClass(active: boolean) {
  return `min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"}`;
}

export function PasswordGenerator({ labels }: { labels: PasswordGeneratorLabels }) {
  const [mode, setMode] = useState<Mode>("characters");
  const [options, setOptions] = useState(initialOptions);
  const [lengthInput, setLengthInput] = useState("16");

  const [wordCount, setWordCount] = useState(4);
  const [wordCountInput, setWordCountInput] = useState("4");
  const [separatorId, setSeparatorId] = useState<SeparatorId>("hyphen");
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  const [result, setResult] = useState<Result | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCount = Number(options.uppercase) + Number(options.lowercase) + Number(options.numbers) + Number(options.symbols);
  const strength = result ? getPasswordStrength(result.length, result.poolSize) : null;

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  function resetTransientState(nextFeedback: Feedback = null) {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = null;
    setResult(null);
    setFeedback(nextFeedback);
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    resetTransientState();
  }

  function normalizeLength(showError: boolean) {
    if (lengthInput.trim() === "") {
      if (showError) setFeedback("length");
      return null;
    }
    const parsed = Number(lengthInput);
    if (!Number.isFinite(parsed)) {
      if (showError) setFeedback("length");
      return null;
    }
    const normalized = Math.min(128, Math.max(8, Math.trunc(parsed)));
    setLengthInput(String(normalized));
    setOptions((current) => ({ ...current, length: normalized }));
    if (feedback === "length") setFeedback(null);
    return normalized;
  }

  function changeType(key: "uppercase" | "lowercase" | "numbers" | "symbols", checked: boolean) {
    const next = { ...options, [key]: checked };
    setOptions(next);
    const noneSelected = !next.uppercase && !next.lowercase && !next.numbers && !next.symbols;
    resetTransientState(noneSelected ? "all-disabled" : null);
  }

  function changeLengthInput(value: string) {
    setLengthInput(value);
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isInteger(parsed) && parsed >= 8 && parsed <= 128) {
      setOptions((current) => ({ ...current, length: parsed }));
    }
    resetTransientState();
  }

  function normalizeWordCount(showError: boolean) {
    if (wordCountInput.trim() === "") {
      if (showError) setFeedback("word-count");
      return null;
    }
    const parsed = Number(wordCountInput);
    if (!Number.isFinite(parsed)) {
      if (showError) setFeedback("word-count");
      return null;
    }
    const normalized = Math.min(6, Math.max(3, Math.trunc(parsed)));
    setWordCountInput(String(normalized));
    setWordCount(normalized);
    if (feedback === "word-count") setFeedback(null);
    return normalized;
  }

  function changeWordCountInput(value: string) {
    setWordCountInput(value);
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isInteger(parsed) && parsed >= 3 && parsed <= 6) {
      setWordCount(parsed);
    }
    resetTransientState();
  }

  function handleGenerate() {
    if (mode === "characters") {
      const length = normalizeLength(true);
      if (length === null || selectedCount === 0) return;
      const generated = generatePassword({ ...options, length });
      if (!generated.ok) {
        setResult(null);
        setFeedback(generated.reason === "random-unavailable" ? "random" : generated.reason === "invalid-length" ? "length" : "all-disabled");
        return;
      }
      setResult({ text: generated.password, length: generated.password.length, poolSize: generated.poolSize });
      setFeedback(null);
      return;
    }
    const count = normalizeWordCount(true);
    if (count === null) return;
    const generated = generatePassphrase({ wordCount: count, separator: SEPARATOR_VALUES[separatorId], capitalize, includeNumber });
    if (!generated.ok) {
      setResult(null);
      setFeedback(generated.reason === "random-unavailable" ? "random" : "word-count");
      return;
    }
    setResult({ text: generated.passphrase, length: generated.wordCount, poolSize: generated.poolSize });
    setFeedback(null);
  }

  async function handleCopy() {
    if (!result) return;
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result.text);
      setFeedback("copied");
      copiedTimer.current = setTimeout(() => setFeedback(null), 1600);
    } catch {
      setFeedback("copy-error");
    }
  }

  const errorMessage = feedback === "all-disabled" ? labels.allDisabledError : feedback === "length" ? labels.lengthError : feedback === "word-count" ? labels.wordCountError : feedback === "random" ? labels.randomError : feedback === "copy-error" ? labels.copyError : null;
  const errorId = "password-generator-error";

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
    <div role="tablist" aria-label={labels.modeLabel} className="flex flex-wrap gap-2">
      <button type="button" role="tab" aria-selected={mode === "characters"} onClick={() => switchMode("characters")} className={tabClass(mode === "characters")}>{labels.modeCharacters}</button>
      <button type="button" role="tab" aria-selected={mode === "passphrase"} onClick={() => switchMode("passphrase")} className={tabClass(mode === "passphrase")}>{labels.modePassphrase}</button>
    </div>

    {mode === "characters" ? <>
      <fieldset className="mt-6" aria-describedby={feedback === "length" ? errorId : undefined}>
        <legend className="text-lg font-bold text-[var(--foreground)]">{labels.lengthGroup}</legend>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.rangeLabel}
            <input type="range" min="8" max="128" step="1" value={options.length} onChange={(event) => { const length = Number(event.target.value); setOptions((current) => ({ ...current, length })); setLengthInput(String(length)); resetTransientState(); }} className="mt-3 h-11 w-full accent-blue-600" />
          </label>
          <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.numberLabel}
            <input type="number" min="8" max="128" step="1" value={lengthInput} aria-invalid={feedback === "length" || undefined} aria-describedby={feedback === "length" ? errorId : undefined} onChange={(event) => changeLengthInput(event.target.value)} onBlur={() => normalizeLength(true)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-7" aria-describedby={feedback === "all-disabled" ? errorId : undefined}>
        <legend className="text-lg font-bold text-[var(--foreground)]">{labels.characterTypes}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["uppercase", "lowercase", "numbers", "symbols"] as const).map((key) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
            <input type="checkbox" checked={options[key]} onChange={(event) => changeType(key, event.target.checked)} className="size-5 accent-blue-600" />
            {labels[key]}
          </label>)}
        </div>
      </fieldset>
    </> : <>
      <fieldset className="mt-6" aria-describedby={feedback === "word-count" ? errorId : undefined}>
        <legend className="text-lg font-bold text-[var(--foreground)]">{labels.wordCountGroup}</legend>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.wordCountRangeLabel}
            <input type="range" min="3" max="6" step="1" value={wordCount} onChange={(event) => { const count = Number(event.target.value); setWordCount(count); setWordCountInput(String(count)); resetTransientState(); }} className="mt-3 h-11 w-full accent-blue-600" />
          </label>
          <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.wordCountNumberLabel}
            <input type="number" min="3" max="6" step="1" value={wordCountInput} aria-invalid={feedback === "word-count" || undefined} aria-describedby={feedback === "word-count" ? errorId : undefined} onChange={(event) => changeWordCountInput(event.target.value)} onBlur={() => normalizeWordCount(true)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="text-lg font-bold text-[var(--foreground)]">{labels.optionsGroup}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.separatorLabel}
            <select value={separatorId} onChange={(event) => { setSeparatorId(event.target.value as SeparatorId); resetTransientState(); }} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3">
              {SEPARATOR_IDS.map((id) => <option key={id} value={id}>{labels.separators[id]}</option>)}
            </select>
          </label>
          <div className="grid gap-3 content-end">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
              <input type="checkbox" checked={capitalize} onChange={(event) => { setCapitalize(event.target.checked); resetTransientState(); }} className="size-5 accent-blue-600" />
              {labels.capitalizeLabel}
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
              <input type="checkbox" checked={includeNumber} onChange={(event) => { setIncludeNumber(event.target.checked); resetTransientState(); }} className="size-5 accent-blue-600" />
              {labels.includeNumberLabel}
            </label>
          </div>
        </div>
      </fieldset>
    </>}

    {errorMessage ? <p id={errorId} role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{errorMessage}</p> : null}

    <Button onClick={handleGenerate} disabled={mode === "characters" && selectedCount === 0} className="mt-6 w-full sm:w-auto">{labels.generate}</Button>

    <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <h2 className="font-bold text-[var(--foreground)]">{labels.resultLabel}</h2>
      {result ? <output className="mt-3 block break-all rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-base leading-7 text-[var(--foreground)]" aria-live="polite">{result.text}</output> : <p className="mt-3 text-sm text-[var(--text-muted)]">{labels.emptyResult}</p>}
      {strength ? <div className="mt-5">
        <div className="flex items-center justify-between gap-3"><span className="font-semibold text-[var(--foreground)]">{labels.strengthLabel}</span><strong>{labels.strength[strength.level]}</strong></div>
        <meter min="0" max="100" value={strength.meterValue} aria-label={`${labels.strengthLabel}: ${labels.strength[strength.level]}`} className="mt-2 h-3 w-full" />
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{labels.strengthDescription[strength.level]}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{labels.strengthNotice}</p>
      </div> : null}
      <Button variant="secondary" onClick={handleCopy} disabled={!result} className="mt-5 w-full sm:w-auto">{labels.copy}</Button>
      {feedback === "copied" ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-fg)]">{labels.copied}</p> : null}
    </div>
  </section>;
}
