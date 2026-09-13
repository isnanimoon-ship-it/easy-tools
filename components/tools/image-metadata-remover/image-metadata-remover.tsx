"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileArchive, ImagePlus, MapPin, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { buildMetadataZip, cleanedFilename, uniqueName } from "@/lib/tools/image-metadata-remover/download";
import { fieldDescription } from "@/lib/tools/image-metadata-remover/field-help";
import { MAX_FILES, MAX_TOTAL_PIXELS, validMetadataDimensions, validateMetadataImage, type FileValidationError } from "@/lib/tools/image-metadata-remover/file-validation";
import { readMetadata } from "@/lib/tools/image-metadata-remover/metadata-reader";
import { decodeDimensions, removeImageMetadata } from "@/lib/tools/image-metadata-remover/reencode-image";
import type { MetadataKind, MetadataSummary, SupportedImageMime } from "@/lib/tools/image-metadata-remover/types";

type ErrorCode = FileValidationError | "too-many-files" | "decode-failed" | "invalid-dimensions" | "total-pixels" | "animated" | "encode-failed" | "encoder-unsupported" | "verification-failed" | "zip-too-large" | "zip-failed";
type Status = "ready" | "processing" | "done" | "error";
type Item = { id: string; file: File; mime?: SupportedImageMime; width?: number; height?: number; metadata?: MetadataSummary; status: Status; error?: ErrorCode; result?: Blob };

const ZIP_LIMIT = 100 * 1024 * 1024;
const kindOrder: MetadataKind[] = ["gps", "exif", "xmp", "iptc", "icc", "comment", "text"];

export function ImageMetadataRemover() {
  const t = useTranslations("Tools.imageMetadataRemover");
  const inputRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const dragDepth = useRef(0);
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [globalError, setGlobalError] = useState<ErrorCode | null>(null);

  const clear = useCallback(() => {
    generation.current++;
    setItems([]); setBusy(false); setGlobalError(null); setQuality(92);
    if (inputRef.current) { inputRef.current.value = ""; inputRef.current.focus(); }
  }, []);
  useEffect(() => () => { generation.current++; }, []);

  async function addFiles(list: FileList | null) {
    if (!list?.length || busy) return;
    const files = Array.from(list);
    if (items.length + files.length > MAX_FILES) { setGlobalError("too-many-files"); return; }
    const run = ++generation.current;
    setBusy(true); setGlobalError(null);
    const next: Item[] = [];
    let totalPixels = items.reduce((sum, item) => sum + (item.width ?? 0) * (item.height ?? 0), 0);
    for (const file of files) {
      if (generation.current !== run) return;
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const validation = await validateMetadataImage(file);
      if (!validation.ok) { next.push({ id, file, status: "error", error: validation.reason }); continue; }
      try {
        const dimensions = await decodeDimensions(file);
        if (!validMetadataDimensions(dimensions.width, dimensions.height)) { next.push({ id, file, mime: validation.mime, status: "error", error: "invalid-dimensions" }); continue; }
        const pixels = dimensions.width * dimensions.height;
        if (totalPixels + pixels > MAX_TOTAL_PIXELS) { next.push({ id, file, mime: validation.mime, ...dimensions, status: "error", error: "total-pixels" }); continue; }
        const metadata = await readMetadata(file, validation.mime);
        if (metadata.animated) { next.push({ id, file, mime: validation.mime, ...dimensions, metadata, status: "error", error: "animated" }); continue; }
        totalPixels += pixels;
        next.push({ id, file, mime: validation.mime, ...dimensions, metadata, status: "ready" });
      } catch { next.push({ id, file, mime: validation.mime, status: "error", error: "decode-failed" }); }
    }
    if (generation.current === run) { setItems(current => [...current, ...next]); setBusy(false); }
  }

  function removeItem(id: string) { if (!busy) setItems(current => current.filter(item => item.id !== id)); }

  async function runRemoval() {
    const candidates = items.filter(item => item.status === "ready" || item.status === "done");
    if (!candidates.length || busy) return;
    const run = ++generation.current;
    setBusy(true); setGlobalError(null);
    for (const candidate of candidates) {
      if (generation.current !== run) return;
      setItems(current => current.map(item => item.id === candidate.id ? { ...item, status: "processing", result: undefined, error: undefined } : item));
      try {
        const result = await removeImageMetadata(candidate.file, candidate.mime!, quality / 100);
        if (!result.verified) throw new Error("verification-failed");
        if (generation.current !== run) return;
        setItems(current => current.map(item => item.id === candidate.id ? { ...item, status: "done", result: result.blob } : item));
      } catch (reason) {
        if (generation.current !== run) return;
        const message = reason instanceof Error ? reason.message : "encode-failed";
        const error: ErrorCode = message === "encoder-unsupported" ? "encoder-unsupported" : message === "verification-failed" ? "verification-failed" : "encode-failed";
        setItems(current => current.map(item => item.id === candidate.id ? { ...item, status: "error", error } : item));
      }
    }
    if (generation.current === run) setBusy(false);
  }

  function download(item: Item) {
    if (!item.result || !item.mime) return;
    const url = URL.createObjectURL(item.result);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = cleanedFilename(item.file.name, item.mime); document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function downloadZip() {
    const done = items.filter(item => item.status === "done" && item.result && item.mime);
    const total = done.reduce((sum, item) => sum + item.result!.size, 0);
    if (total > ZIP_LIMIT) { setGlobalError("zip-too-large"); return; }
    setBusy(true); setGlobalError(null);
    try {
      const used = new Set<string>(); const entries = [];
      for (const item of done) entries.push({ name: uniqueName(used, cleanedFilename(item.file.name, item.mime!)), bytes: new Uint8Array(await item.result!.arrayBuffer()) });
      const zip = buildMetadataZip(entries); const blob = new Blob([new Uint8Array(zip)], { type: "application/zip" }); const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "metadata-removed-images.zip"; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch { setGlobalError("zip-failed"); } finally { setBusy(false); }
  }

  const doneCount = items.filter(item => item.status === "done").length;
  const actionable = items.some(item => item.status === "ready" || item.status === "done");

  return <section className="space-y-6">
    <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 text-[var(--info-fg)]">
      <div className="flex items-start gap-3"><ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-[var(--primary)]"/><div><h2 className="font-bold">{t("notice.title")}</h2><p className="mt-1 text-sm leading-6">{t("notice.description")}</p></div></div>
    </div>
    <section className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-9 ${dragging ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
      onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }} onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); void addFiles(event.dataTransfer.files); }} aria-busy={busy}>
      <ImagePlus aria-hidden className="mx-auto text-[var(--primary)]" size={36}/><h2 className="mt-3 text-xl font-bold">{t("upload.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("upload.help")}</p>
      <input ref={inputRef} id="metadata-image-files" className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={event => { void addFiles(event.target.files); event.target.value = ""; }}/>
      <div className="mt-4 flex flex-wrap justify-center gap-3"><label htmlFor="metadata-image-files" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-fill)] px-4 py-2.5 font-semibold text-white focus-within:ring-4 focus-within:ring-[var(--focus-ring)]"><Upload aria-hidden size={18}/>{t("actions.choose")}</label>{items.length ? <Button variant="secondary" onClick={clear} disabled={busy}><RotateCcw aria-hidden size={17}/>{t("actions.clear")}</Button> : null}</div>
      {busy ? <p role="status" className="mt-4 font-semibold text-[var(--info-fg)]">{t("status.working")}</p> : null}
      {globalError ? <p role="alert" className="mt-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">{errorText(t, globalError)}</p> : null}
    </section>
    {items.length ? <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{t("settings.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("settings.description")}</p>
        <label className="mt-5 block font-semibold">{t("settings.quality", { quality })}<input className="mt-3 w-full accent-blue-600" type="range" min={60} max={100} value={quality} disabled={busy} onChange={event => setQuality(Number(event.target.value))}/></label>
        <p className="mt-4 rounded-xl bg-[var(--warning-bg)] p-4 text-sm leading-6 text-[var(--warning-fg)]">{t("settings.warning")}</p>
        <Button className="mt-5 w-full sm:w-auto" disabled={!actionable || busy} onClick={() => void runRemoval()}><ShieldCheck aria-hidden size={18}/>{t("actions.remove")}</Button>
      </section>
      <section aria-labelledby="metadata-results-title"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="metadata-results-title" className="text-xl font-bold">{t("results.title", { count: items.length })}</h2>{doneCount > 1 ? <Button variant="secondary" disabled={busy} onClick={() => void downloadZip()}><FileArchive aria-hidden size={18}/>{t("actions.downloadAll")}</Button> : null}</div>
        <div className="mt-4 grid gap-4">{items.map(item => <ItemCard key={item.id} item={item} busy={busy} t={t} onRemove={() => removeItem(item.id)} onDownload={() => download(item)}/>)}</div>
      </section>
    </> : null}
    <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">{t("privacy")}</p>
  </section>;
}

function ItemCard({ item, busy, t, onRemove, onDownload }: { item: Item; busy: boolean; t: ReturnType<typeof useTranslations>; onRemove: () => void; onDownload: () => void }) {
  const locale = useLocale();
  const detailText = metadataDetailText[locale as keyof typeof metadataDetailText] ?? metadataDetailText.en;
  const helpText = metadataHelpText[locale as keyof typeof metadataHelpText] ?? metadataHelpText.en;
  const kinds = item.metadata ? kindOrder.filter(kind => item.metadata!.kinds.includes(kind)) : [];
  return <article className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-all font-bold">{item.file.name}</h3><p className="mt-1 text-sm text-[var(--text-muted)]">{formatBytes(item.file.size)}{item.width ? ` · ${item.width} × ${item.height}px` : ""}</p></div><button type="button" disabled={busy} onClick={onRemove} aria-label={t("actions.removeFile", { name: item.file.name })} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] hover:bg-[var(--surface-muted)] disabled:opacity-50"><Trash2 aria-hidden size={18}/></button></div>
    {item.error ? <p role="alert" className="mt-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">{errorText(t, item.error)}</p> : <>
      <div className="mt-4 flex flex-wrap gap-2">{kinds.length ? kinds.map(kind => <span key={kind} className={`rounded-full px-2.5 py-1 text-xs font-bold ${kind === "gps" ? "bg-[var(--warning-bg)] text-[var(--warning-fg)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{kind === "gps" ? <MapPin aria-hidden className="mr-1 inline" size={13}/> : null}{t(`kinds.${kind}`)}</span>) : <span className="rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-bold text-[var(--success-fg)]">{t("results.noneFound")}</span>}</div>
      {item.metadata && (item.metadata.camera || item.metadata.lens || item.metadata.capturedAt || item.metadata.software || item.metadata.creator) ? <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{item.metadata.camera ? <Info name={t("details.camera")} value={item.metadata.camera}/> : null}{item.metadata.lens ? <Info name={t("details.lens")} value={item.metadata.lens}/> : null}{item.metadata.capturedAt ? <Info name={t("details.capturedAt")} value={item.metadata.capturedAt}/> : null}{item.metadata.software ? <Info name={t("details.software")} value={item.metadata.software}/> : null}{item.metadata.creator ? <Info name={t("details.creator")} value={item.metadata.creator}/> : null}</dl> : null}
      {item.metadata ? <details className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm"><summary className="cursor-pointer font-semibold text-[var(--primary)]">{detailText.expand(item.metadata.fields.length)}</summary>{item.metadata.kinds.includes("exif") ? <div className="mt-4 rounded-xl bg-[var(--info-bg)] p-4 leading-6 text-[var(--info-fg)]"><p className="font-bold">{helpText.whatIsExif}</p><p className="mt-1">{helpText.exifExplanation}</p></div> : null}<p className="mt-3 leading-6 text-[var(--text-muted)]">{detailText.scope}</p>{item.metadata.fields.length ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{item.metadata.fields.map(field => <div key={field.tag} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"><dt className="font-semibold">{field.tag}{field.sensitive ? <span className="ml-2 text-xs text-[var(--warning-fg)]">{helpText.privateLabel}</span> : null}</dt><dd className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{fieldDescription(field.tag, locale)}</dd><dd className="mt-2 break-words font-medium">{field.value}</dd></div>)}</dl> : <p className="mt-3 text-[var(--text-muted)]">{detailText.empty}</p>}{item.metadata.fields.some(field => field.sensitive) ? <p className="mt-4 rounded-lg bg-[var(--warning-bg)] p-3 text-[var(--warning-fg)]">{detailText.sensitive}</p> : null}</details> : null}
      {item.metadata?.analysisIncomplete ? <p className="mt-3 text-sm text-[var(--warning-fg)]">{t("results.analysisIncomplete")}</p> : null}
      <p role="status" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${item.status === "done" ? "bg-[var(--success-bg)] text-[var(--success-fg)]" : item.status === "processing" ? "bg-[var(--info-bg)] text-[var(--info-fg)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{t(`status.${item.status}`)}{item.result ? ` · ${formatBytes(item.result.size)}` : ""}</p>
      {item.status === "done" ? <Button className="mt-4 w-full sm:w-auto" onClick={onDownload}><Download aria-hidden size={18}/>{t("actions.download")}</Button> : null}
    </>}
  </article>;
}

function Info({ name, value }: { name: string; value: string }) { return <div className="min-w-0"><dt className="text-xs font-bold text-[var(--text-muted)]">{name}</dt><dd className="mt-1 break-words">{value}</dd></div>; }
const metadataHelpText = {
  ko: { whatIsExif: "EXIF란 무엇인가요?", exifExplanation: "EXIF는 사진 파일에 기록되는 촬영 정보입니다. 카메라 모델, 촬영 시각, 셔터·조리개 설정, 위치 정보 등이 포함될 수 있습니다. 실제로 들어 있는 항목은 사진마다 다릅니다.", privateLabel: "민감 정보" },
  en: { whatIsExif: "What is EXIF?", exifExplanation: "EXIF is capture information stored in an image file. It may include the camera model, capture time, exposure settings, or location. The available fields vary by photo.", privateLabel: "Sensitive" },
  ja: { whatIsExif: "EXIFとは？", exifExplanation: "EXIFは画像ファイルに記録される撮影情報です。カメラの機種、撮影日時、露出設定、位置情報などが含まれる場合があります。項目は写真ごとに異なります。", privateLabel: "機密情報" },
};
const metadataDetailText = {
  ko: { expand: (count: number) => `메타데이터 상세 보기 (${count}개 항목)`, scope: "읽을 수 있는 주요 태그만 표시합니다. 종류가 감지되어도 모든 세부 값이 해석되는 것은 아닙니다. 태그명은 원본 표준 이름입니다.", empty: "표시 가능한 상세 항목이 없습니다.", sensitive: "위치나 기기 일련번호 등 민감한 정보가 포함될 수 있습니다. 공유 전에 확인하세요." },
  en: { expand: (count: number) => `View metadata details (${count} fields)`, scope: "Only readable common tags are shown. Detected blocks may have values this tool cannot decode. Original tag names are used.", empty: "No displayable detail fields were found.", sensitive: "Location or device serial numbers may be included. Review before sharing." },
  ja: { expand: (count: number) => `メタデータの詳細を表示（${count}項目）`, scope: "読み取れる主なタグのみ表示します。検出されたブロックの値をすべて解析できるとは限りません。元のタグ名で表示します。", empty: "表示可能な詳細項目はありません。", sensitive: "位置情報や機器のシリアル番号が含まれる場合があります。共有前に確認してください。" },
};
function errorText(t: ReturnType<typeof useTranslations>, code: ErrorCode) { return t(`errors.${code}`); }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`; return `${(bytes / 1024 ** 2).toFixed(1)} MiB`; }
