"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatJson,
  minifyJson,
  type JsonTransformError,
} from "@/lib/tools/json-formatter/transform-json";

export type JsonFormatterLabels = {
  inputLabel: string;
  inputDescription: string;
  placeholder: string;
  format: string;
  minify: string;
  copy: string;
  clear: string;
  copied: string;
  invalid: string;
  guidance: string;
  position: string;
  copyError: string;
};

type Feedback =
  | { type: "invalid"; location: JsonTransformError }
  | { type: "copy-error" }
  | { type: "copied" }
  | null;

export function JsonFormatter({ labels }: { labels: JsonFormatterLabels }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasContent = text.trim().length > 0;
  const hasAnyText = text.length > 0;
  const errorId = feedback?.type === "invalid" || feedback?.type === "copy-error"
    ? "json-formatter-error"
    : undefined;

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  function clearCopiedTimer() {
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }

  function runTransform(mode: "format" | "minify") {
    clearCopiedTimer();
    const result = mode === "format" ? formatJson(text) : minifyJson(text);
    if (result.ok) {
      setText(result.value);
      setFeedback(null);
    } else {
      setFeedback({ type: "invalid", location: result.error });
    }
  }

  async function copyText() {
    clearCopiedTimer();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setFeedback({ type: "copied" });
      copiedTimerRef.current = setTimeout(() => setFeedback(null), 1600);
    } catch {
      setFeedback({ type: "copy-error" });
    }
  }

  function clearText() {
    clearCopiedTimer();
    setText("");
    setFeedback(null);
    textareaRef.current?.focus();
  }

  const positionMessage = feedback?.type === "invalid" && feedback.location.line && feedback.location.column
    ? labels.position
        .replace("{line}", String(feedback.location.line))
        .replace("{column}", String(feedback.location.column))
    : null;

  return (
    <section aria-labelledby="json-formatter-editor-heading" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
      <h2 id="json-formatter-editor-heading" className="text-lg font-bold text-[var(--foreground)]">
        {labels.inputLabel}
      </h2>
      <p id="json-formatter-description" className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
        {labels.inputDescription}
      </p>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => {
          clearCopiedTimer();
          setText(event.target.value);
          setFeedback(null);
        }}
        aria-label={labels.inputLabel}
        aria-describedby={["json-formatter-description", errorId].filter(Boolean).join(" ")}
        aria-invalid={feedback?.type === "invalid" ? true : undefined}
        placeholder={labels.placeholder}
        spellCheck={false}
        className="mt-4 min-h-72 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
      />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Button onClick={() => runTransform("format")} disabled={!hasContent}>{labels.format}</Button>
        <Button variant="secondary" onClick={() => runTransform("minify")} disabled={!hasContent}>{labels.minify}</Button>
        <Button variant="secondary" onClick={copyText} disabled={!hasContent}>{labels.copy}</Button>
        <Button variant="secondary" onClick={clearText} disabled={!hasAnyText}>{labels.clear}</Button>
      </div>

      {feedback?.type === "invalid" ? (
        <div id="json-formatter-error" role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm text-[var(--error-fg)]">
          <p className="font-bold">{labels.invalid}</p>
          <p className="mt-1 leading-6">{labels.guidance}</p>
          {positionMessage ? <p className="mt-1 font-medium">{positionMessage}</p> : null}
        </div>
      ) : null}
      {feedback?.type === "copy-error" ? (
        <p id="json-formatter-error" role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium text-[var(--error-fg)]">{labels.copyError}</p>
      ) : null}
      {feedback?.type === "copied" ? (
        <p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-[var(--success-fg)]">{labels.copied}</p>
      ) : null}
    </section>
  );
}
