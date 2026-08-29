"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateIpInput, type IpCategory } from "@/lib/tools/ip-info/ip-address";
import { lookupIp, type IpInfo, type LookupErrorCode, type LookupResult, type LookupSource } from "@/lib/tools/ip-info/provider";

type UiError = LookupErrorCode | "invalid-input" | "non-public-ip" | "copy-failed";
type ViewState = { status: "idle" } | { status: "loading" } | { status: "success"; value: IpInfo } | { status: "error"; error: UiError; category?: IpCategory; retryAfterSeconds?: number };
export type LookupFunction = (source: LookupSource, ip?: string, options?: { signal?: AbortSignal }) => Promise<LookupResult>;

export type IpInfoLabels = {
  currentTitle: string; manualTitle: string; loading: string; emptyResult: string; inputLabel: string; inputHelp: string; placeholder: string;
  lookup: string; refresh: string; copy: string; copied: string; unknown: string; approximate: string;
  fields: { ip: string; version: string; country: string; region: string; city: string; isp: string; organization: string; asn: string; timezone: string; continent: string; postal: string; coordinates: string; callingCode: string };
  errors: Record<UiError, string>;
  categories: Record<Exclude<IpCategory, "public">, string>;
  retryAfter: string;
};

const initial: ViewState = { status: "idle" };

export function IpInfoLookup({ labels, lookup = lookupIp }: { labels: IpInfoLabels; lookup?: LookupFunction }) {
  const [current, setCurrent] = useState<ViewState>({ status: "loading" });
  const [manual, setManual] = useState<ViewState>(initial);
  const [input, setInput] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copyFailedIp, setCopyFailedIp] = useState<string | null>(null);
  const currentAbort = useRef<AbortController | null>(null); const manualAbort = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function run(source: LookupSource, ip?: string) {
    const ref = source === "current" ? currentAbort : manualAbort; const setter = source === "current" ? setCurrent : setManual;
    ref.current?.abort(); const controller = new AbortController(); ref.current = controller; setter({ status: "loading" });
    void lookup(source, ip, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || ref.current !== controller) return;
      setter(result.ok ? { status: "success", value: result.value } : { status: "error", error: result.reason, retryAfterSeconds: result.retryAfterSeconds });
    }).catch(() => { if (!controller.signal.aborted) setter({ status: "error", error: "provider-unavailable" }); });
  }

  useEffect(() => {
    const currentController = currentAbort; const manualController = manualAbort; const activeCopyTimer = copyTimer;
    const timer = setTimeout(() => run("current"), 0);
    return () => { clearTimeout(timer); currentController.current?.abort(); manualController.current?.abort(); if (activeCopyTimer.current) clearTimeout(activeCopyTimer.current); };
    // Initial lookup only. The zero-delay timer prevents a duplicate request during React Strict Mode's effect probe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault(); const checked = validateIpInput(input);
    if (!checked.ok) { setManual(checked.reason === "empty" ? initial : { status: "error", error: "invalid-input" }); return; }
    if (checked.category !== "public") { setManual({ status: "error", error: "non-public-ip", category: checked.category }); return; }
    run("manual", checked.address);
  }

  async function copyIp(ip: string) {
    if (copyTimer.current) clearTimeout(copyTimer.current); setCopyFailedIp(null);
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(ip); setCopiedIp(ip); copyTimer.current = setTimeout(() => setCopiedIp(null), 1600); }
    catch { setCopiedIp(null); setCopyFailedIp(ip); }
  }

  return <section className="grid gap-6">
    <ResultCard title={labels.currentTitle} state={current} labels={labels} copied={current.status === "success" && copiedIp === current.value.ip} copyFailed={current.status === "success" && copyFailedIp === current.value.ip} onCopy={copyIp} action={<Button variant="secondary" onClick={() => run("current")} disabled={current.status === "loading"}><RefreshCw aria-hidden="true" size={18} />{labels.refresh}</Button>} />

    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6" aria-labelledby="manual-ip-title">
      <h2 id="manual-ip-title" className="text-xl font-bold text-[var(--foreground)]">{labels.manualTitle}</h2>
      <form onSubmit={submit} className="mt-4">
        <label htmlFor="ip-lookup-input" className="font-bold text-[var(--foreground)]">{labels.inputLabel}</label>
        <p id="ip-input-help" className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{labels.inputHelp}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input id="ip-lookup-input" value={input} onChange={(event) => { setInput(event.target.value.slice(0, 64)); if (manual.status === "error") setManual(initial); }} maxLength={64} spellCheck={false} autoComplete="off" inputMode="text" placeholder={labels.placeholder} aria-describedby="ip-input-help" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-mono text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
          <Button type="submit" disabled={manual.status === "loading"}><Search aria-hidden="true" size={18} />{labels.lookup}</Button>
        </div>
      </form>
      <div className="mt-5"><ResultBody state={manual} labels={labels} copied={manual.status === "success" && copiedIp === manual.value.ip} copyFailed={manual.status === "success" && copyFailedIp === manual.value.ip} onCopy={copyIp} /></div>
    </section>
  </section>;
}

function ResultCard({ title, state, labels, copied, copyFailed, onCopy, action }: { title: string; state: ViewState; labels: IpInfoLabels; copied: boolean; copyFailed: boolean; onCopy: (ip: string) => void; action: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6" aria-labelledby="current-ip-title" aria-busy={state.status === "loading"}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 id="current-ip-title" className="text-xl font-bold text-[var(--foreground)]">{title}</h2>{action}</div>
    <div className="mt-5"><ResultBody state={state} labels={labels} copied={copied} copyFailed={copyFailed} onCopy={onCopy} /></div>
  </section>;
}

function ResultBody({ state, labels, copied, copyFailed, onCopy }: { state: ViewState; labels: IpInfoLabels; copied: boolean; copyFailed: boolean; onCopy: (ip: string) => void }) {
  if (state.status === "idle") return <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">{labels.emptyResult}</p>;
  if (state.status === "loading") return <p role="status" className="animate-pulse rounded-xl bg-[var(--info-bg)] p-5 font-semibold text-[var(--info-fg)]">{labels.loading}</p>;
  if (state.status === "error") {
    const detail = state.error === "non-public-ip" && state.category && state.category !== "public" ? labels.categories[state.category] : labels.errors[state.error];
    return <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{detail}{state.error === "rate-limited" && state.retryAfterSeconds !== undefined ? ` ${labels.retryAfter.replace("{seconds}", String(state.retryAfterSeconds))}` : ""}</p>;
  }
  const value = state.value; const location = [value.city, value.region, value.country].filter(Boolean).join(", ") || labels.unknown;
  const fields: Array<[string, string | null]> = [
    [labels.fields.version, value.version], [labels.fields.country, value.countryCode ? `${value.country ?? labels.unknown} (${value.countryCode})` : value.country],
    [labels.fields.region, value.region], [labels.fields.city, value.city], [labels.fields.isp, value.isp], [labels.fields.organization, value.organization], [labels.fields.asn, value.asn], [labels.fields.timezone, value.timezone],
    [labels.fields.continent, value.continentCode ? `${value.continent ?? labels.unknown} (${value.continentCode})` : value.continent], [labels.fields.postal, value.postalCode],
    [labels.fields.coordinates, value.latitude !== null && value.longitude !== null ? `${value.latitude}, ${value.longitude}` : null], [labels.fields.callingCode, value.callingCode ? `+${value.callingCode.replace(/^\+/, "")}` : null],
  ];
  return <div>
    <div className="rounded-xl bg-[var(--info-bg)] p-4 sm:p-5"><p className="text-sm font-semibold text-[var(--info-fg)]">{labels.fields.ip}</p><div className="mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p dir="ltr" className="min-w-0 break-all font-mono text-2xl font-bold tracking-tight text-[var(--info-fg)] sm:text-3xl">{value.ip}</p><Button variant="secondary" onClick={() => onCopy(value.ip)}><Copy aria-hidden="true" size={18} />{copied ? labels.copied : labels.copy}</Button></div><p className="mt-2 text-sm text-[var(--info-fg)]">{location}</p></div>
    <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
      {fields.map(([name, content]) => <div key={name} className="min-w-0 bg-[var(--surface)] p-4"><dt className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{name}</dt><dd className="mt-1 overflow-wrap-anywhere break-words font-medium text-[var(--foreground)]">{content ?? labels.unknown}</dd></div>)}
    </dl>
    <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{labels.approximate}</p>
    {copyFailed ? <p role="alert" className="mt-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm font-medium text-[var(--error-fg)]">{labels.errors["copy-failed"]}</p> : null}
  </div>;
}
