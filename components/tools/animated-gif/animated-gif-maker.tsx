"use client";

import { ArrowDown, ArrowUp, Download, Images, RotateCcw, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { inspectContainer } from "@/lib/tools/image-metadata-remover/container-scanner";
import { validateImageFile } from "@/lib/tools/image-compressor/file-validation";
import { encodeAnimatedGif } from "@/lib/tools/animated-gif/encode";
import { clampGifDimension } from "@/lib/tools/animated-gif/layout";
import { MAX_FILE_BYTES, MAX_FILES, MAX_INPUT_PIXELS, MAX_OUTPUT_FRAME_PIXELS, MAX_TOTAL_INPUT_PIXELS, type FrameFit } from "@/lib/tools/animated-gif/types";

type Frame = { id: string; file: File; bitmap: ImageBitmap; url: string; durationMs: number };
type Result = { blob: Blob; url: string };

export function AnimatedGifMaker() {
  const locale = useLocale() as AppLocale;
  const t = COPY[locale];
  const [frames, setFrames] = useState<Frame[]>([]);
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(720);
  const [fit, setFit] = useState<FrameFit>("contain");
  const [background, setBackground] = useState("#ffffff");
  const [colors, setColors] = useState<64 | 128 | 256>(256);
  const [repeat, setRepeat] = useState<0 | -1>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const resultRef = useRef<Result | null>(null);
  const runRef = useRef(0);

  function replaceFrames(next: Frame[]) { framesRef.current = next; setFrames(next); }
  function clearResult() { if (resultRef.current) URL.revokeObjectURL(resultRef.current.url); resultRef.current = null; setResult(null); }
  function invalidate() { runRef.current += 1; clearResult(); setProgress(0); }

  useEffect(() => () => {
    framesRef.current.forEach(frame => { frame.bitmap.close(); URL.revokeObjectURL(frame.url); });
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    runRef.current += 1;
  }, []);

  async function addFiles(files: File[]) {
    setError(null);
    if (framesRef.current.length + files.length > MAX_FILES) { setError(t.errors.count); return; }
    const added: Frame[] = [];
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error("size");
        const checked = await validateImageFile(file);
        if (!checked.ok) throw new Error(checked.reason === "file-too-large" ? "size" : "type");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (inspectContainer(bytes, checked.mime).animated) throw new Error("animated");
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        if (bitmap.width * bitmap.height > MAX_INPUT_PIXELS) { bitmap.close(); throw new Error("pixels"); }
        added.push({ id: crypto.randomUUID(), file, bitmap, url: URL.createObjectURL(file), durationMs: 500 });
      }
      const next = [...framesRef.current, ...added];
      if (next.reduce((sum, frame) => sum + frame.bitmap.width * frame.bitmap.height, 0) > MAX_TOTAL_INPUT_PIXELS) throw new Error("total");
      if (framesRef.current.length === 0 && added[0]) {
        const scale = Math.min(1, 800 / Math.max(added[0].bitmap.width, added[0].bitmap.height));
        setWidth(Math.max(1, Math.round(added[0].bitmap.width * scale)));
        setHeight(Math.max(1, Math.round(added[0].bitmap.height * scale)));
      }
      invalidate(); replaceFrames(next);
    } catch (caught) {
      added.forEach(frame => { frame.bitmap.close(); URL.revokeObjectURL(frame.url); });
      const reason = caught instanceof Error ? caught.message : "decode";
      setError(t.errors[reason as keyof typeof t.errors] ?? t.errors.decode);
    }
  }

  function removeFrame(id: string) {
    invalidate();
    const target = framesRef.current.find(frame => frame.id === id);
    if (target) { target.bitmap.close(); URL.revokeObjectURL(target.url); }
    replaceFrames(framesRef.current.filter(frame => frame.id !== id));
  }

  function moveFrame(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= frames.length) return;
    invalidate();
    const next = [...frames]; [next[index], next[target]] = [next[target], next[index]]; replaceFrames(next);
  }

  function updateDuration(id: string, durationMs: number) {
    invalidate(); replaceFrames(frames.map(frame => frame.id === id ? { ...frame, durationMs: Math.max(20, Math.min(10_000, durationMs || 20)) } : frame));
  }

  function reset() {
    runRef.current += 1; framesRef.current.forEach(frame => { frame.bitmap.close(); URL.revokeObjectURL(frame.url); });
    replaceFrames([]); clearResult(); setError(null); setBusy(false); setProgress(0); setWidth(720); setHeight(720); setFit("contain"); setBackground("#ffffff"); setColors(256); setRepeat(0);
  }

  async function createGif() {
    if (frames.length < 2 || busy) { setError(t.errors.minimum); return; }
    const safeWidth = clampGifDimension(width); const safeHeight = clampGifDimension(height);
    setWidth(safeWidth); setHeight(safeHeight);
    if (safeWidth * safeHeight * frames.length > MAX_OUTPUT_FRAME_PIXELS) { setError(t.errors.outputPixels); return; }
    invalidate(); const run = runRef.current; setBusy(true); setError(null); setProgress(10);
    try {
      await new Promise<void>(resolve => window.setTimeout(resolve, 20));
      setProgress(35);
      const blob = await encodeAnimatedGif(frames.map(frame => ({ bitmap: frame.bitmap, durationMs: frame.durationMs })), { width: safeWidth, height: safeHeight, fit, background, colors, repeat });
      if (run !== runRef.current) return;
      const next = { blob, url: URL.createObjectURL(blob) }; resultRef.current = next; setResult(next); setProgress(100);
    } catch { if (run === runRef.current) setError(t.errors.encode); }
    finally { if (run === runRef.current) setBusy(false); }
  }

  function download() {
    if (!result) return;
    const link = document.createElement("a"); link.href = result.url; link.download = "animated-images.gif"; document.body.append(link); link.click(); link.remove();
  }

  return <div className="space-y-6">
    <p className="rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">{t.notice}</p>
    <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }} className="block cursor-pointer rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center transition hover:border-[var(--primary)] sm:p-10">
      <Images className="mx-auto text-[var(--primary)]" size={34}/><span className="mt-3 block text-lg font-bold">{t.upload}</span><span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">{t.uploadHelp}</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={event => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }}/>
    </label>
    {error ? <p role="alert" className="rounded-xl bg-[var(--error-bg)] p-4 text-sm text-[var(--error-fg)]">{error}</p> : null}

    {frames.length ? <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t.frames} <span className="text-[var(--primary)]">{frames.length}</span></h2><p className="mt-1 text-sm text-[var(--text-muted)]">{t.orderHelp}</p></div><Button variant="secondary" onClick={reset}><RotateCcw size={17}/>{t.reset}</Button></div>
        <ol className="mt-5 space-y-3">{frames.map((frame, index) => <li key={frame.id} className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          {/* User-selected local object URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={frame.url} alt={t.frameAlt(index + 1)} className="h-16 w-[4.5rem] rounded-lg bg-[var(--surface)] object-contain"/>
          <div className="min-w-0"><p className="truncate font-semibold">{index + 1}. {frame.file.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{frame.bitmap.width} × {frame.bitmap.height}px</p><label className="mt-2 flex max-w-48 items-center gap-2 text-sm"><span className="shrink-0">{t.delay}</span><input aria-label={t.delayFor(frame.file.name)} type="number" min={20} max={10000} step={10} value={frame.durationMs} onChange={event => updateDuration(frame.id, Number(event.target.value))} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2"/><span>ms</span></label></div>
          <div className="grid gap-1"><IconButton label={t.up} disabled={index === 0} onClick={() => moveFrame(index, -1)}><ArrowUp size={17}/></IconButton><IconButton label={t.down} disabled={index === frames.length - 1} onClick={() => moveFrame(index, 1)}><ArrowDown size={17}/></IconButton><IconButton label={t.remove} onClick={() => removeFrame(frame.id)}><Trash2 size={17}/></IconButton></div>
        </li>)}</ol>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="text-xl font-bold">{t.settings}</h2><div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3"><Field label={t.width}><input type="number" min={1} max={1600} value={width} onChange={event => { invalidate(); setWidth(Number(event.target.value)); }} className={inputClass}/></Field><Field label={t.height}><input type="number" min={1} max={1600} value={height} onChange={event => { invalidate(); setHeight(Number(event.target.value)); }} className={inputClass}/></Field></div>
          <Field label={t.fit}><select value={fit} onChange={event => { invalidate(); setFit(event.target.value as FrameFit); }} className={inputClass}><option value="contain">{t.contain}</option><option value="cover">{t.cover}</option></select></Field>
          <Field label={t.background}><div className="mt-2 flex gap-2"><input type="color" value={background} onChange={event => { invalidate(); setBackground(event.target.value); }} className="h-12 w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"/><input value={background} onChange={event => { if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) { invalidate(); setBackground(event.target.value); } }} onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(background)) setBackground("#ffffff"); }} className={`${inputClass} mt-0 flex-1 font-mono`}/></div></Field>
          <Field label={t.colors}><select value={colors} onChange={event => { invalidate(); setColors(Number(event.target.value) as 64 | 128 | 256); }} className={inputClass}><option value={256}>256</option><option value={128}>128</option><option value={64}>64</option></select></Field>
          <Field label={t.loop}><select value={repeat} onChange={event => { invalidate(); setRepeat(Number(event.target.value) as 0 | -1); }} className={inputClass}><option value={0}>{t.forever}</option><option value={-1}>{t.once}</option></select></Field>
          <Button className="w-full" onClick={() => void createGif()} disabled={busy || frames.length < 2}>{busy ? t.creating : t.create}</Button>
          {busy ? <div aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full bg-[var(--primary-fill)] transition-all" style={{ width: `${progress}%` }}/></div><p className="mt-2 text-sm text-[var(--text-muted)]">{t.progress}</p></div> : null}
        </div>
      </section>
    </div> : null}

    {result ? <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t.result}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{width} × {height}px · {(result.blob.size / 1024 / 1024).toFixed(2)} MiB</p></div><Button onClick={download}><Download size={18}/>{t.download}</Button></div>{/* Generated local GIF. */}{/* eslint-disable-next-line @next/next/no-img-element */}<img src={result.url} alt={t.resultAlt} className="mx-auto mt-5 max-h-[70vh] max-w-full rounded-xl bg-[var(--surface-muted)] object-contain"/></section> : null}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block font-bold">{label}{children}</label>; }
function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] disabled:opacity-35">{children}</button>; }
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]";

const COPY = {
  ko: { notice: "선택한 이미지는 서버로 전송하지 않고 현재 브라우저에서 GIF로 만듭니다. GIF는 프레임마다 최대 256색을 사용하므로 사진의 색상이나 그러데이션이 원본과 다르게 보일 수 있습니다.", upload: "이미지 여러 장 선택", uploadHelp: "JPG, PNG, WebP · 2~20장 · 파일당 15 MiB · 정지 이미지", frames: "프레임", orderHelp: "위아래 버튼으로 재생 순서를 정하고 각 이미지의 표시 시간을 입력하세요.", reset: "전체 초기화", frameAlt: (n: number) => `${n}번 프레임 미리보기`, delay: "시간", delayFor: (name: string) => `${name} 표시 시간`, up: "위로 이동", down: "아래로 이동", remove: "프레임 삭제", settings: "GIF 설정", width: "가로(px)", height: "세로(px)", fit: "이미지 맞춤", contain: "전체 표시(여백)", cover: "가득 채우기(잘라내기)", background: "여백 배경색", colors: "프레임 색상 수", loop: "반복", forever: "계속 반복", once: "한 번 재생", create: "GIF 만들기", creating: "GIF 만드는 중…", progress: "프레임을 색상 변환하고 인코딩하고 있습니다. 이미지가 크면 시간이 걸릴 수 있습니다.", result: "완성된 GIF", download: "GIF 다운로드", resultAlt: "생성된 애니메이션 GIF 미리보기", errors: { count: "이미지는 한 번에 최대 20장까지 추가할 수 있습니다.", size: "각 이미지 파일은 15 MiB 이하여야 합니다.", type: "JPG, PNG 또는 WebP 정지 이미지를 선택하세요.", animated: "움직이는 GIF·WebP의 내부 프레임은 가져올 수 없습니다. 정지 이미지를 사용하세요.", pixels: "한 이미지의 해상도가 24MP 제한을 넘었습니다.", total: "선택한 이미지의 전체 해상도가 처리 제한을 넘었습니다. 일부 이미지를 줄이거나 제거하세요.", decode: "이미지를 읽지 못했습니다. 손상 여부를 확인하세요.", minimum: "GIF를 만들려면 이미지가 2장 이상 필요합니다.", outputPixels: "출력 크기와 프레임 수의 조합이 처리 제한을 넘습니다. 크기나 이미지 수를 줄이세요.", encode: "GIF를 만들지 못했습니다. 출력 크기나 이미지 수를 줄여 다시 시도하세요." } },
  en: { notice: "Selected images stay in this browser while the GIF is created. GIF supports up to 256 colors per frame, so photos and gradients may look different from the originals.", upload: "Choose multiple images", uploadHelp: "JPG, PNG, WebP · 2–20 files · 15 MiB each · still images", frames: "Frames", orderHelp: "Set the playback order and the display time for each image.", reset: "Reset all", frameAlt: (n: number) => `Frame ${n} preview`, delay: "Time", delayFor: (name: string) => `Display time for ${name}`, up: "Move up", down: "Move down", remove: "Remove frame", settings: "GIF settings", width: "Width (px)", height: "Height (px)", fit: "Image fit", contain: "Fit with padding", cover: "Fill and crop", background: "Padding color", colors: "Colors per frame", loop: "Playback", forever: "Loop forever", once: "Play once", create: "Create GIF", creating: "Creating GIF…", progress: "Reducing colors and encoding frames. Large images can take longer.", result: "Generated GIF", download: "Download GIF", resultAlt: "Generated animated GIF preview", errors: { count: "You can add up to 20 images.", size: "Each image must be 15 MiB or smaller.", type: "Choose still JPG, PNG, or WebP images.", animated: "Frames inside animated GIF or WebP files cannot be imported. Use still images.", pixels: "An image exceeds the 24 MP limit.", total: "The selected images exceed the total processing limit. Remove or resize some images.", decode: "An image could not be read. Check whether it is damaged.", minimum: "Choose at least two images to create a GIF.", outputPixels: "This output size and frame count exceed the processing limit.", encode: "The GIF could not be created. Reduce its dimensions or frame count and try again." } },
  ja: { notice: "選択した画像はサーバーへ送信せず、このブラウザー内でGIFに変換します。GIFは1フレーム最大256色のため、写真やグラデーションは元画像と異なる場合があります。", upload: "複数の画像を選択", uploadHelp: "JPG、PNG、WebP・2～20枚・1ファイル15 MiB・静止画像", frames: "フレーム", orderHelp: "再生順と各画像の表示時間を設定します。", reset: "すべてリセット", frameAlt: (n: number) => `${n}番目のフレーム`, delay: "時間", delayFor: (name: string) => `${name}の表示時間`, up: "上へ移動", down: "下へ移動", remove: "フレームを削除", settings: "GIF設定", width: "幅（px）", height: "高さ（px）", fit: "画像の配置", contain: "全体表示（余白あり）", cover: "全面表示（切り抜き）", background: "余白の色", colors: "フレームの色数", loop: "再生", forever: "繰り返す", once: "1回再生", create: "GIFを作成", creating: "GIFを作成中…", progress: "減色してフレームをエンコードしています。大きな画像は時間がかかります。", result: "完成したGIF", download: "GIFをダウンロード", resultAlt: "生成したアニメーションGIF", errors: { count: "画像は最大20枚まで追加できます。", size: "各画像は15 MiB以下にしてください。", type: "JPG、PNG、WebPの静止画像を選択してください。", animated: "アニメーションGIF・WebP内のフレームは読み込めません。静止画像を使用してください。", pixels: "画像が24MPの上限を超えています。", total: "画像全体が処理上限を超えています。画像を減らすか小さくしてください。", decode: "画像を読み取れませんでした。破損していないか確認してください。", minimum: "GIFの作成には2枚以上の画像が必要です。", outputPixels: "出力サイズとフレーム数が処理上限を超えています。", encode: "GIFを作成できませんでした。サイズや枚数を減らして再試行してください。" } },
} as const;
