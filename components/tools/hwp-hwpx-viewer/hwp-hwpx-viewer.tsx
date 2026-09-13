"use client";

import type { HwpDocument } from "@rhwp/core";
import { ChevronLeft, ChevronRight, RotateCcw, Search, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { useLocale } from "next-intl";
import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";

import { detectDocument, formatBytes, MAX_HWP_FILE_BYTES, type PreflightFormat } from "@/lib/tools/hwp-hwpx-viewer/detect-document";

type Stage = "empty" | "preflight" | "loading" | "ready" | "error";
type PendingFile = { file: File; bytes: Uint8Array; format: PreflightFormat; limited: boolean };

const COPY = {
  ko: {
    noticeTitle: "열기 전에 확인하세요", notice: ["HWPX를 우선 지원하며 HWP 5.x는 제한적으로 지원합니다.", "복잡한 표·도형·차트·수식·글꼴과 배치는 원본과 다르거나 표시되지 않을 수 있습니다.", "암호화·배포용·구버전 문서는 열 수 없습니다. 중요한 문서는 공식 프로그램으로 최종 확인하세요."], privacy: "파일은 이 브라우저의 임시 메모리에서만 처리되며 서버로 업로드하거나 저장하지 않습니다.", choose: "HWP 또는 HWPX 파일 선택", drop: "파일을 놓거나 눌러서 선택하세요", limit: ".hwp · .hwpx · 최대 25 MiB", preflight: "파일을 열기 전에 지원 범위를 확인하세요", supported: "HWPX 지원", limited: "HWP 5.x 제한적 지원", can: "본문, 기본 서식, 표와 이미지는 문서 구성과 렌더러 지원 범위에서 표시됩니다.", cannot: "일부 도형·수식·차트·글맵시·전용 글꼴과 정교한 배치는 다르게 보이거나 누락될 수 있습니다.", confirm: "위 내용을 확인하고 문서 열기", cancel: "취소", loading: "브라우저에서 문서를 분석하고 있습니다…", other: "다른 파일 열기", clear: "초기화", page: "{current} / {total} 페이지", previous: "이전 페이지", next: "다음 페이지", zoomOut: "축소", zoomIn: "확대", search: "문서에서 찾기", searchPlaceholder: "찾을 글자 입력", result: "{count}개 페이지에서 찾음", noResult: "일치하는 내용이 없습니다.", warning: "일부 요소가 원본과 다르거나 표시되지 않을 수 있습니다.", canvas: "문서 {page}페이지", errors: { "unsupported-extension": "HWP 또는 HWPX 파일을 선택하세요.", "file-too-large": "25 MiB 이하의 파일을 선택하세요.", "invalid-signature": "확장자와 실제 문서 형식이 일치하지 않거나 파일이 손상되었습니다.", "empty-file": "내용이 없는 파일은 열 수 없습니다.", "archive-limit": "안전한 압축 해제 한도를 넘었거나 비정상적인 HWPX 파일입니다.", parse: "문서를 열지 못했습니다. 암호화·배포용·구버전 또는 손상된 문서인지 확인하세요.", render: "이 페이지를 표시하지 못했습니다. 다른 페이지나 문서를 확인하세요." } },
  en: {
    noticeTitle: "Before you open a document", notice: ["HWPX is the primary supported format. HWP 5.x support is limited.", "Complex tables, shapes, charts, equations, fonts, and layout may differ from the original or be omitted.", "Encrypted, distribution-protected, and older documents cannot be opened. Verify important documents in the official software."], privacy: "The file is processed only in temporary browser memory. It is not uploaded to or stored on our server.", choose: "Choose an HWP or HWPX file", drop: "Drop a file here or select one", limit: ".hwp · .hwpx · up to 25 MiB", preflight: "Review support before opening the file", supported: "HWPX supported", limited: "HWP 5.x limited support", can: "Body text, basic formatting, tables, and images are shown where the document structure and renderer support them.", cannot: "Some shapes, equations, charts, WordArt, proprietary fonts, and precise layout may look different or be omitted.", confirm: "I understand — open document", cancel: "Cancel", loading: "Analyzing the document in your browser…", other: "Open another file", clear: "Clear", page: "Page {current} of {total}", previous: "Previous page", next: "Next page", zoomOut: "Zoom out", zoomIn: "Zoom in", search: "Find in document", searchPlaceholder: "Enter text to find", result: "Found on {count} pages", noResult: "No matching text found.", warning: "Some elements may differ from the original or may not be displayed.", canvas: "Document page {page}", errors: { "unsupported-extension": "Choose an HWP or HWPX file.", "file-too-large": "Choose a file no larger than 25 MiB.", "invalid-signature": "The extension does not match the document format, or the file is damaged.", "empty-file": "An empty file cannot be opened.", "archive-limit": "This HWPX file exceeds safe extraction limits or has an abnormal archive structure.", parse: "Could not open this document. It may be encrypted, distribution-protected, outdated, or damaged.", render: "Could not display this page. Try another page or document." } },
  ja: {
    noticeTitle: "開く前にご確認ください", notice: ["HWPXを優先対応し、HWP 5.xは限定対応です。", "複雑な表、図形、グラフ、数式、フォント、レイアウトは原本と異なるか表示されない場合があります。", "暗号化、配布用、旧形式の文書は開けません。重要な文書は公式ソフトで最終確認してください。"], privacy: "ファイルはこのブラウザの一時メモリだけで処理され、サーバーへ送信・保存されません。", choose: "HWPまたはHWPXファイルを選択", drop: "ファイルをドロップするか選択してください", limit: ".hwp · .hwpx · 最大25 MiB", preflight: "開く前に対応範囲を確認してください", supported: "HWPX対応", limited: "HWP 5.x限定対応", can: "本文、基本書式、表、画像は文書構造とレンダラーの対応範囲で表示されます。", cannot: "一部の図形、数式、グラフ、ワードアート、専用フォント、精密な配置は異なるか省略される場合があります。", confirm: "内容を確認して文書を開く", cancel: "キャンセル", loading: "ブラウザで文書を解析しています…", other: "別のファイルを開く", clear: "クリア", page: "{current} / {total}ページ", previous: "前のページ", next: "次のページ", zoomOut: "縮小", zoomIn: "拡大", search: "文書内を検索", searchPlaceholder: "検索文字を入力", result: "{count}ページで見つかりました", noResult: "一致する内容がありません。", warning: "一部の要素は原本と異なるか表示されない場合があります。", canvas: "文書の{page}ページ", errors: { "unsupported-extension": "HWPまたはHWPXファイルを選択してください。", "file-too-large": "25 MiB以下のファイルを選択してください。", "invalid-signature": "拡張子と実際の文書形式が一致しないか、ファイルが破損しています。", "empty-file": "空のファイルは開けません。", "archive-limit": "安全な展開上限を超えているか、異常なHWPXファイルです。", parse: "文書を開けませんでした。暗号化、配布用、旧形式、破損した文書か確認してください。", render: "このページを表示できませんでした。別のページまたは文書をお試しください。" } },
} as const;

function replace(template: string, values: Record<string, string | number>) { return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template); }

export function HwpHwpxViewer() {
  const locale = useLocale() as keyof typeof COPY;
  const c = COPY[locale] ?? COPY.en;
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<HwpDocument | null>(null);
  const [stage, setStage] = useState<Stage>("empty");
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [warnings, setWarnings] = useState(0);
  const [query, setQuery] = useState("");
  const [matchingPages, setMatchingPages] = useState<number[]>([]);
  const [matchCursor, setMatchCursor] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const dispose = useCallback(() => { documentRef.current?.free(); documentRef.current = null; }, []);
  useEffect(() => dispose, [dispose]);

  const reset = useCallback(() => { dispose(); setStage("empty"); setPending(null); setError(""); setPage(0); setPageCount(0); setZoom(100); setWarnings(0); setQuery(""); setMatchingPages([]); setMatchCursor(0); setSearchPerformed(false); if (inputRef.current) inputRef.current.value = ""; }, [dispose]);

  const inspect = async (file?: File) => {
    if (!file) return;
    dispose(); setError(""); setStage("loading");
    if (file.size > MAX_HWP_FILE_BYTES) { setError(c.errors["file-too-large"]); setStage("error"); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = detectDocument(file.name, bytes, file.size);
    if (!result.ok) { setError(c.errors[result.code]); setStage("error"); return; }
    setPending({ file, bytes, format: result.format, limited: result.limited }); setStage("preflight");
  };

  const openDocument = async () => {
    if (!pending) return;
    setStage("loading"); setError("");
    try {
      const rhwp = await import("@rhwp/core");
      const globalWithMeasure = globalThis as typeof globalThis & { measureTextWidth?: (font: string, text: string) => number };
      if (!globalWithMeasure.measureTextWidth) {
        const context = document.createElement("canvas").getContext("2d");
        globalWithMeasure.measureTextWidth = (font, text) => { if (!context) return text.length * 8; context.font = font; return context.measureText(text).width; };
      }
      await rhwp.default();
      const doc = new rhwp.HwpDocument(pending.bytes);
      const total = doc.pageCount();
      if (!Number.isSafeInteger(total) || total < 1 || total > 10_000) { doc.free(); throw new Error("invalid page count"); }
      documentRef.current = doc;
      setPageCount(total); setPage(0);
      try { const report = JSON.parse(doc.getValidationWarnings()) as { count?: number }; setWarnings(Number(report.count) || 0); } catch { setWarnings(0); }
      setStage("ready");
    } catch { dispose(); setError(c.errors.parse); setStage("error"); }
  };

  useEffect(() => {
    if (stage !== "ready" || !documentRef.current || !canvasRef.current) return;
    const frame = requestAnimationFrame(() => {
      try { documentRef.current?.renderPageToCanvas(page, canvasRef.current!, zoom / 100); }
      catch { setError(c.errors.render); }
    });
    return () => cancelAnimationFrame(frame);
  }, [c.errors.render, page, stage, zoom]);

  const searchDocument = () => {
    const needle = query.trim().toLocaleLowerCase(locale);
    setSearchPerformed(true);
    if (!needle || !documentRef.current) { setMatchingPages([]); return; }
    const matches: number[] = [];
    for (let index = 0; index < pageCount; index += 1) {
      try { if (documentRef.current.getPageText(index).toLocaleLowerCase(locale).includes(needle)) matches.push(index); } catch { /* page without extractable text */ }
    }
    setMatchingPages(matches); setMatchCursor(0); if (matches.length) setPage(matches[0]);
  };

  const moveMatch = (direction: -1 | 1) => {
    if (!matchingPages.length) return;
    const cursor = (matchCursor + direction + matchingPages.length) % matchingPages.length;
    setMatchCursor(cursor);
    setPage(matchingPages[cursor]);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); void inspect(event.dataTransfer.files[0]); };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => void inspect(event.target.files?.[0]);

  return <div className="space-y-6">
    <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6" aria-labelledby="viewer-notice-title">
      <h2 id="viewer-notice-title" className="text-lg font-bold text-[var(--foreground)]">{c.noticeTitle}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-muted)]">{c.notice.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="mt-4 rounded-xl bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--foreground)]">{c.privacy}</p>
    </section>

    {stage === "empty" || stage === "error" ? <section>
      <label onDragOver={event => event.preventDefault()} onDrop={onDrop} className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center transition hover:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--focus-ring)]">
        <input ref={inputRef} type="file" accept=".hwp,.hwpx" className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={onChange}/><Upload aria-hidden size={34} className="text-[var(--primary)]"/><span className="mt-4 text-lg font-bold">{c.choose}</span><span className="mt-2 text-sm text-[var(--text-muted)]">{c.drop}</span><span className="mt-1 text-xs text-[var(--text-muted)]">{c.limit}</span>
      </label>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger)]">{error}</p> : null}
    </section> : null}

    {stage === "preflight" && pending ? <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="preflight-title">
      <h2 id="preflight-title" className="text-xl font-bold">{c.preflight}</h2><div className="mt-4 flex flex-wrap items-center gap-2"><span className="max-w-full break-all font-semibold">{pending.file.name}</span><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{formatBytes(pending.file.size, locale)}</span><span className="rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-bold text-[var(--warning)]">{pending.limited ? c.limited : c.supported}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-[var(--success-bg)] p-4 text-sm leading-6 text-[var(--text-muted)]">{c.can}</p><p className="rounded-xl bg-[var(--warning-bg)] p-4 text-sm leading-6 text-[var(--text-muted)]">{c.cannot}</p></div><p className="mt-4 text-sm text-[var(--text-muted)]">{c.privacy}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={reset} className="min-h-11 rounded-xl border border-[var(--border-strong)] px-5 font-semibold">{c.cancel}</button><button type="button" onClick={() => void openDocument()} className="min-h-11 rounded-xl bg-[var(--primary-fill)] px-5 font-semibold text-white">{c.confirm}</button></div>
    </section> : null}

    {stage === "loading" ? <p role="status" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center font-semibold">{c.loading}</p> : null}

    {stage === "ready" ? <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0} aria-label={c.previous} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border-strong)] disabled:opacity-40"><ChevronLeft/></button><span className="min-w-28 text-center text-sm font-semibold">{replace(c.page, { current: page + 1, total: pageCount })}</span><button type="button" onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))} disabled={page + 1 >= pageCount} aria-label={c.next} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border-strong)] disabled:opacity-40"><ChevronRight/></button><span className="mx-1 h-7 w-px bg-[var(--border)]"/><button type="button" onClick={() => setZoom(value => Math.max(50, value - 10))} aria-label={c.zoomOut} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border-strong)]"><ZoomOut/></button><span className="min-w-12 text-center text-sm">{zoom}%</span><button type="button" onClick={() => setZoom(value => Math.min(200, value + 10))} aria-label={c.zoomIn} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border-strong)]"><ZoomIn/></button><button type="button" onClick={reset} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 font-semibold"><RotateCcw size={17}/>{c.other}</button></div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><span className="sr-only">{c.search}</span><input value={query} onChange={event => { setQuery(event.target.value); setSearchPerformed(false); setMatchingPages([]); setMatchCursor(0); }} onKeyDown={event => { if (event.key === "Enter") searchDocument(); }} placeholder={c.searchPlaceholder} className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 pr-12"/><Search aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18}/></label><button type="button" onClick={searchDocument} className="min-h-11 rounded-xl bg-[var(--primary-fill)] px-5 font-semibold text-white">{c.search}</button></div>
        {searchPerformed ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"><p>{matchingPages.length ? replace(c.result, { count: matchingPages.length }) : c.noResult}</p>{matchingPages.length ? <><button type="button" onClick={() => moveMatch(-1)} aria-label={c.previous} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-[var(--border-strong)]"><ChevronLeft size={17}/></button><span aria-live="polite">{matchCursor + 1} / {matchingPages.length}</span><button type="button" onClick={() => moveMatch(1)} aria-label={c.next} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-[var(--border-strong)]"><ChevronRight size={17}/></button></> : null}</div> : null}
      </div>
      {(pending?.limited || warnings > 0) ? <p role="status" className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm font-semibold text-[var(--foreground)]">{c.warning}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="overflow-auto rounded-2xl border border-[var(--border)] bg-[#d7dbe1] p-3 sm:p-6"><canvas ref={canvasRef} aria-label={replace(c.canvas, { page: page + 1 })} className="mx-auto h-auto max-w-none rounded bg-white shadow-lg"/></div>
    </section> : null}
  </div>;
}
