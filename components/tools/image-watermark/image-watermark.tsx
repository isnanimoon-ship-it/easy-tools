"use client";

import { Download, ImagePlus, RotateCcw, Type } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { inspectContainer } from "@/lib/tools/image-metadata-remover/container-scanner";
import { MAX_FILE_BYTES, validDimensions, validateImageFile, type ImageMime } from "@/lib/tools/image-compressor/file-validation";
import { drawWatermarked, outputFilename, renderWatermark } from "@/lib/tools/image-watermark/render";
import { DEFAULT_SETTINGS, type WatermarkPosition, type WatermarkSettings } from "@/lib/tools/image-watermark/types";

type LoadedImage = { file: File; bitmap: ImageBitmap; mime: ImageMime; url: string };
type Result = { blob: Blob; url: string; mime: ImageMime; width: number; height: number };
const LOGO_MAX_BYTES = 10 * 1024 * 1024;
const POSITIONS: Array<{ value: WatermarkPosition; label: string }> = [
  { value: "top-left", label: "↖ 좌상" }, { value: "top", label: "↑ 상단" }, { value: "top-right", label: "↗ 우상" },
  { value: "left", label: "← 좌측" }, { value: "center", label: "● 중앙" }, { value: "right", label: "→ 우측" },
  { value: "bottom-left", label: "↙ 좌하" }, { value: "bottom", label: "↓ 하단" }, { value: "bottom-right", label: "↘ 우하" },
];

export function ImageWatermark() {
  const locale = useLocale() as AppLocale;
  const t = COPY[locale];
  const [base, setBase] = useState<LoadedImage | null>(null);
  const [logo, setLogo] = useState<LoadedImage | null>(null);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<LoadedImage | null>(null);
  const logoRef = useRef<LoadedImage | null>(null);
  const resultRef = useRef<Result | null>(null);
  const runRef = useRef(0);

  function disposeImage(image: LoadedImage | null) { if (image) { image.bitmap.close(); URL.revokeObjectURL(image.url); } }
  function disposeResult(value: Result | null) { if (value) URL.revokeObjectURL(value.url); }
  function invalidate() { disposeResult(resultRef.current); resultRef.current = null; setResult(null); }
  function setSettings(patch: Partial<WatermarkSettings>) { invalidate(); setSettingsState(current => ({ ...current, ...patch })); }

  useEffect(() => () => { disposeImage(baseRef.current); disposeImage(logoRef.current); disposeResult(resultRef.current); runRef.current += 1; }, []);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !base) return;
    const scale = Math.min(1, 1200 / Math.max(base.bitmap.width, base.bitmap.height));
    canvas.width = Math.max(1, Math.round(base.bitmap.width * scale)); canvas.height = Math.max(1, Math.round(base.bitmap.height * scale));
    const context = canvas.getContext("2d"); if (!context) return;
    drawWatermarked(context, base.bitmap, logo?.bitmap ?? null, settings, { width: canvas.width, height: canvas.height });
  }, [base, logo, settings, version]);

  async function loadImage(file: File, kind: "base" | "logo") {
    setError(null); invalidate();
    if (kind === "logo" && file.size > LOGO_MAX_BYTES) { setError(t.errors.logoSize); return; }
    const checked = await validateImageFile(file);
    if (!checked.ok) { setError(checked.reason === "file-too-large" ? t.errors.size : t.errors.type); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (inspectContainer(bytes, checked.mime).animated) { setError(t.errors.animated); return; }
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const invalidBase = !validDimensions(bitmap.width, bitmap.height);
      const invalidLogo = kind === "logo" && (bitmap.width > 8000 || bitmap.height > 8000 || bitmap.width * bitmap.height > 12_000_000);
      if (invalidBase || invalidLogo) { bitmap.close(); setError(t.errors.dimensions); return; }
      const loaded = { file, bitmap, mime: checked.mime, url: URL.createObjectURL(file) };
      if (kind === "base") { disposeImage(baseRef.current); baseRef.current = loaded; setBase(loaded); }
      else { disposeImage(logoRef.current); logoRef.current = loaded; setLogo(loaded); }
      setVersion(value => value + 1);
    } catch { setError(t.errors.decode); }
  }

  async function apply() {
    if (!base || busy) return;
    if (settings.mode === "text" && !settings.text.trim()) { setError(t.errors.text); return; }
    if (settings.mode === "image" && !logo) { setError(t.errors.logo); return; }
    const run = ++runRef.current; setBusy(true); setError(null); invalidate();
    try {
      const rendered = await renderWatermark(base.bitmap, logo?.bitmap ?? null, settings, base.mime);
      if (run !== runRef.current) return;
      const next = { ...rendered, url: URL.createObjectURL(rendered.blob) };
      resultRef.current = next; setResult(next);
    } catch { if (run === runRef.current) setError(t.errors.render); }
    finally { if (run === runRef.current) setBusy(false); }
  }

  function reset() {
    runRef.current += 1; disposeImage(baseRef.current); disposeImage(logoRef.current); disposeResult(resultRef.current);
    baseRef.current = null; logoRef.current = null; resultRef.current = null; setBase(null); setLogo(null); setResult(null); setSettingsState(DEFAULT_SETTINGS); setError(null); setBusy(false);
  }

  function download() {
    if (!result || !base) return;
    const link = document.createElement("a"); link.href = result.url; link.download = outputFilename(base.file.name, result.mime); document.body.append(link); link.click(); link.remove();
  }

  return <div className="space-y-6">
    <p className="rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">{t.notice}</p>
    {!base ? <UploadBox id="watermark-base" title={t.chooseBase} help={t.baseHelp} onFile={file => void loadImage(file, "base")}/> : <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t.preview}</h2><p className="mt-1 break-all text-sm text-[var(--text-muted)]">{base.file.name} · {base.bitmap.width} × {base.bitmap.height}px</p></div><label className="cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold hover:bg-[var(--surface-muted)]">{t.change}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void loadImage(file, "base"); event.target.value = ""; }}/></label></div>
          <div className="mt-4 grid min-h-72 place-items-center overflow-hidden rounded-xl bg-[var(--surface-muted)] p-3"><canvas ref={previewRef} aria-label={t.previewAlt} className="max-h-[65vh] max-w-full object-contain"/></div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{t.previewHelp}</p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-bold">{t.settings}</h2>
          <div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1" role="group" aria-label={t.mode}>
            <ModeButton active={settings.mode === "text"} onClick={() => setSettings({ mode: "text" })}><Type size={17}/>{t.textMode}</ModeButton>
            <ModeButton active={settings.mode === "image"} onClick={() => setSettings({ mode: "image" })}><ImagePlus size={17}/>{t.imageMode}</ModeButton>
          </div>

          {settings.mode === "text" ? <div className="mt-5 space-y-4">
            <Field label={t.text}><textarea value={settings.text} maxLength={500} rows={3} onChange={event => setSettings({ text: event.target.value })} placeholder="Konly" className={inputClass}/></Field>
            <div className="grid grid-cols-2 gap-3"><Field label={t.font}><select value={settings.fontFamily} onChange={event => setSettings({ fontFamily: event.target.value as WatermarkSettings["fontFamily"] })} className={inputClass}><option value="sans">{t.sans}</option><option value="serif">{t.serif}</option><option value="mono">{t.mono}</option></select></Field><Field label={t.effect}><select value={settings.effect} onChange={event => setSettings({ effect: event.target.value as WatermarkSettings["effect"] })} className={inputClass}><option value="none">{t.none}</option><option value="shadow">{t.shadow}</option><option value="background">{t.background}</option></select></Field></div>
            <label className="flex min-h-11 items-center gap-2 font-semibold"><input type="checkbox" checked={settings.bold} onChange={event => setSettings({ bold: event.target.checked })} className="size-4"/>{t.bold}</label>
            <Range label={t.textSize} value={settings.sizePercent} min={1} max={30} suffix="%" onChange={value => setSettings({ sizePercent: value })}/>
            <Field label={t.color}><div className="mt-2 flex gap-2"><input type="color" value={settings.color} onChange={event => setSettings({ color: event.target.value })} className="h-12 w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"/><input key={settings.color} defaultValue={settings.color} pattern="#[0-9a-fA-F]{6}" onBlur={event => { if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) setSettings({ color: event.target.value }); else event.target.value = settings.color; }} className={`${inputClass} mt-0 flex-1 font-mono`}/></div></Field>
          </div> : <div className="mt-5 space-y-4"><UploadBox compact id="watermark-logo" title={logo ? t.changeLogo : t.chooseLogo} help={logo ? `${logo.file.name} · ${logo.bitmap.width} × ${logo.bitmap.height}px` : t.logoHelp} onFile={file => void loadImage(file, "logo")}/><Range label={t.logoSize} value={settings.imageSizePercent} min={5} max={80} suffix="%" onChange={value => setSettings({ imageSizePercent: value })}/></div>}

          <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
            <Range label={t.opacity} value={settings.opacity} min={5} max={100} suffix="%" onChange={value => setSettings({ opacity: value })}/>
            <Range label={t.rotation} value={settings.rotation} min={-180} max={180} suffix="°" onChange={value => setSettings({ rotation: value })}/>
            <div><p className="font-bold">{t.placement}</p><div className="mt-2 grid grid-cols-3 gap-2">{POSITIONS.map(position => <button key={position.value} type="button" aria-pressed={settings.position === position.value} disabled={settings.repeat} onClick={() => setSettings({ position: position.value })} className={`min-h-11 rounded-lg border px-2 text-sm font-semibold disabled:opacity-40 ${settings.position === position.value ? "border-[var(--primary-fill)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}>{position.label}</button>)}</div></div>
            <Range label={t.margin} value={settings.marginPercent} min={0} max={20} suffix="%" disabled={settings.repeat || settings.position === "center"} onChange={value => setSettings({ marginPercent: value })}/>
            <label className="flex min-h-11 items-center gap-2 font-semibold"><input type="checkbox" checked={settings.repeat} onChange={event => setSettings({ repeat: event.target.checked, rotation: event.target.checked && settings.rotation === 0 ? -30 : settings.rotation })} className="size-4"/>{t.repeat}</label>
            {settings.repeat ? <Range label={t.gap} value={settings.gapPercent} min={10} max={200} suffix="%" onChange={value => setSettings({ gapPercent: value })}/> : null}
          </div>

          <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"><Field label={t.output}><select value={settings.outputMime} onChange={event => setSettings({ outputMime: event.target.value as WatermarkSettings["outputMime"] })} className={inputClass}><option value="original">{t.original}</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></Field>{settings.outputMime !== "image/png" && !(settings.outputMime === "original" && base.mime === "image/png") ? <Range label={t.quality} value={settings.quality} min={10} max={100} suffix="%" onChange={value => setSettings({ quality: value })}/> : null}</div>
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-2"><Button onClick={() => void apply()} disabled={busy}>{busy ? t.applying : t.apply}</Button><Button variant="secondary" onClick={reset} disabled={busy}><RotateCcw size={17}/>{t.reset}</Button></div>
        </section>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-[var(--error-bg)] p-4 text-sm text-[var(--error-fg)]">{error}</p> : null}
      {result ? <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t.result}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{result.width} × {result.height}px · {(result.blob.size / 1024 / 1024).toFixed(2)} MiB · {result.mime.replace("image/", "").toUpperCase()}</p></div><Button onClick={download}><Download size={18}/>{t.download}</Button></div>
        {/* Local result blob, never uploaded. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.url} alt={t.resultAlt} className="mx-auto mt-5 max-h-[70vh] max-w-full rounded-xl bg-[var(--surface-muted)] object-contain"/>
      </section> : null}
    </>}
  </div>;
}

function UploadBox({ id, title, help, onFile, compact = false }: { id: string; title: string; help: string; onFile: (file: File) => void; compact?: boolean }) { return <label htmlFor={id} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) onFile(file); }} className={`block cursor-pointer rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-center transition hover:border-[var(--primary)] ${compact ? "p-4" : "p-8 sm:p-12"}`}><ImagePlus className="mx-auto text-[var(--primary)]" size={compact ? 24 : 32}/><span className="mt-3 block font-bold">{title}</span><span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">{help}</span><input id={id} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }}/></label>; }
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold ${active ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}>{children}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block font-bold">{label}{children}</label>; }
function Range({ label, value, min, max, suffix, onChange, disabled = false }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void; disabled?: boolean }) { return <label className={`block font-bold ${disabled ? "opacity-50" : ""}`}><span className="flex items-center justify-between gap-3"><span>{label}</span><span className="text-sm text-[var(--text-muted)]">{value}{suffix}</span></span><input type="range" value={value} min={min} max={max} disabled={disabled} onChange={event => onChange(Number(event.target.value))} className="mt-2 w-full accent-[var(--primary-fill)]"/></label>; }
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]";

const COPY = {
  ko: { notice: "원본 이미지와 워터마크는 서버로 전송되지 않고 현재 브라우저에서 처리됩니다. 결과를 만들 때 메타데이터와 색상 표현이 달라질 수 있습니다.", chooseBase: "원본 이미지 선택", baseHelp: "JPG, PNG, WebP · 최대 25 MiB · 정적 이미지 1장", preview: "미리보기", previewAlt: "워터마크 적용 미리보기", previewHelp: "화면 미리보기는 축소되어 보일 수 있으며 다운로드 결과는 원본 해상도로 생성됩니다.", change: "원본 교체", settings: "설정", mode: "워터마크 종류", textMode: "텍스트", imageMode: "이미지", text: "워터마크 텍스트", font: "글꼴", sans: "고딕", serif: "명조", mono: "고정폭", effect: "텍스트 효과", none: "없음", shadow: "그림자", background: "배경 박스", bold: "굵게", textSize: "글꼴 크기", color: "색상", chooseLogo: "워터마크 이미지 선택", changeLogo: "워터마크 이미지 교체", logoHelp: "투명 PNG 또는 WebP 권장 · 최대 10 MiB", logoSize: "이미지 크기", opacity: "불투명도", rotation: "회전", placement: "위치", margin: "가장자리 여백", repeat: "반복해서 채우기", gap: "반복 간격", output: "출력 형식", original: "원본 형식 유지", quality: "출력 품질", apply: "워터마크 적용", applying: "적용 중…", reset: "초기화", result: "완성된 이미지", resultAlt: "워터마크가 적용된 결과 이미지", download: "다운로드", errors: { type: "JPG, PNG, WebP 형식의 정상적인 이미지를 선택하세요.", size: `원본 이미지는 ${MAX_FILE_BYTES / 1024 / 1024} MiB 이하여야 합니다.`, logoSize: "워터마크 이미지는 10 MiB 이하여야 합니다.", animated: "움직이는 이미지는 지원하지 않습니다. 정적 이미지를 선택하세요.", dimensions: "이미지 해상도가 지원 범위를 초과했습니다.", decode: "이미지를 읽지 못했습니다. 파일이 손상되었는지 확인하세요.", text: "워터마크 텍스트를 입력하세요.", logo: "워터마크로 사용할 이미지를 선택하세요.", render: "결과 이미지를 만들지 못했습니다. 형식이나 이미지 크기를 변경해 다시 시도하세요." } },
  en: { notice: "Your source and watermark images are processed in this browser and are not uploaded. Metadata and color rendering may change in the exported image.", chooseBase: "Choose source image", baseHelp: "JPG, PNG, WebP · up to 25 MiB · one still image", preview: "Preview", previewAlt: "Watermark preview", previewHelp: "The preview may be scaled down. The download is rendered at the source resolution.", change: "Replace source", settings: "Settings", mode: "Watermark type", textMode: "Text", imageMode: "Image", text: "Watermark text", font: "Font", sans: "Sans serif", serif: "Serif", mono: "Monospace", effect: "Text effect", none: "None", shadow: "Shadow", background: "Background", bold: "Bold", textSize: "Font size", color: "Color", chooseLogo: "Choose watermark image", changeLogo: "Replace watermark image", logoHelp: "Transparent PNG or WebP recommended · up to 10 MiB", logoSize: "Image size", opacity: "Opacity", rotation: "Rotation", placement: "Position", margin: "Edge margin", repeat: "Tile across image", gap: "Tile spacing", output: "Output format", original: "Keep source format", quality: "Output quality", apply: "Apply watermark", applying: "Applying…", reset: "Reset", result: "Finished image", resultAlt: "Watermarked result", download: "Download", errors: { type: "Choose a valid JPG, PNG, or WebP image.", size: "The source image must be 25 MiB or smaller.", logoSize: "The watermark image must be 10 MiB or smaller.", animated: "Animated images are not supported.", dimensions: "The image dimensions exceed the supported limit.", decode: "Could not read the image. It may be damaged.", text: "Enter watermark text.", logo: "Choose an image to use as the watermark.", render: "Could not create the result. Try another format or a smaller image." } },
  ja: { notice: "元画像とウォーターマークはアップロードされず、このブラウザ内で処理されます。出力時にメタデータや色表現が変わる場合があります。", chooseBase: "元画像を選択", baseHelp: "JPG、PNG、WebP・最大25 MiB・静止画像1枚", preview: "プレビュー", previewAlt: "ウォーターマークのプレビュー", previewHelp: "プレビューは縮小表示される場合があります。保存画像は元の解像度で作成されます。", change: "元画像を変更", settings: "設定", mode: "ウォーターマークの種類", textMode: "テキスト", imageMode: "画像", text: "ウォーターマークテキスト", font: "フォント", sans: "ゴシック", serif: "明朝", mono: "等幅", effect: "テキスト効果", none: "なし", shadow: "影", background: "背景", bold: "太字", textSize: "文字サイズ", color: "色", chooseLogo: "ウォーターマーク画像を選択", changeLogo: "ウォーターマーク画像を変更", logoHelp: "透過PNGまたはWebP推奨・最大10 MiB", logoSize: "画像サイズ", opacity: "不透明度", rotation: "回転", placement: "位置", margin: "端からの余白", repeat: "画像全体に繰り返す", gap: "繰り返し間隔", output: "出力形式", original: "元の形式を維持", quality: "出力品質", apply: "ウォーターマークを適用", applying: "適用中…", reset: "リセット", result: "完成画像", resultAlt: "ウォーターマーク適用結果", download: "ダウンロード", errors: { type: "有効なJPG、PNG、WebP画像を選択してください。", size: "元画像は25 MiB以下にしてください。", logoSize: "ウォーターマーク画像は10 MiB以下にしてください。", animated: "アニメーション画像には対応していません。", dimensions: "画像サイズが対応範囲を超えています。", decode: "画像を読み込めません。破損している可能性があります。", text: "ウォーターマーク文字を入力してください。", logo: "ウォーターマークに使う画像を選択してください。", render: "結果を作成できません。形式または画像サイズを変更してください。" } },
} as const;
