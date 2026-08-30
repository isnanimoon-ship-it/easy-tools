"use client";
/* eslint-disable @next/next/no-img-element -- local object URL preview of the uploaded logo */

import { useEffect, useId, useRef, useState } from "react";
import { Clipboard, Download, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_QR_OPTIONS, ERROR_LEVELS, QR_SIZES, QUIET_ZONES, detectInputType, renderQrCode,
  type ErrorCorrectionLevel, type InputType, type QrGenerationError, type QrGenerationResult, type QrLogoOptions, type QrMetadata, type QrOptions, type QrSize, type QuietZone,
} from "@/lib/tools/qr-code-generator/qr-code";
import {
  buildContactPayload, buildEmailPayload, buildLocationPayload, buildPhonePayload, buildSmsPayload, buildWifiPayload,
  type ContactFields, type EmailFields, type LocationFields, type PhoneFields, type QrSourceType, type SmsFields, type WifiFields,
} from "@/lib/tools/qr-code-generator/structured-input";

const LOGO_SIZE_RATIO = 0.2;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const SOURCE_TYPES: readonly QrSourceType[] = ["text", "wifi", "contact", "email", "phone", "sms", "location"];
const WIFI_SECURITY_OPTIONS = ["WPA", "WEP", "nopass"] as const;

type FeedbackError = QrGenerationError | "download-failed" | "copy-failed";
type LogoError = "unsupported-type" | "file-too-large";
type Result = { metadata: QrMetadata; options: QrOptions; inputType: InputType };
export type QrRenderer = (canvas: HTMLCanvasElement, input: string, options: QrOptions, logo?: QrLogoOptions) => Promise<QrGenerationResult>;

export type QrCodeGeneratorLabels = {
  inputLabel: string; inputHelp: string; placeholder: string; previewTitle: string; empty: string; processing: string; canvasLabel: string;
  optionsTitle: string; sizeLabel: string; sizeHelp: string; levelLabel: string; levelHelp: string; marginLabel: string; marginHelp: string;
  levels: Record<ErrorCorrectionLevel, string>; margins: Record<QuietZone, string>;
  currentSize: string; currentLevel: string; currentMargin: string; inputType: string; inputTypes: Record<InputType, string>; effectiveLevel: string;
  download: string; copyInput: string; clear: string; downloaded: string; copied: string; densityWarning: string;
  errors: Record<FeedbackError, string>;
  sourceTypeLabel: string; sourceTypes: Record<QrSourceType, string>; payloadPreviewLabel: string;
  wifi: { ssid: string; ssidPlaceholder: string; password: string; security: string; securityOptions: Record<(typeof WIFI_SECURITY_OPTIONS)[number], string>; hidden: string };
  contact: { firstName: string; lastName: string; phone: string; email: string };
  email: { address: string; subject: string; body: string };
  phone: { number: string };
  sms: { number: string; message: string };
  location: { latitude: string; longitude: string };
  logo: { title: string; upload: string; remove: string; help: string; boosted: string; errors: Record<LogoError, string> };
};

export function QrCodeGenerator({ labels, renderer = renderQrCode }: { labels: QrCodeGeneratorLabels; renderer?: QrRenderer }) {
  const [sourceType, setSourceType] = useState<QrSourceType>("text");
  const [input, setInput] = useState("");
  const [wifiFields, setWifiFields] = useState<WifiFields>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [contactFields, setContactFields] = useState<ContactFields>({ firstName: "", lastName: "", phone: "", email: "" });
  const [emailFields, setEmailFields] = useState<EmailFields>({ address: "", subject: "", body: "" });
  const [phoneFields, setPhoneFields] = useState<PhoneFields>({ number: "" });
  const [smsFields, setSmsFields] = useState<SmsFields>({ number: "", message: "" });
  const [locationFields, setLocationFields] = useState<LocationFields>({ latitude: "", longitude: "" });
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoError, setLogoError] = useState<LogoError | null>(null);
  const [options, setOptions] = useState<QrOptions>(DEFAULT_QR_OPTIONS);
  const [phase, setPhase] = useState<"empty" | "processing" | "success" | "error">("empty");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<FeedbackError | null>(null);
  const [feedback, setFeedback] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null); const logoInputRef = useRef<HTMLInputElement>(null);
  const requestToken = useRef(0); const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const logoUrl = useRef<string | null>(null);

  function clearTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) { if (ref.current) clearTimeout(ref.current); ref.current = null; }
  function clearFeedback() { clearTimer(feedbackTimer); setFeedback(""); if (error === "copy-failed" || error === "download-failed") setError(null); }
  function revokeLogoUrl() { if (logoUrl.current) { URL.revokeObjectURL(logoUrl.current); logoUrl.current = null; } }

  useEffect(() => () => { requestToken.current += 1; clearTimer(debounceTimer); clearTimer(feedbackTimer); revokeLogoUrl(); }, []);

  async function generate(text: string, nextOptions: QrOptions, logo: HTMLImageElement | null) {
    const canvas = canvasRef.current; if (!canvas || text === "") return;
    const token = ++requestToken.current; setPhase("processing"); setResult(null); setError(null); clearFeedback();
    const generated = logo
      ? await renderer(canvas, text, nextOptions, { image: logo, sizeRatio: LOGO_SIZE_RATIO }).catch((): QrGenerationResult => ({ ok: false, reason: "generation-failed" }))
      : await renderer(canvas, text, nextOptions).catch((): QrGenerationResult => ({ ok: false, reason: "generation-failed" }));
    if (requestToken.current !== token) return;
    if (!generated.ok) { setPhase("error"); setError(generated.reason); return; }
    setResult({ metadata: generated.metadata, options: nextOptions, inputType: detectInputType(text) }); setPhase("success");
  }

  function updateInput(value: string) {
    clearTimer(debounceTimer); requestToken.current += 1; setInput(value); setResult(null); setError(null); setFeedback("");
    if (value === "") { setPhase("empty"); return; }
    setPhase("processing"); debounceTimer.current = setTimeout(() => void generate(value, options, logoImage), 250);
  }

  function updateOptions(next: QrOptions) {
    clearTimer(debounceTimer); setOptions(next); requestToken.current += 1; setResult(null); setError(null); setFeedback("");
    if (input === "") { setPhase("empty"); return; }
    void generate(input, next, logoImage);
  }

  function updateWifi(patch: Partial<WifiFields>) { const next = { ...wifiFields, ...patch }; setWifiFields(next); updateInput(buildWifiPayload(next)); }
  function updateContact(patch: Partial<ContactFields>) { const next = { ...contactFields, ...patch }; setContactFields(next); updateInput(buildContactPayload(next)); }
  function updateEmail(patch: Partial<EmailFields>) { const next = { ...emailFields, ...patch }; setEmailFields(next); updateInput(buildEmailPayload(next)); }
  function updatePhone(patch: Partial<PhoneFields>) { const next = { ...phoneFields, ...patch }; setPhoneFields(next); updateInput(buildPhonePayload(next)); }
  function updateSms(patch: Partial<SmsFields>) { const next = { ...smsFields, ...patch }; setSmsFields(next); updateInput(buildSmsPayload(next)); }
  function updateLocation(patch: Partial<LocationFields>) { const next = { ...locationFields, ...patch }; setLocationFields(next); updateInput(buildLocationPayload(next)); }

  function payloadForType(type: QrSourceType): string {
    switch (type) {
      case "wifi": return buildWifiPayload(wifiFields);
      case "contact": return buildContactPayload(contactFields);
      case "email": return buildEmailPayload(emailFields);
      case "phone": return buildPhonePayload(phoneFields);
      case "sms": return buildSmsPayload(smsFields);
      case "location": return buildLocationPayload(locationFields);
      default: return input;
    }
  }

  function changeSourceType(next: QrSourceType) {
    setSourceType(next);
    if (next !== "text") updateInput(payloadForType(next));
  }

  function reset() {
    clearTimer(debounceTimer); clearTimer(feedbackTimer); requestToken.current += 1; revokeLogoUrl();
    setSourceType("text"); setInput(""); setOptions(DEFAULT_QR_OPTIONS); setPhase("empty"); setResult(null); setError(null); setFeedback("");
    setWifiFields({ ssid: "", password: "", security: "WPA", hidden: false });
    setContactFields({ firstName: "", lastName: "", phone: "", email: "" });
    setEmailFields({ address: "", subject: "", body: "" });
    setPhoneFields({ number: "" });
    setSmsFields({ number: "", message: "" });
    setLocationFields({ latitude: "", longitude: "" });
    setLogoImage(null); setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    queueMicrotask(() => inputRef.current?.focus());
  }

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith("image/")) { setLogoError("unsupported-type"); return; }
    if (file.size > MAX_LOGO_BYTES) { setLogoError("file-too-large"); return; }
    revokeLogoUrl();
    const url = URL.createObjectURL(file); logoUrl.current = url;
    const image = new Image();
    image.onload = () => { setLogoImage(image); if (input !== "") void generate(input, options, image); };
    image.onerror = () => { setLogoError("unsupported-type"); revokeLogoUrl(); };
    image.src = url;
  }

  function removeLogo() {
    revokeLogoUrl(); setLogoImage(null); setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (input !== "") void generate(input, options, null);
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
  const isDefault = input === "" && sourceType === "text" && !logoImage && options.size === 256 && options.level === "M" && options.margin === 4;
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
    <label className="block font-semibold text-[var(--foreground)]" htmlFor="qr-source-type">{labels.sourceTypeLabel}</label>
    <select id="qr-source-type" value={sourceType} onChange={(event) => changeSourceType(event.target.value as QrSourceType)} className="mt-2 min-h-11 w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
      {SOURCE_TYPES.map((type) => <option key={type} value={type}>{labels.sourceTypes[type]}</option>)}
    </select>

    {sourceType === "text" ? (
      <div className="mt-4">
        <label htmlFor="qr-input" className="font-bold text-[var(--foreground)]">{labels.inputLabel}</label>
        <p id="qr-input-help" className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{labels.inputHelp}</p>
        <textarea id="qr-input" ref={inputRef} value={input} onChange={(event) => updateInput(event.target.value)} aria-describedby={["qr-input-help", errorId].filter(Boolean).join(" ")} aria-invalid={Boolean(error) || undefined} placeholder={labels.placeholder} className="mt-3 min-h-36 w-full min-w-0 resize-y overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-base leading-6 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
      </div>
    ) : (
      <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
        {sourceType === "wifi" ? <>
          <TextField label={labels.wifi.ssid} placeholder={labels.wifi.ssidPlaceholder} value={wifiFields.ssid} onChange={(value) => updateWifi({ ssid: value })} />
          <label className="block font-semibold text-[var(--foreground)]" htmlFor="qr-wifi-security">{labels.wifi.security}
            <select id="qr-wifi-security" value={wifiFields.security} onChange={(event) => updateWifi({ security: event.target.value as WifiFields["security"] })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">
              {WIFI_SECURITY_OPTIONS.map((option) => <option key={option} value={option}>{labels.wifi.securityOptions[option]}</option>)}
            </select>
          </label>
          {wifiFields.security !== "nopass" ? <TextField label={labels.wifi.password} value={wifiFields.password} onChange={(value) => updateWifi({ password: value })} type="password" /> : null}
          <label className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <input type="checkbox" checked={wifiFields.hidden} onChange={(event) => updateWifi({ hidden: event.target.checked })} className="size-5 rounded border border-[var(--border)]" />
            {labels.wifi.hidden}
          </label>
        </> : null}

        {sourceType === "contact" ? <>
          <TextField label={labels.contact.firstName} value={contactFields.firstName} onChange={(value) => updateContact({ firstName: value })} />
          <TextField label={labels.contact.lastName} value={contactFields.lastName} onChange={(value) => updateContact({ lastName: value })} />
          <TextField label={labels.contact.phone} value={contactFields.phone} onChange={(value) => updateContact({ phone: value })} type="tel" />
          <TextField label={labels.contact.email} value={contactFields.email} onChange={(value) => updateContact({ email: value })} type="email" />
        </> : null}

        {sourceType === "email" ? <>
          <TextField label={labels.email.address} value={emailFields.address} onChange={(value) => updateEmail({ address: value })} type="email" />
          <TextField label={labels.email.subject} value={emailFields.subject} onChange={(value) => updateEmail({ subject: value })} />
          <label className="block font-semibold text-[var(--foreground)]" htmlFor="qr-email-body">{labels.email.body}
            <textarea id="qr-email-body" value={emailFields.body} onChange={(event) => updateEmail({ body: event.target.value })} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
          </label>
        </> : null}

        {sourceType === "phone" ? <TextField label={labels.phone.number} value={phoneFields.number} onChange={(value) => updatePhone({ number: value })} type="tel" /> : null}

        {sourceType === "sms" ? <>
          <TextField label={labels.sms.number} value={smsFields.number} onChange={(value) => updateSms({ number: value })} type="tel" />
          <label className="block font-semibold text-[var(--foreground)]" htmlFor="qr-sms-message">{labels.sms.message}
            <textarea id="qr-sms-message" value={smsFields.message} onChange={(event) => updateSms({ message: event.target.value })} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
          </label>
        </> : null}

        {sourceType === "location" ? <>
          <TextField label={labels.location.latitude} value={locationFields.latitude} onChange={(value) => updateLocation({ latitude: value })} type="text" inputMode="decimal" />
          <TextField label={labels.location.longitude} value={locationFields.longitude} onChange={(value) => updateLocation({ longitude: value })} type="text" inputMode="decimal" />
        </> : null}

        <div>
          <p className="font-semibold text-[var(--foreground)]">{labels.payloadPreviewLabel}</p>
          <p className="mt-1 break-all rounded-lg bg-[var(--surface)] p-3 font-mono text-sm text-[var(--text-muted)]">{input || " "}</p>
        </div>
      </div>
    )}

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <section aria-labelledby="qr-preview-title" className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-6">
        <h2 id="qr-preview-title" className="font-bold text-[var(--foreground)]">{labels.previewTitle}</h2>
        <div className="mt-4 grid min-h-64 place-items-center overflow-hidden rounded-xl bg-[var(--surface)] p-3">
          <canvas ref={canvasRef} role="img" aria-label={labels.canvasLabel} className={`h-auto max-h-[32rem] max-w-full ${phase === "success" ? "block" : "hidden"}`} />
          {phase === "empty" ? <p className="text-center text-sm leading-6 text-[var(--text-muted)]">{labels.empty}</p> : null}
          {phase === "processing" ? <p role="status" className="text-center font-semibold text-[var(--info-fg)]">{labels.processing}</p> : null}
          {phase === "error" ? <p className="text-center text-sm text-[var(--text-muted)]">{labels.empty}</p> : null}
        </div>
        {result ? <dl className="mt-4 grid gap-2 text-sm text-[var(--foreground)] sm:grid-cols-2">
          <Meta label={labels.currentSize} value={`${result.options.size} × ${result.options.size}px`} />
          <Meta label={labels.currentLevel} value={result.options.level} />
          <Meta label={labels.currentMargin} value={`${result.options.margin} modules`} />
          <Meta label={labels.inputType} value={labels.inputTypes[result.inputType]} />
          {result.metadata.effectiveLevel !== result.options.level ? <Meta label={labels.effectiveLevel} value={result.metadata.effectiveLevel} /> : null}
        </dl> : null}
        {result?.metadata.warning ? <p className="mt-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-sm font-medium leading-6 text-[var(--warning-fg)]">{labels.densityWarning}</p> : null}
      </section>

      <div className="min-w-0 space-y-6">
        <fieldset className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-6">
          <legend className="px-1 font-bold text-[var(--foreground)]">{labels.optionsTitle}</legend>
          <Select label={labels.sizeLabel} help={labels.sizeHelp} value={options.size} onChange={(value) => updateOptions({ ...options, size: Number(value) as QrSize })} options={QR_SIZES.map((value) => ({ value, label: `${value}px` }))} />
          <Select label={labels.levelLabel} help={labels.levelHelp} value={options.level} onChange={(value) => updateOptions({ ...options, level: value as ErrorCorrectionLevel })} options={ERROR_LEVELS.map((value) => ({ value, label: labels.levels[value] }))} />
          <Select label={labels.marginLabel} help={labels.marginHelp} value={options.margin} onChange={(value) => updateOptions({ ...options, margin: Number(value) as QuietZone })} options={QUIET_ZONES.map((value) => ({ value, label: labels.margins[value] }))} />
        </fieldset>

        <fieldset className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-6">
          <legend className="px-1 font-bold text-[var(--foreground)]">{labels.logo.title}</legend>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{labels.logo.help}</p>
          <input ref={logoInputRef} id="qr-logo-input" type="file" accept="image/*" className="sr-only" onChange={(event) => handleLogoFile(event.target.files?.[0])} />
          {logoImage ? (
            <div className="mt-3 flex items-center gap-3">
              <img src={logoImage.src} alt="" className="size-12 rounded-lg border border-[var(--border)] object-contain" />
              <Button type="button" variant="secondary" onClick={removeLogo}><X aria-hidden="true" size={16} />{labels.logo.remove}</Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="mt-3" onClick={() => logoInputRef.current?.click()}>
              <ImagePlus aria-hidden="true" size={17} />{labels.logo.upload}
            </Button>
          )}
          {logoImage ? <p className="mt-3 text-sm font-medium leading-6 text-[var(--info-fg)]">{labels.logo.boosted}</p> : null}
          {logoError ? <p id="qr-logo-error" role="alert" className="mt-3 text-sm font-medium leading-6 text-[var(--error-fg)]">{labels.logo.errors[logoError]}</p> : null}
        </fieldset>
      </div>
    </div>

    {error ? <p id="qr-code-error" role="alert" className="mt-5 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm font-medium leading-6 text-[var(--error-fg)]">{labels.errors[error]}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Button onClick={download} disabled={phase !== "success"}><Download aria-hidden="true" size={18} />{labels.download}</Button>
      <Button variant="secondary" onClick={() => void copyInput()} disabled={input === ""}><Clipboard aria-hidden="true" size={18} />{labels.copyInput}</Button>
      <Button variant="secondary" onClick={reset} disabled={isDefault}>{labels.clear}</Button>
    </div>
    {feedback ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-fg)]">{feedback}</p> : null}
  </section>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 justify-between gap-3 rounded-lg bg-[var(--surface)] px-3 py-2"><dt className="font-semibold">{label}</dt><dd className="break-all text-right">{value}</dd></div>; }
function Select({ label, help, value, onChange, options }: { label: string; help: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[] }) {
  const id = useId();
  return <label className="mt-4 block font-semibold text-[var(--foreground)]" htmlFor={id}>{label}<span className="mt-1 block text-sm font-normal leading-6 text-[var(--text-muted)]">{help}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
function TextField({ label, placeholder, value, onChange, type = "text", inputMode }: { label: string; placeholder?: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: "text" | "decimal" }) {
  const id = useId();
  return <label className="block font-semibold text-[var(--foreground)]" htmlFor={id}>{label}
    <input id={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" />
  </label>;
}
