"use client";

import { useEffect, useRef, useState } from "react";
import { Clipboard, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_QR_OPTIONS, ERROR_LEVELS, QR_SIZES, QUIET_ZONES, detectInputType, renderQrCode,
  type ErrorCorrectionLevel, type InputType, type QrGenerationError, type QrGenerationResult, type QrMetadata, type QrOptions, type QrSize, type QuietZone,
} from "@/lib/tools/qr-code-generator/qr-code";

type FeedbackError = QrGenerationError | "download-failed" | "copy-failed";
type Result = { metadata: QrMetadata; options: QrOptions; inputType: InputType };
export type QrRenderer = (canvas: HTMLCanvasElement, input: string, options: QrOptions) => Promise<QrGenerationResult>;

export type QrCodeGeneratorLabels = {
  inputLabel: string; inputHelp: string; placeholder: string; previewTitle: string; empty: string; processing: string; canvasLabel: string;
  optionsTitle: string; sizeLabel: string; sizeHelp: string; levelLabel: string; levelHelp: string; marginLabel: string; marginHelp: string;
  levels: Record<ErrorCorrectionLevel, string>; margins: Record<QuietZone, string>;
  currentSize: string; currentLevel: string; currentMargin: string; inputType: string; inputTypes: Record<InputType, string>;
  download: string; copyInput: string; clear: string; downloaded: string; copied: string; densityWarning: string;
  errors: Record<FeedbackError, string>;
};

export function QrCodeGenerator({ labels, renderer = renderQrCode }: { labels: QrCodeGeneratorLabels; renderer?: QrRenderer }) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<QrOptions>(DEFAULT_QR_OPTIONS);
  const [phase, setPhase] = useState<"empty" | "processing" | "success" | "error">("empty");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<FeedbackError | null>(null);
  const [feedback, setFeedback] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestToken = useRef(0); const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) { if (ref.current) clearTimeout(ref.current); ref.current = null; }
  function clearFeedback() { clearTimer(feedbackTimer); setFeedback(""); if (error === "copy-failed" || error === "download-failed") setError(null); }

  useEffect(() => () => { requestToken.current += 1; clearTimer(debounceTimer); clearTimer(feedbackTimer); }, []);

  async function generate(text: string, nextOptions: QrOptions) {
    const canvas = canvasRef.current; if (!canvas || text === "") return;
    const token = ++requestToken.current; setPhase("processing"); setResult(null); setError(null); clearFeedback();
    const generated = await renderer(canvas, text, nextOptions).catch((): QrGenerationResult => ({ ok: false, reason: "generation-failed" }));
    if (requestToken.current !== token) return;
    if (!generated.ok) { setPhase("error"); setError(generated.reason); return; }
    setResult({ metadata: generated.metadata, options: nextOptions, inputType: detectInputType(text) }); setPhase("success");
  }

  function updateInput(value: string) {
    clearTimer(debounceTimer); requestToken.current += 1; setInput(value); setResult(null); setError(null); setFeedback("");
    if (value === "") { setPhase("empty"); return; }
    setPhase("processing"); debounceTimer.current = setTimeout(() => void generate(value, options), 250);
  }

  function updateOptions(next: QrOptions) {
    clearTimer(debounceTimer); setOptions(next); requestToken.current += 1; setResult(null); setError(null); setFeedback("");
    if (input === "") { setPhase("empty"); return; }
    void generate(input, next);
  }

  function reset() {
    clearTimer(debounceTimer); clearTimer(feedbackTimer); requestToken.current += 1; setInput(""); setOptions(DEFAULT_QR_OPTIONS); setPhase("empty"); setResult(null); setError(null); setFeedback("");
    queueMicrotask(() => inputRef.current?.focus());
  }

  async function copyInput() {
    clearFeedback();
    try { if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable"); await navigator.clipboard.writeText(input); setFeedback(labels.copied); feedbackTimer.current = setTimeout(() => setFeedback(""), 1600); }
    catch { setError("copy-failed"); }
  }

  function download() {
    clearFeedback(); const canvas = canvasRef.current;
    if (!canvas || phase !== "success" || !result) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) { setError("download-failed"); return; }
        try {
          const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "qr-code.png";
          document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); setFeedback(labels.downloaded);
        } catch { setError("download-failed"); }
      }, "image/png");
    } catch { setError("download-failed"); }
  }

  const errorId = error ? "qr-code-error" : undefined;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <label htmlFor="qr-input" className="font-bold text-slate-950">{labels.inputLabel}</label>
    <p id="qr-input-help" className="mt-1 text-sm leading-6 text-slate-600">{labels.inputHelp}</p>
    <textarea id="qr-input" ref={inputRef} value={input} onChange={(event) => updateInput(event.target.value)} aria-describedby={["qr-input-help", errorId].filter(Boolean).join(" ")} aria-invalid={Boolean(error) || undefined} placeholder={labels.placeholder} className="mt-3 min-h-36 w-full min-w-0 resize-y overflow-auto rounded-xl border border-slate-300 bg-slate-50 p-4 text-base leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <section aria-labelledby="qr-preview-title" className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <h2 id="qr-preview-title" className="font-bold text-slate-950">{labels.previewTitle}</h2>
        <div className="mt-4 grid min-h-64 place-items-center overflow-hidden rounded-xl bg-white p-3">
          <canvas ref={canvasRef} role="img" aria-label={labels.canvasLabel} className={`h-auto max-h-[32rem] max-w-full ${phase === "success" ? "block" : "hidden"}`} />
          {phase === "empty" ? <p className="text-center text-sm leading-6 text-slate-500">{labels.empty}</p> : null}
          {phase === "processing" ? <p role="status" className="text-center font-semibold text-blue-800">{labels.processing}</p> : null}
          {phase === "error" ? <p className="text-center text-sm text-slate-500">{labels.empty}</p> : null}
        </div>
        {result ? <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <Meta label={labels.currentSize} value={`${result.options.size} × ${result.options.size}px`} />
          <Meta label={labels.currentLevel} value={result.options.level} />
          <Meta label={labels.currentMargin} value={`${result.options.margin} modules`} />
          <Meta label={labels.inputType} value={labels.inputTypes[result.inputType]} />
        </dl> : null}
        {result?.metadata.warning ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-950">{labels.densityWarning}</p> : null}
      </section>

      <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
        <legend className="px-1 font-bold text-slate-950">{labels.optionsTitle}</legend>
        <Select label={labels.sizeLabel} help={labels.sizeHelp} value={options.size} onChange={(value) => updateOptions({ ...options, size: Number(value) as QrSize })} options={QR_SIZES.map((value) => ({ value, label: `${value}px` }))} />
        <Select label={labels.levelLabel} help={labels.levelHelp} value={options.level} onChange={(value) => updateOptions({ ...options, level: value as ErrorCorrectionLevel })} options={ERROR_LEVELS.map((value) => ({ value, label: labels.levels[value] }))} />
        <Select label={labels.marginLabel} help={labels.marginHelp} value={options.margin} onChange={(value) => updateOptions({ ...options, margin: Number(value) as QuietZone })} options={QUIET_ZONES.map((value) => ({ value, label: labels.margins[value] }))} />
      </fieldset>
    </div>

    {error ? <p id="qr-code-error" role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-900">{labels.errors[error]}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Button onClick={download} disabled={phase !== "success"}><Download aria-hidden="true" size={18} />{labels.download}</Button>
      <Button variant="secondary" onClick={() => void copyInput()} disabled={input === ""}><Clipboard aria-hidden="true" size={18} />{labels.copyInput}</Button>
      <Button variant="secondary" onClick={reset} disabled={input === "" && options.size === 256 && options.level === "M" && options.margin === 4}>{labels.clear}</Button>
    </div>
    {feedback ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{feedback}</p> : null}
  </section>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 justify-between gap-3 rounded-lg bg-white px-3 py-2"><dt className="font-semibold">{label}</dt><dd className="break-all text-right">{value}</dd></div>; }
function Select({ label, help, value, onChange, options }: { label: string; help: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[] }) {
  const id = `qr-${label.replace(/\W/g, "-")}`;
  return <label className="mt-4 block font-semibold text-slate-950" htmlFor={id}>{label}<span className="mt-1 block text-sm font-normal leading-6 text-slate-600">{help}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
