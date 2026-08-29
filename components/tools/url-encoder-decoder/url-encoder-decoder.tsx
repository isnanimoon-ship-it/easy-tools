"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  transformUrl,
  type UrlConversionMode,
  type UrlEncodingType,
  type UrlTransformError,
} from "@/lib/tools/url-encoder-decoder/transform-url";

type UiError = UrlTransformError | "copy";

export type UrlEncoderDecoderLabels = {
  modeLabel: string;
  encodeMode: string;
  decodeMode: string;
  typeLabel: string;
  componentType: string;
  fullUrlType: string;
  componentHelp: string;
  fullUrlHelp: string;
  plusHelp: string;
  inputEncode: string;
  inputDecode: string;
  inputPlaceholderEncode: string;
  inputPlaceholderDecode: string;
  resultEncode: string;
  resultDecode: string;
  resultEmpty: string;
  encode: string;
  decode: string;
  clear: string;
  copy: string;
  copied: string;
  operations: Record<`${UrlConversionMode}-${UrlEncodingType}`, string>;
  errors: Record<UiError, string>;
};

export function UrlEncoderDecoder({ labels }: { labels: UrlEncoderDecoderLabels }) {
  const [mode, setMode] = useState<UrlConversionMode>("encode");
  const [encodingType, setEncodingType] = useState<UrlEncodingType>("component");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [operation, setOperation] = useState("");
  const [error, setError] = useState<UiError | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInput = input.length > 0;

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function clearFeedback() {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = null;
    setError(null);
    setCopied(false);
  }

  function changeMode(next: UrlConversionMode) {
    setMode(next);
    setResult("");
    setOperation("");
    clearFeedback();
  }

  function changeEncodingType(next: UrlEncodingType) {
    setEncodingType(next);
    setResult("");
    setOperation("");
    clearFeedback();
  }

  function convert() {
    if (!hasInput) return;
    clearFeedback();
    const transformed = transformUrl(input, mode, encodingType);
    if (!transformed.ok) {
      setResult("");
      setOperation("");
      setError(transformed.reason);
      return;
    }
    setResult(transformed.value);
    setOperation(labels.operations[`${mode}-${encodingType}`]);
  }

  function clear() {
    setInput("");
    setResult("");
    setOperation("");
    clearFeedback();
    inputRef.current?.focus();
  }

  async function copy() {
    clearFeedback();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("copy");
    }
  }

  const errorId = error ? "url-encoder-decoder-error" : undefined;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">{labels.modeLabel}</p>
          <div role="group" aria-label={labels.modeLabel} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-muted)] p-1">
            {(["encode", "decode"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={mode === item} onClick={() => mode !== item && changeMode(item)} className={`min-h-11 rounded-lg px-4 font-semibold outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${mode === item ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>
                {item === "encode" ? labels.encodeMode : labels.decodeMode}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">{labels.typeLabel}</p>
          <div role="group" aria-label={labels.typeLabel} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-muted)] p-1">
            {(["component", "full-url"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={encodingType === item} onClick={() => encodingType !== item && changeEncodingType(item)} className={`min-h-11 rounded-lg px-3 font-semibold outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${encodingType === item ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>
                {item === "component" ? labels.componentType : labels.fullUrlType}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="url-encoding-type-help" className="mt-5 grid gap-2 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2">
        <p><strong className="text-[var(--foreground)]">{labels.componentType}:</strong> {labels.componentHelp}</p>
        <p><strong className="text-[var(--foreground)]">{labels.fullUrlType}:</strong> {labels.fullUrlHelp}</p>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
        <label className="min-w-0 font-bold text-[var(--foreground)]">
          {mode === "encode" ? labels.inputEncode : labels.inputDecode}
          <textarea ref={inputRef} value={input} onChange={(event) => { setInput(event.target.value); clearFeedback(); }} aria-describedby={errorId} aria-invalid={Boolean(error) || undefined} placeholder={mode === "encode" ? labels.inputPlaceholderEncode : labels.inputPlaceholderDecode} spellCheck={false} className="mt-2 min-h-40 w-full min-w-0 resize-y overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:min-h-52" />
        </label>
        <label className="min-w-0 font-bold text-[var(--foreground)]">
          {mode === "encode" ? labels.resultEncode : labels.resultDecode}
          <textarea value={result} readOnly placeholder={labels.resultEmpty} spellCheck={false} className="mt-2 min-h-40 w-full min-w-0 resize-y overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--focus-ring)] sm:min-h-52" />
        </label>
      </div>

      <p className="mt-4 min-h-6 text-sm font-semibold text-[var(--info-fg)]" aria-live="polite">{operation}</p>
      {error ? <p id="url-encoder-decoder-error" role="alert" className="mt-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{labels.errors[error]}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Button onClick={convert} disabled={!hasInput}>{mode === "encode" ? labels.encode : labels.decode}</Button>
        <Button variant="secondary" onClick={clear} disabled={!input && !result && !error}>{labels.clear}</Button>
        <Button variant="secondary" onClick={copy} disabled={!result}>{labels.copy}</Button>
      </div>
      {copied ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-fg)]">{labels.copied}</p> : null}
      <p className="mt-5 rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">{labels.plusHelp}</p>
    </section>
  );
}
