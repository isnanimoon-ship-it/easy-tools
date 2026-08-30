"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clipboard, Download, Play, Rows3, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applyCommaStyle, type SqlCommaStyle } from "@/lib/tools/sql-formatter/comma-style";
import { SQL_EXAMPLES } from "@/lib/tools/sql-formatter/examples";
import {
  DEFAULT_SQL_FORMAT_OPTIONS, INDENT_STYLES, KEYWORD_CASES, SQL_DIALECTS,
  type SqlDialect, type SqlFormatOptions, type SqlIndentStyle, type SqlKeywordCase, type SqlLogicalOperatorNewline,
} from "@/lib/tools/sql-formatter/format-sql";
import { minifySql } from "@/lib/tools/sql-formatter/minify-sql";
import { createSqlFormatWorker } from "@/lib/tools/sql-formatter/worker-client";
import type { SqlFormatResponse } from "@/lib/tools/sql-formatter/sql-format-worker";

const LOGICAL_OPERATOR_NEWLINES: readonly SqlLogicalOperatorNewline[] = ["before", "after"];
const COMMA_STYLES: readonly SqlCommaStyle[] = ["trailing", "leading"];

type FeedbackError = "input-too-long" | "parse-error" | "worker-error" | "copy-failed" | "download-failed";
type Phase = "idle" | "running" | "success" | "error";

export type SqlFormatterLabels = {
  inputLabel: string; inputHelp: string; placeholder: string;
  dialectLabel: string; dialects: Record<SqlDialect, string>;
  keywordCaseLabel: string; keywordCases: Record<SqlKeywordCase, string>;
  indentLabel: string; indents: Record<SqlIndentStyle, string>;
  logicalOperatorLabel: string; logicalOperators: Record<SqlLogicalOperatorNewline, string>;
  commaStyleLabel: string; commaStyles: Record<SqlCommaStyle, string>;
  format: string; minify: string; clear: string; copy: string; copied: string; download: string; downloaded: string;
  resultLabel: string; resultEmpty: string; running: string;
  retryGeneric: string;
  examplesTitle: string; examplesHint: string;
  errors: Record<FeedbackError, string>;
};

export function SqlFormatter({ labels }: { labels: SqlFormatterLabels }) {
  const [dialect, setDialect] = useState<SqlDialect>(DEFAULT_SQL_FORMAT_OPTIONS.dialect);
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>(DEFAULT_SQL_FORMAT_OPTIONS.keywordCase);
  const [indent, setIndent] = useState<SqlIndentStyle>(DEFAULT_SQL_FORMAT_OPTIONS.indent);
  const [logicalOperatorNewline, setLogicalOperatorNewline] = useState<SqlLogicalOperatorNewline>(DEFAULT_SQL_FORMAT_OPTIONS.logicalOperatorNewline);
  const [commaStyle, setCommaStyle] = useState<SqlCommaStyle>("trailing");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<FeedbackError | null>(null);
  const [feedback, setFeedback] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const pendingActionRef = useRef<"format" | "minify">("format");
  const commaStyleRef = useRef<SqlCommaStyle>(commaStyle);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialectId = useId(); const keywordCaseId = useId(); const indentId = useId(); const logicalOperatorId = useId(); const commaStyleId = useId();

  useEffect(() => { commaStyleRef.current = commaStyle; }, [commaStyle]);

  function options(): SqlFormatOptions {
    return { dialect, keywordCase, indent, logicalOperatorNewline };
  }

  function clearFeedback() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    setFeedback("");
    if (error === "copy-failed" || error === "download-failed") setError(null);
  }

  // A single Worker is created once and reused for every format/minify request, rather than a new
  // Worker per request. Recreating the module Worker on every click means the browser needs to
  // re-fetch its script each time; in the dev server (and potentially with aggressive cache
  // policies in general) that fetch can fail while offline, silently hanging the "running" phase
  // forever. Loading the worker module once while the page is still online, then reusing it,
  // keeps the tool working offline exactly as the privacy section promises.
  useEffect(() => {
    const worker = createSqlFormatWorker();
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SqlFormatResponse>) => {
      if (event.data.requestId !== requestId.current) return;
      if (!event.data.ok) {
        setPhase("error");
        setError(event.data.reason);
        return;
      }
      const value = pendingActionRef.current === "minify"
        ? minifySql(event.data.value)
        : applyCommaStyle(event.data.value, commaStyleRef.current);
      setResult(value);
      setPhase("success");
    };
    worker.onerror = () => {
      setPhase("error");
      setError("worker-error");
    };
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  function runFormat(action: "format" | "minify", sourceText: string, overrideDialect?: SqlDialect) {
    if (sourceText.trim() === "") return;
    const worker = workerRef.current;
    if (!worker) return;
    clearFeedback();
    pendingActionRef.current = action;
    const id = ++requestId.current;
    setPhase("running");
    setError(null);
    worker.postMessage({ requestId: id, sql: sourceText, options: { ...options(), dialect: overrideDialect ?? dialect } });
  }

  function clear() {
    clearFeedback();
    requestId.current += 1;
    setInput("");
    setResult("");
    setPhase("idle");
    setError(null);
    inputRef.current?.focus();
  }

  function loadExample() {
    clearFeedback();
    setInput(SQL_EXAMPLES[dialect]);
    setResult("");
    setPhase("idle");
    setError(null);
  }

  async function copy() {
    clearFeedback();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result);
      setFeedback(labels.copied);
      feedbackTimer.current = setTimeout(() => setFeedback(""), 1600);
    } catch {
      setError("copy-failed");
    }
  }

  function download() {
    clearFeedback();
    try {
      const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "formatted.sql";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setFeedback(labels.downloaded);
    } catch {
      setError("download-failed");
    }
  }

  const hasInput = input.trim() !== "";
  const errorId = error ? "sql-formatter-error" : undefined;

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block font-semibold text-[var(--foreground)]" htmlFor={dialectId}>{labels.dialectLabel}
            <select id={dialectId} value={dialect} onChange={(event) => setDialect(event.target.value as SqlDialect)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {SQL_DIALECTS.map((value) => <option key={value} value={value}>{labels.dialects[value]}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-[var(--foreground)]" htmlFor={keywordCaseId}>{labels.keywordCaseLabel}
            <select id={keywordCaseId} value={keywordCase} onChange={(event) => setKeywordCase(event.target.value as SqlKeywordCase)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {KEYWORD_CASES.map((value) => <option key={value} value={value}>{labels.keywordCases[value]}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-[var(--foreground)]" htmlFor={indentId}>{labels.indentLabel}
            <select id={indentId} value={indent} onChange={(event) => setIndent(event.target.value as SqlIndentStyle)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {INDENT_STYLES.map((value) => <option key={value} value={value}>{labels.indents[value]}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-[var(--foreground)]" htmlFor={logicalOperatorId}>{labels.logicalOperatorLabel}
            <select id={logicalOperatorId} value={logicalOperatorNewline} onChange={(event) => setLogicalOperatorNewline(event.target.value as SqlLogicalOperatorNewline)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {LOGICAL_OPERATOR_NEWLINES.map((value) => <option key={value} value={value}>{labels.logicalOperators[value]}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-[var(--foreground)]" htmlFor={commaStyleId}>{labels.commaStyleLabel}
            <select id={commaStyleId} value={commaStyle} onChange={(event) => setCommaStyle(event.target.value as SqlCommaStyle)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {COMMA_STYLES.map((value) => <option key={value} value={value}>{labels.commaStyles[value]}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <label htmlFor="sql-formatter-input" className="text-lg font-bold text-[var(--foreground)]">{labels.inputLabel}</label>
          <p id="sql-formatter-input-help" className="mt-1 text-sm text-[var(--text-muted)]">{labels.inputHelp}</p>
          <textarea
            id="sql-formatter-input" ref={inputRef} value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-describedby={["sql-formatter-input-help", errorId].filter(Boolean).join(" ")}
            aria-invalid={Boolean(error) || undefined}
            placeholder={labels.placeholder} spellCheck={false}
            className="mt-3 min-h-72 w-full resize-y overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Button onClick={() => runFormat("format", input)} disabled={!hasInput}><Play aria-hidden="true" size={17} />{labels.format}</Button>
            <Button variant="secondary" onClick={() => runFormat("minify", input)} disabled={!hasInput}><Rows3 aria-hidden="true" size={17} />{labels.minify}</Button>
            <Button variant="secondary" onClick={clear} disabled={!hasInput && result === ""}><RotateCcw aria-hidden="true" size={17} />{labels.clear}</Button>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <label htmlFor="sql-formatter-result" className="text-lg font-bold text-[var(--foreground)]">{labels.resultLabel}</label>
          {phase === "running" ? <p role="status" className="mt-2 font-semibold text-[var(--info-fg)]">{labels.running}</p> : null}
          <textarea
            id="sql-formatter-result" value={result} readOnly placeholder={labels.resultEmpty} spellCheck={false}
            className="mt-3 min-h-72 w-full resize-y overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"
          />
          {error ? (
            <div id="sql-formatter-error" role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">
              <p>{labels.errors[error]}</p>
              {error === "parse-error" && dialect !== "sql" ? (
                <Button variant="secondary" className="mt-3" onClick={() => { setDialect("sql"); runFormat("format", input, "sql"); }}>{labels.retryGeneric}</Button>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Button variant="secondary" onClick={() => void copy()} disabled={result === ""}><Clipboard aria-hidden="true" size={17} />{labels.copy}</Button>
            <Button variant="secondary" onClick={download} disabled={result === ""}><Download aria-hidden="true" size={17} />{labels.download}</Button>
          </div>
          {feedback ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-fg)]">{feedback}</p> : null}
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{labels.examplesTitle}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{labels.examplesHint}</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={loadExample}>{labels.dialects[dialect]}</Button>
        </div>
      </section>
    </section>
  );
}
