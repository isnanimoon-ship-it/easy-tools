"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { decodeBase64, encodeBase64 } from "@/lib/tools/base64-converter/base64";
import { decodeText, encodeText, type CharacterEncoding } from "@/lib/tools/base64-converter/character-encoding";
import { detectAndDecode } from "@/lib/tools/base64-converter/detect-encoding";

type EncodingChoice = "auto" | CharacterEncoding;
type Mode = "encode" | "decode";
type ErrorKind = "base64" | "unrepresentable" | "invalid-bytes" | "ambiguous" | "load" | "copy";

export type Base64ConverterLabels = {
  modeLabel: string; encodeMode: string; decodeMode: string; encodingLabel: string; encodingHelp: string;
  encodings: Record<EncodingChoice, string>;
  inputEncode: string; inputDecode: string; inputPlaceholderEncode: string; inputPlaceholderDecode: string;
  resultEncode: string; resultDecode: string; resultEmpty: string; encode: string; decode: string; clear: string; copy: string; copied: string; converting: string;
  applied: string; autoUsed: string; autoBom: string; autoEstimated: string; autoLow: string;
  errors: Record<ErrorKind, string>;
};

const choices: EncodingChoice[] = ["auto", "utf-8", "utf-16le", "utf-16be", "ascii", "iso-8859-1", "windows-1252", "euc-kr", "shift_jis"];

export function Base64Converter({ labels }: { labels: Base64ConverterLabels }) {
  const [mode, setMode] = useState<Mode>("encode");
  const [encoding, setEncoding] = useState<EncodingChoice>("auto");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [applied, setApplied] = useState(labels.autoUsed);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasContent = input.trim().length > 0;

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  function clearFeedback() {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = null;
    setError(null);
    setCopied(false);
  }

  function resetForMode(nextMode: Mode) {
    setMode(nextMode); setInput(""); setResult(""); clearFeedback();
    setApplied(encoding === "auto" && nextMode === "encode" ? labels.autoUsed : "");
  }

  function changeEncoding(next: EncodingChoice) {
    setEncoding(next); setResult(""); clearFeedback();
    setApplied(next === "auto" && mode === "encode" ? labels.autoUsed : "");
  }

  async function convert() {
    if (!hasContent || converting) return;
    clearFeedback(); setConverting(true); setResult("");
    try {
      if (mode === "encode") {
        const actual: CharacterEncoding = encoding === "auto" ? "utf-8" : encoding;
        const encoded = await encodeText(input, actual);
        if (!encoded.ok) {
          setError(encoded.reason === "load-failed" ? "load" : "unrepresentable");
          setApplied(""); return;
        }
        setResult(encodeBase64(encoded.value));
        setApplied(encoding === "auto" ? labels.autoUsed : labels.applied.replace("{encoding}", labels.encodings[actual]));
      } else {
        const base64 = decodeBase64(input);
        if (!base64.ok) { setError("base64"); setApplied(""); return; }
        if (encoding === "auto") {
          const detected = await detectAndDecode(base64.bytes);
          if (!detected.ok) { setError(detected.reason === "ambiguous" ? "ambiguous" : "invalid-bytes"); setApplied(""); return; }
          setResult(detected.value);
          const template = detected.confidence === "bom" ? labels.autoBom : detected.confidence === "low" ? labels.autoLow : labels.autoEstimated;
          setApplied(template.replace("{encoding}", labels.encodings[detected.encoding]));
        } else {
          const decoded = await decodeText(base64.bytes, encoding);
          if (!decoded.ok) { setError(decoded.reason === "load-failed" ? "load" : "invalid-bytes"); setApplied(""); return; }
          setResult(decoded.value);
          setApplied(labels.applied.replace("{encoding}", labels.encodings[encoding]));
        }
      }
    } finally { setConverting(false); }
  }

  function clear() {
    setInput(""); setResult(""); clearFeedback();
    setApplied(encoding === "auto" && mode === "encode" ? labels.autoUsed : "");
    inputRef.current?.focus();
  }

  async function copy() {
    clearFeedback();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result); setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch { setError("copy"); }
  }

  const errorId = error ? "base64-converter-error" : undefined;
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
    <div role="group" aria-label={labels.modeLabel} className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-muted)] p-1 sm:max-w-sm">
      {(["encode", "decode"] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => { if (mode !== item) resetForMode(item); }} className={`min-h-11 rounded-lg px-4 font-semibold outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${mode === item ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{item === "encode" ? labels.encodeMode : labels.decodeMode}</button>)}
    </div>

    <label className="mt-6 block max-w-sm text-sm font-semibold text-[var(--foreground)]">{labels.encodingLabel}
      <select value={encoding} onChange={(event) => changeEncoding(event.target.value as EncodingChoice)} aria-describedby="base64-encoding-help" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
        {choices.map((choice) => <option key={choice} value={choice}>{labels.encodings[choice]}</option>)}
      </select>
    </label>
    <p id="base64-encoding-help" className="mt-2 text-sm text-[var(--text-muted)]">{labels.encodingHelp}</p>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <label className="block font-bold text-[var(--foreground)]">{mode === "encode" ? labels.inputEncode : labels.inputDecode}
        <textarea ref={inputRef} value={input} onChange={(event) => { setInput(event.target.value); setResult(""); clearFeedback(); }} aria-describedby={errorId} aria-invalid={Boolean(error) || undefined} placeholder={mode === "encode" ? labels.inputPlaceholderEncode : labels.inputPlaceholderDecode} spellCheck={false} className="mt-2 min-h-64 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
      </label>
      <label className="block font-bold text-[var(--foreground)]">{mode === "encode" ? labels.resultEncode : labels.resultDecode}
        <textarea value={result} readOnly placeholder={labels.resultEmpty} spellCheck={false} className="mt-2 min-h-64 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--focus-ring)]" />
      </label>
    </div>

    <p className="mt-4 min-h-6 text-sm font-semibold text-[var(--info-fg)]" aria-live="polite">{applied}</p>
    {error ? <p id="base64-converter-error" role="alert" className="mt-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{labels.errors[error]}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Button onClick={convert} disabled={!hasContent || converting}>{converting ? labels.converting : mode === "encode" ? labels.encode : labels.decode}</Button>
      <Button variant="secondary" onClick={clear} disabled={input.length === 0 && result.length === 0 && !error}>{labels.clear}</Button>
      <Button variant="secondary" onClick={copy} disabled={!result}>{labels.copy}</Button>
    </div>
    {copied ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-fg)]">{labels.copied}</p> : null}
  </section>;
}
