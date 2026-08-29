"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { generatePassword, type PasswordOptions } from "@/lib/tools/password-generator/generate-password";
import { getPasswordStrength, type PasswordStrength } from "@/lib/tools/password-generator/password-strength";

export type PasswordGeneratorLabels = {
  lengthGroup: string; rangeLabel: string; numberLabel: string; characterTypes: string;
  uppercase: string; lowercase: string; numbers: string; symbols: string;
  generate: string; resultLabel: string; emptyResult: string; copy: string; copied: string;
  strengthLabel: string; strength: Record<PasswordStrength, string>; strengthDescription: Record<PasswordStrength, string>; strengthNotice: string;
  allDisabledError: string; lengthError: string; randomError: string; copyError: string;
};

type Feedback = "all-disabled" | "length" | "random" | "copy-error" | "copied" | null;
const initialOptions: PasswordOptions = { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true };

export function PasswordGenerator({ labels }: { labels: PasswordGeneratorLabels }) {
  const [options, setOptions] = useState(initialOptions);
  const [lengthInput, setLengthInput] = useState("16");
  const [result, setResult] = useState<{ password: string; poolSize: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCount = Number(options.uppercase) + Number(options.lowercase) + Number(options.numbers) + Number(options.symbols);
  const strength = result ? getPasswordStrength(result.password.length, result.poolSize) : null;

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  function resetTransientState(nextFeedback: Feedback = null) {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = null;
    setResult(null);
    setFeedback(nextFeedback);
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

  function handleGenerate() {
    const length = normalizeLength(true);
    if (length === null || selectedCount === 0) return;
    const generated = generatePassword({ ...options, length });
    if (!generated.ok) {
      setResult(null);
      setFeedback(generated.reason === "random-unavailable" ? "random" : generated.reason === "invalid-length" ? "length" : "all-disabled");
      return;
    }
    setResult({ password: generated.password, poolSize: generated.poolSize });
    setFeedback(null);
  }

  async function handleCopy() {
    if (!result) return;
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result.password);
      setFeedback("copied");
      copiedTimer.current = setTimeout(() => setFeedback(null), 1600);
    } catch {
      setFeedback("copy-error");
    }
  }

  const errorMessage = feedback === "all-disabled" ? labels.allDisabledError : feedback === "length" ? labels.lengthError : feedback === "random" ? labels.randomError : feedback === "copy-error" ? labels.copyError : null;

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
    <fieldset aria-describedby={feedback === "length" ? "password-generator-error" : undefined}>
      <legend className="text-lg font-bold text-[var(--foreground)]">{labels.lengthGroup}</legend>
      <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_8rem]">
        <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.rangeLabel}
          <input type="range" min="8" max="128" step="1" value={options.length} onChange={(event) => { const length = Number(event.target.value); setOptions((current) => ({ ...current, length })); setLengthInput(String(length)); resetTransientState(); }} className="mt-3 h-11 w-full accent-blue-600" />
        </label>
        <label className="block text-sm font-semibold text-[var(--foreground)]">{labels.numberLabel}
          <input type="number" min="8" max="128" step="1" value={lengthInput} aria-invalid={feedback === "length" || undefined} aria-describedby={feedback === "length" ? "password-generator-error" : undefined} onChange={(event) => changeLengthInput(event.target.value)} onBlur={() => normalizeLength(true)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
        </label>
      </div>
    </fieldset>

    <fieldset className="mt-7" aria-describedby={feedback === "all-disabled" ? "password-generator-error" : undefined}>
      <legend className="text-lg font-bold text-[var(--foreground)]">{labels.characterTypes}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["uppercase", "lowercase", "numbers", "symbols"] as const).map((key) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
          <input type="checkbox" checked={options[key]} onChange={(event) => changeType(key, event.target.checked)} className="size-5 accent-blue-600" />
          {labels[key]}
        </label>)}
      </div>
    </fieldset>

    {errorMessage ? <p id="password-generator-error" role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{errorMessage}</p> : null}

    <Button onClick={handleGenerate} disabled={selectedCount === 0} className="mt-6 w-full sm:w-auto">{labels.generate}</Button>

    <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <h2 className="font-bold text-[var(--foreground)]">{labels.resultLabel}</h2>
      {result ? <output className="mt-3 block break-all rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-base leading-7 text-[var(--foreground)]" aria-live="polite">{result.password}</output> : <p className="mt-3 text-sm text-[var(--text-muted)]">{labels.emptyResult}</p>}
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
