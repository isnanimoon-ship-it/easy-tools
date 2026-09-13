"use client";

import { FileText, RotateCcw, Sparkles, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { decodeMarkdownBytes, validateMarkdownFileMeta } from "@/lib/tools/markdown-viewer/file-validation";
import { MarkdownPreview } from "./markdown-preview";

type ViewMode = "split" | "source" | "preview";
const SAMPLE = {
  ko: "# Markdown 예제\n\n문단에서 **굵게**, *기울임*, ~~취소선~~과 `코드`를 사용할 수 있습니다.\n\n## 할 일\n\n- [x] 문서 작성\n- [ ] 미리보기 확인\n\n| 항목 | 상태 |\n| --- | --- |\n| 표 | 지원 |\n| 외부 이미지 | 자동 차단 |\n\n> 중요한 내용은 인용문으로 표시합니다.\n\n```ts\nconst message = \"안녕하세요 😀\";\n```\n\n[외부 링크](https://example.com)",
  en: "# Markdown example\n\nUse **bold**, *italic*, ~~strikethrough~~ and `code` in a paragraph.\n\n## Tasks\n\n- [x] Write the document\n- [ ] Review the preview\n\n| Item | Status |\n| --- | --- |\n| Tables | Supported |\n| Remote images | Blocked automatically |\n\n> Use a blockquote for an important note.\n\n```ts\nconst message = \"Hello 😀\";\n```\n\n[External link](https://example.com)",
  ja: "# Markdownの例\n\n段落では**太字**、*斜体*、~~取り消し線~~、`コード`を使用できます。\n\n## タスク\n\n- [x] 文書を作成\n- [ ] プレビューを確認\n\n| 項目 | 状態 |\n| --- | --- |\n| 表 | 対応 |\n| 外部画像 | 自動ブロック |\n\n> 重要な内容は引用で表示します。\n\n```ts\nconst message = \"こんにちは 😀\";\n```\n\n[外部リンク](https://example.com)",
} as const;

export function MarkdownViewer() {
  const locale = useLocale() as keyof typeof SAMPLE;
  const t = useTranslations("Tools.markdownViewer.viewer");
  const inputRef = useRef<HTMLInputElement>(null);
  const readId = useRef(0);
  const [source, setSource] = useState("");
  const [renderedSource, setRenderedSource] = useState("");
  const [mode, setMode] = useState<ViewMode>("split");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const timer = window.setTimeout(() => setMode("source"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setRenderedSource(source), 250);
    return () => clearTimeout(timer);
  }, [source]);

  const setContent = (value: string, name = "") => {
    setSource(value); setRenderedSource(value); setFileName(name); setError("");
  };
  const clear = () => {
    readId.current += 1; setContent(""); if (inputRef.current) inputRef.current.value = "";
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    const metaError = validateMarkdownFileMeta(file);
    if (metaError) { setError(t(`errors.${metaError}`)); return; }
    const id = ++readId.current;
    try {
      const decoded = decodeMarkdownBytes(new Uint8Array(await file.arrayBuffer()));
      if (id !== readId.current) return;
      if (!decoded.ok) { setError(t(`errors.${decoded.error}`)); return; }
      setContent(decoded.text, file.name);
    } catch {
      if (id === readId.current) setError(t("errors.read-failed"));
    }
  };
  const onFile = (event: ChangeEvent<HTMLInputElement>) => void readFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLElement>) => { event.preventDefault(); void readFile(event.dataTransfer.files[0]); };
  const modes: ViewMode[] = ["split", "source", "preview"];

  return <div className="space-y-5">
    <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 text-sm leading-6 text-[var(--info-fg)] sm:p-6" aria-labelledby="markdown-security-heading">
      <h2 id="markdown-security-heading" className="font-bold">{t("noticeTitle")}</h2>
      <p className="mt-2">{t("notice")}</p>
    </section>

    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <label onDragOver={event => event.preventDefault()} onDrop={onDrop} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-fill)] px-4 py-2 font-semibold text-white focus-within:ring-4 focus-within:ring-[var(--focus-ring)]">
          <input ref={inputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={onFile}/><Upload size={17} aria-hidden/>{t("openFile")}
        </label>
        <Button variant="secondary" onClick={() => setContent(SAMPLE[locale] ?? SAMPLE.en)}><Sparkles size={17}/>{t("sample")}</Button>
        <Button variant="secondary" onClick={clear} disabled={!source && !error}><RotateCcw size={17}/>{t("clear")}</Button>
        {fileName ? <span className="inline-flex min-w-0 items-center gap-2 break-all text-sm text-[var(--text-muted)]"><FileText size={16} aria-hidden className="shrink-0"/>{fileName}</span> : null}
      </div>
      <div onDragOver={event => event.preventDefault()} onDrop={onDrop} className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-center text-sm text-[var(--text-muted)]">{t("dropHint")}</div>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </section>

    <div role="group" aria-label={t("modeLabel")} className="flex flex-wrap gap-2">
      {modes.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={`min-h-11 rounded-xl border px-4 font-semibold ${mode === item ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)]"}`}>{t(`modes.${item}`)}</button>)}
    </div>

    <div className={`grid min-w-0 gap-5 ${mode === "split" ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {mode !== "preview" ? <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5" aria-labelledby="markdown-source-heading"><h2 id="markdown-source-heading" className="text-lg font-bold">{t("sourceLabel")}</h2><textarea aria-labelledby="markdown-source-heading" value={source} onChange={event => { setSource(event.target.value); setFileName(""); setError(""); }} placeholder={t("placeholder")} spellCheck={false} className="mt-3 min-h-[32rem] w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background)] p-4 font-mono text-sm leading-6 focus:border-[var(--primary)]"/></section> : null}
      {mode !== "source" ? <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5" aria-labelledby="markdown-preview-heading"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="markdown-preview-heading" className="text-lg font-bold">{t("previewLabel")}</h2>{source !== renderedSource ? <span role="status" className="text-xs text-[var(--text-muted)]">{t("updating")}</span> : null}</div><div className="mt-3 min-h-[32rem] min-w-0 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5"><MarkdownPreview source={renderedSource} emptyLabel={t("empty")} blockedImageLabel={t("blockedImage")} blockedLinkLabel={t("blockedLink")}/></div></section> : null}
    </div>
  </div>;
}
