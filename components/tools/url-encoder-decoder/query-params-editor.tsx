"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildQueryOutput, parseQueryInput, type QueryParam } from "@/lib/tools/url-encoder-decoder/query-params";

export type QueryParamsEditorLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  parse: string;
  keyLabel: string;
  keyPlaceholder: string;
  valueLabel: string;
  valuePlaceholder: string;
  removeRow: string;
  addRow: string;
  tableEmpty: string;
  outputLabel: string;
  outputEmpty: string;
  copy: string;
  copied: string;
  copyError: string;
  clear: string;
};

type Row = QueryParam & { id: string };

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function QueryParamsEditor({ labels }: { labels: QueryParamsEditorLabels }) {
  const [rawInput, setRawInput] = useState("");
  const [base, setBase] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const output = buildQueryOutput(base, rows);
  const hasContent = rawInput.length > 0 || base !== null || rows.length > 0;

  function parse() {
    const parsed = parseQueryInput(rawInput);
    setBase(parsed.base);
    setRows(parsed.params.map((param) => ({ ...param, id: makeId() })));
    setCopied(false);
    setCopyFailed(false);
  }

  function updateRow(id: string, patch: Partial<QueryParam>) {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((previous) => previous.filter((row) => row.id !== id));
  }

  function addRow() {
    setRows((previous) => [...previous, { id: makeId(), key: "", value: "" }]);
  }

  function clear() {
    setRawInput("");
    setBase(null);
    setRows([]);
    setCopied(false);
    setCopyFailed(false);
    inputRef.current?.focus();
  }

  async function copy() {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopyFailed(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(output);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="space-y-5">
      <label className="block font-bold text-[var(--foreground)]">
        {labels.inputLabel}
        <input
          ref={inputRef}
          type="text"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={labels.inputPlaceholder}
          spellCheck={false}
          className="mt-2 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <Button onClick={parse} disabled={!rawInput}>
          {labels.parse}
        </Button>
        <Button variant="secondary" onClick={clear} disabled={!hasContent}>
          {labels.clear}
        </Button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{labels.tableEmpty}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex gap-2">
                <label className="sr-only" htmlFor={`qp-key-${row.id}`}>
                  {labels.keyLabel}
                </label>
                <input
                  id={`qp-key-${row.id}`}
                  type="text"
                  value={row.key}
                  onChange={(event) => updateRow(row.id, { key: event.target.value })}
                  placeholder={labels.keyPlaceholder}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                />
                <label className="sr-only" htmlFor={`qp-value-${row.id}`}>
                  {labels.valueLabel}
                </label>
                <input
                  id={`qp-value-${row.id}`}
                  type="text"
                  value={row.value}
                  onChange={(event) => updateRow(row.id, { value: event.target.value })}
                  placeholder={labels.valuePlaceholder}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={labels.removeRow}
                  className="inline-grid size-11 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--error-bg)] hover:text-[var(--error-fg)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button variant="secondary" onClick={addRow} className="mt-3">
          <Plus aria-hidden="true" size={17} />
          {labels.addRow}
        </Button>
      </div>

      <div>
        <label className="block font-bold text-[var(--foreground)]" htmlFor="qp-output">
          {labels.outputLabel}
        </label>
        <textarea
          id="qp-output"
          value={output}
          readOnly
          placeholder={labels.outputEmpty}
          spellCheck={false}
          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={copy} disabled={!output}>
            <Copy aria-hidden="true" size={17} />
            {copied ? labels.copied : labels.copy}
          </Button>
          {copyFailed ? (
            <p role="alert" className="text-sm font-semibold text-[var(--error-fg)]">
              {labels.copyError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
