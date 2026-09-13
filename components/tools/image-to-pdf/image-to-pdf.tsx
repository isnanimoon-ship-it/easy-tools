"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowDown, ArrowUp, Download, FilePlus2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inspectContainer } from "@/lib/tools/image-metadata-remover/container-scanner";
import { validMetadataDimensions, validateMetadataImage } from "@/lib/tools/image-metadata-remover/file-validation";
import { addImagePage, MAX_FILE_BYTES, MAX_IMAGE_PIXELS, MAX_IMAGES, MAX_TOTAL_PIXELS, renderJpeg, type Margin, type Orientation, type PageSize } from "@/lib/tools/image-to-pdf/pdf";

type ImageItem = { id: string; file: File; url: string; width: number; height: number };
type ErrorKey = "type" | "size" | "count" | "pixels" | "animated" | "decode" | "conversion";

export function ImageToPdf() {
  const locale = useLocale();
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const [items, setItems] = useState<ImageItem[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<Margin>("normal");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const itemsRef = useRef<ImageItem[]>([]);
  const runRef = useRef(0);
  const addingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => () => { runRef.current++; itemsRef.current.forEach(item => URL.revokeObjectURL(item.url)); }, []);

  function invalidate() { runRef.current++; setPdf(null); setError(null); }
  function remove(index: number) {
    if (busy) return;
    invalidate();
    setItems(current => { URL.revokeObjectURL(current[index].url); return current.filter((_, i) => i !== index); });
  }
  function move(index: number, offset: number) {
    if (busy) return;
    invalidate();
    setItems(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  function clear() { if (busy) return; invalidate(); items.forEach(item => URL.revokeObjectURL(item.url)); setItems([]); if (inputRef.current) inputRef.current.value = ""; }

  async function addFiles(list: FileList | null) {
    if (!list?.length || busy || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    setBusy(true);
    invalidate();
    try {
      const selected = Array.from(list);
      if (items.length + selected.length > MAX_IMAGES) { setError("count"); return; }
      const next: ImageItem[] = [];
      let pixels = items.reduce((sum, item) => sum + item.width * item.height, 0);
      for (const file of selected) {
        if (file.size > MAX_FILE_BYTES) { setError("size"); continue; }
        try {
          const validated = await validateMetadataImage(file);
          if (!validated.ok) { setError("type"); continue; }
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (inspectContainer(bytes, validated.mime).animated) { setError("animated"); continue; }
          const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
          const width = bitmap.width, height = bitmap.height; bitmap.close();
          if (!validMetadataDimensions(width, height) || width * height > MAX_IMAGE_PIXELS || pixels + width * height > MAX_TOTAL_PIXELS) { setError("pixels"); continue; }
          pixels += width * height;
          next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), width, height });
        } catch { setError("decode"); }
      }
      setItems(current => [...current, ...next]);
    } finally { addingRef.current = false; setAdding(false); setBusy(false); }
  }

  async function createPdf() {
    if (busy || !items.length) return;
    setBusy(true); setPdf(null); setError(null);
    const run = ++runRef.current;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      doc.setTitle("Images to PDF"); doc.setAuthor(""); doc.setSubject(""); doc.setKeywords([]);
      for (const item of items) {
        if (run !== runRef.current) return;
        const rendered = await renderJpeg(item.file);
        await addImagePage(doc, rendered.bytes, rendered.width, rendered.height, size, orientation, margin);
      }
      const bytes = await doc.save();
      if (run === runRef.current) setPdf(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
    } catch { if (run === runRef.current) setError("conversion"); }
    finally { if (run === runRef.current) setBusy(false); }
  }

  function download() {
    if (!pdf) return;
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a"); link.href = url; link.download = "images-to-pdf.pdf"; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="space-y-6">
    <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">{t.notice}</div>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="text-xl font-bold">{t.upload}</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t.limit}</p>
      <input ref={inputRef} id="pdf-images" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple className="mt-4 block w-full text-sm" onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} disabled={busy}/>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm text-[var(--error-fg)]">{t.errors[error]}</p> : null}
    </section>
    {items.length ? <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{t.images} ({items.length})</h2><Button variant="secondary" onClick={clear} disabled={busy}>{t.clear}</Button></div>
        <ol className="mt-4 space-y-3">{items.map((item, index) => <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] p-3">
          {/* Local blob preview; uploaded bytes never leave this tab. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={t.preview(index + 1, item.file.name)} className="size-16 shrink-0 rounded-lg bg-white object-contain"/>
          <div className="min-w-0 flex-1"><p className="break-all font-semibold">{index + 1}. {item.file.name}</p><p className="text-xs text-[var(--text-muted)]">{item.width} × {item.height}px · {(item.file.size / 1024 / 1024).toFixed(1)} MiB</p></div>
          <div className="flex w-full shrink-0 justify-end gap-1 sm:w-auto"><button type="button" aria-label={t.up(item.file.name)} disabled={busy || index === 0} onClick={() => move(index, -1)} className="grid size-10 place-items-center rounded-lg border border-[var(--border)] disabled:opacity-40"><ArrowUp aria-hidden size={17}/></button><button type="button" aria-label={t.down(item.file.name)} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} className="grid size-10 place-items-center rounded-lg border border-[var(--border)] disabled:opacity-40"><ArrowDown aria-hidden size={17}/></button><button type="button" aria-label={t.remove(item.file.name)} disabled={busy} onClick={() => remove(index)} className="grid size-10 place-items-center rounded-lg border border-[var(--border)] disabled:opacity-40"><Trash2 aria-hidden size={17}/></button></div>
        </li>)}</ol>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="text-xl font-bold">{t.settings}</h2><div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="font-semibold">{t.paper}<select value={size} disabled={busy} onChange={event => { invalidate(); setSize(event.target.value as PageSize); }} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><option value="a4">A4</option><option value="letter">Letter</option></select></label>
        <label className="font-semibold">{t.orientation}<select value={orientation} disabled={busy} onChange={event => { invalidate(); setOrientation(event.target.value as Orientation); }} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><option value="portrait">{t.portrait}</option><option value="landscape">{t.landscape}</option></select></label>
        <label className="font-semibold">{t.margin}<select value={margin} disabled={busy} onChange={event => { invalidate(); setMargin(event.target.value as Margin); }} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><option value="normal">{t.normal}</option><option value="none">{t.none}</option></select></label>
      </div><p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{t.rules}</p></section>
      <div className="flex flex-wrap gap-3"><Button onClick={() => void createPdf()} disabled={busy}><FilePlus2 aria-hidden size={18}/>{busy ? adding ? t.reading : t.working : t.create}</Button>{pdf ? <Button variant="secondary" onClick={download}><Download aria-hidden size={18}/>{t.download}</Button> : null}</div>
      <p role="status" className="text-sm text-[var(--text-muted)]">{busy ? adding ? t.reading : t.working : pdf ? t.done(items.length) : t.ready(items.length)}</p>
    </> : null}
  </section>;
}

const copy = {
  ko: { notice: "이미지는 브라우저에서 PDF로 변환되며 서버로 전송되지 않습니다. 이미지 속 글자는 검색 가능한 텍스트가 되지 않습니다. PDF는 JPEG로 다시 인코딩되어 화질·용량·투명 배경이 바뀔 수 있습니다.", upload: "이미지 선택", limit: "JPG, PNG, WebP · 최대 20장 · 파일당 25 MiB · 정적 이미지만 지원", images: "페이지 순서", clear: "전체 초기화", settings: "PDF 설정", paper: "용지", orientation: "방향", margin: "여백", portrait: "세로", landscape: "가로", normal: "보통 (10 mm)", none: "없음", rules: "이미지 1장당 PDF 1페이지로 만들며 비율을 유지해 페이지 안에 맞춥니다. 여백 없음은 인쇄 시 가장자리가 잘릴 수 있습니다. 개인정보 제거가 목적이라면 PDF 변환 전 메타데이터를 별도로 확인하세요.", create: "PDF 만들기", reading: "이미지 확인 중…", working: "PDF 생성 중…", download: "PDF 다운로드", ready: (n: number) => `${n}페이지 준비됨`, done: (n: number) => `${n}페이지 PDF가 준비되었습니다.`, preview: (n: number, name: string) => `${n}번 이미지 ${name}`, up: (name: string) => `${name} 위로 이동`, down: (name: string) => `${name} 아래로 이동`, remove: (name: string) => `${name} 삭제`, errors: { type: "JPG, PNG, WebP 형식의 정상적인 이미지를 선택하세요.", size: "파일당 25 MiB 이하만 추가할 수 있습니다.", count: "한 번에 최대 20장까지 추가할 수 있습니다.", pixels: "이미지 크기 또는 전체 픽셀 한도를 초과했습니다.", animated: "움직이는 이미지는 지원하지 않습니다.", decode: "이미지를 읽지 못했습니다. 파일이 손상되었는지 확인하세요.", conversion: "PDF를 만들지 못했습니다. 이미지 수를 줄이거나 다시 시도하세요." } },
  en: { notice: "Images are converted to PDF in your browser, without uploading them. Text in the images does not become searchable. JPEG re-encoding may change quality, size, or transparency.", upload: "Choose images", limit: "JPG, PNG, WebP · up to 20 · 25 MiB per file · still images only", images: "Page order", clear: "Clear all", settings: "PDF settings", paper: "Paper", orientation: "Orientation", margin: "Margin", portrait: "Portrait", landscape: "Landscape", normal: "Normal (10 mm)", none: "None", rules: "Each image becomes one PDF page, fitted without cropping. No margin may be clipped when printing. If privacy is your goal, inspect metadata before converting.", create: "Create PDF", reading: "Checking images…", working: "Creating PDF…", download: "Download PDF", ready: (n: number) => `${n} pages ready`, done: (n: number) => `${n}-page PDF is ready.`, preview: (n: number, name: string) => `Image ${n}: ${name}`, up: (name: string) => `Move ${name} up`, down: (name: string) => `Move ${name} down`, remove: (name: string) => `Remove ${name}`, errors: { type: "Choose a valid JPG, PNG, or WebP image.", size: "Each file must be at most 25 MiB.", count: "You can add up to 20 images.", pixels: "The image or total pixel limit was exceeded.", animated: "Animated images are not supported.", decode: "Could not read this image. Check whether the file is damaged.", conversion: "Could not create the PDF. Try fewer images or retry." } },
  ja: { notice: "画像はブラウザ内でPDFに変換され、アップロードされません。画像内の文字は検索可能なテキストにはなりません。JPEGへの再変換で画質・容量・透明部分が変わる場合があります。", upload: "画像を選択", limit: "JPG、PNG、WebP · 最大20枚 · 1ファイル25 MiB · 静止画のみ", images: "ページの順序", clear: "すべてクリア", settings: "PDF設定", paper: "用紙", orientation: "向き", margin: "余白", portrait: "縦", landscape: "横", normal: "標準（10 mm）", none: "なし", rules: "画像1枚につきPDF1ページに、比率を保って収めます。余白なしでは印刷時に端が切れる場合があります。個人情報の削除が目的なら変換前にメタデータを確認してください。", create: "PDFを作成", reading: "画像を確認中…", working: "PDFを作成中…", download: "PDFを保存", ready: (n: number) => `${n}ページの準備完了`, done: (n: number) => `${n}ページのPDFができました。`, preview: (n: number, name: string) => `${n}番目の画像 ${name}`, up: (name: string) => `${name}を上へ`, down: (name: string) => `${name}を下へ`, remove: (name: string) => `${name}を削除`, errors: { type: "有効なJPG、PNG、WebP画像を選択してください。", size: "1ファイル25 MiB以下にしてください。", count: "最大20枚まで追加できます。", pixels: "画像または合計画素数の上限を超えました。", animated: "アニメーション画像には対応していません。", decode: "画像を読み込めません。破損していないか確認してください。", conversion: "PDFを作成できません。枚数を減らすか再試行してください。" } },
} as const;
