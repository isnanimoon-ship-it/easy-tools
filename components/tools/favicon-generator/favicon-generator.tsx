"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, RotateCcw, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FaviconCanvas } from "./favicon-canvas";
import { clampCrop } from "@/lib/tools/favicon-generator/crop";
import { isLowContrast } from "@/lib/tools/favicon-generator/contrast";
import { buildIco } from "@/lib/tools/favicon-generator/ico";
import { buildHtmlSnippet, buildManifest, buildZipFilename } from "@/lib/tools/favicon-generator/manifest";
import { buildZip, textToBytes, type PackageFile } from "@/lib/tools/favicon-generator/package";
import { renderFavicon } from "@/lib/tools/favicon-generator/render";
import {
  DEFAULT_CROP,
  ICO_SIZES,
  OUTPUT_PNG_SIZES,
  PREVIEW_SIZES,
  type CropState,
  type FaviconSpec,
  type ImageBackground,
  type ShapeKind,
} from "@/lib/tools/favicon-generator/types";
import { isAnimatedWebp, validateFile, validDimensions, type ValidationError } from "@/lib/tools/favicon-generator/validation";

type SourceTab = "text" | "emoji" | "image" | "shape";
type ShapeContentType = "none" | "text" | "emoji";

const SOURCE_TABS: SourceTab[] = ["text", "emoji", "image", "shape"];
const SHAPE_KINDS: ShapeKind[] = ["square", "rounded", "circle"];
const EMOJI_PRESETS = ["🚀", "💡", "🎯", "🧠", "🔥", "⭐", "✨", "🎨", "🛠️", "📦", "🌟", "💎"];
const DEFAULT_BACKGROUND = "#5B8DEF";
const DEFAULT_FOREGROUND = "#FFFFFF";
const CROP_EDITOR_SIZE = 256;

// Sizes up to 64px preview at their true 1:1 pixel size (that's the point —
// seeing how small they really look). Sizes above that are compressed into
// a 64-128px range so a 512px icon still reads as clearly larger than a
// 180px one, without literally taking up 512 CSS pixels on screen.
function previewDisplaySize(size: number): number {
  if (size <= 64) return size;
  const minSize = 64;
  const maxSize = 512;
  const minDisplay = 64;
  const maxDisplay = 128;
  return minDisplay + ((size - minSize) * (maxDisplay - minDisplay)) / (maxSize - minSize);
}

type UploadedImage = { file: File; bitmap: ImageBitmap };

export function FaviconGenerator() {
  const t = useTranslations("Tools.faviconGenerator");

  const [activeTab, setActiveTab] = useState<SourceTab>("text");
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [foregroundColor, setForegroundColor] = useState(DEFAULT_FOREGROUND);
  const [siteName, setSiteName] = useState("");

  const [textValue, setTextValue] = useState("A");
  const [textBold, setTextBold] = useState(true);

  const [emojiValue, setEmojiValue] = useState("🚀");

  const [shapeKind, setShapeKind] = useState<ShapeKind>("rounded");
  const [shapeRadius, setShapeRadius] = useState(0.2);
  const [shapeBorderEnabled, setShapeBorderEnabled] = useState(false);
  const [shapeBorderColor, setShapeBorderColor] = useState("#000000");
  const [shapeBorderWidth, setShapeBorderWidth] = useState(4);
  const [shapeContentType, setShapeContentType] = useState<ShapeContentType>("text");
  const [shapeContentText, setShapeContentText] = useState("A");
  const [shapeContentEmoji, setShapeContentEmoji] = useState("🚀");

  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [crop, setCrop] = useState<CropState>(DEFAULT_CROP);
  const [imageBackground, setImageBackground] = useState<ImageBackground>("transparent");
  const [imageError, setImageError] = useState<ValidationError | "multiple-files" | null>(null);
  const [dragging, setDragging] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const panDrag = useRef<{ startX: number; startY: number; startPan: CropState } | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      uploadedImage?.bitmap.close();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [uploadedImage],
  );

  const spec: FaviconSpec | null = useMemo(() => {
    if (activeTab === "text") {
      return { kind: "text", text: textValue, background: backgroundColor, foreground: foregroundColor, bold: textBold };
    }
    if (activeTab === "emoji") {
      return { kind: "emoji", emoji: emojiValue, background: backgroundColor };
    }
    if (activeTab === "shape") {
      const content =
        shapeContentType === "text"
          ? ({ type: "text", text: shapeContentText, foreground: foregroundColor } as const)
          : shapeContentType === "emoji"
            ? ({ type: "emoji", emoji: shapeContentEmoji } as const)
            : ({ type: "none" } as const);
      return {
        kind: "shape",
        shape: shapeKind,
        background: backgroundColor,
        border: shapeBorderEnabled ? { color: shapeBorderColor, width: shapeBorderWidth } : null,
        radius: shapeRadius,
        content,
      };
    }
    if (activeTab === "image" && uploadedImage) {
      return { kind: "image", bitmap: uploadedImage.bitmap, crop, background: imageBackground };
    }
    return null;
  }, [
    activeTab,
    textValue,
    backgroundColor,
    foregroundColor,
    textBold,
    emojiValue,
    shapeKind,
    shapeBorderEnabled,
    shapeBorderColor,
    shapeBorderWidth,
    shapeRadius,
    shapeContentType,
    shapeContentText,
    shapeContentEmoji,
    uploadedImage,
    crop,
    imageBackground,
  ]);

  const textTooLong = activeTab === "text" && [...textValue].length > 3;
  const shapeTextTooLong = activeTab === "shape" && shapeContentType === "text" && [...shapeContentText].length > 3;
  const lowContrast = useMemo(() => {
    if (activeTab === "text") return isLowContrast(backgroundColor, foregroundColor);
    if (activeTab === "shape" && shapeContentType === "text") return isLowContrast(backgroundColor, foregroundColor);
    return false;
  }, [activeTab, backgroundColor, foregroundColor, shapeContentType]);

  const htmlSnippet = useMemo(
    () => buildHtmlSnippet({ siteName, themeColor: backgroundColor }),
    [siteName, backgroundColor],
  );
  const manifestText = useMemo(
    () => buildManifest({ siteName, themeColor: backgroundColor }),
    [siteName, backgroundColor],
  );

  async function loadFile(file: File) {
    const basic = validateFile(file);
    if (basic) {
      setImageError(basic);
      return;
    }
    if (await isAnimatedWebp(file)) {
      setImageError("animated-image");
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setImageError("decode-failed");
      return;
    }
    if (!validDimensions(bitmap.width, bitmap.height)) {
      bitmap.close();
      setImageError("dimension-limit");
      return;
    }
    uploadedImage?.bitmap.close();
    setUploadedImage({ file, bitmap });
    setCrop(DEFAULT_CROP);
    setImageError(null);
  }

  function acceptFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length !== 1) {
      setImageError("multiple-files");
      return;
    }
    void loadFile(list[0]);
  }

  function handlePanPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    panDrag.current = { startX: event.clientX, startY: event.clientY, startPan: crop };
  }
  function handlePanPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!panDrag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dxFrac = (event.clientX - panDrag.current.startX) / rect.width;
    const dyFrac = (event.clientY - panDrag.current.startY) / rect.height;
    setCrop(
      clampCrop({
        zoom: panDrag.current.startPan.zoom,
        panX: panDrag.current.startPan.panX - dxFrac * 2,
        panY: panDrag.current.startPan.panY - dyFrac * 2,
      }),
    );
  }
  function handlePanPointerUp() {
    panDrag.current = null;
  }

  function resetAll() {
    setActiveTab("text");
    setBackgroundColor(DEFAULT_BACKGROUND);
    setForegroundColor(DEFAULT_FOREGROUND);
    setSiteName("");
    setTextValue("A");
    setTextBold(true);
    setEmojiValue("🚀");
    setShapeKind("rounded");
    setShapeRadius(0.2);
    setShapeBorderEnabled(false);
    setShapeBorderColor("#000000");
    setShapeBorderWidth(4);
    setShapeContentType("text");
    setShapeContentText("A");
    setShapeContentEmoji("🚀");
    uploadedImage?.bitmap.close();
    setUploadedImage(null);
    setCrop(DEFAULT_CROP);
    setImageBackground("transparent");
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function copyHtmlCode() {
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable; button simply stays unconfirmed.
    }
  }

  async function downloadZip() {
    if (!spec) return;
    setGenerating(true);
    try {
      const pngBytes: Partial<Record<number, Uint8Array>> = {};
      for (const size of OUTPUT_PNG_SIZES) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas-context-unavailable");
        renderFavicon(ctx, spec, size);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("toBlob-failed"))), "image/png"),
        );
        pngBytes[size] = new Uint8Array(await blob.arrayBuffer());
      }
      const icoBytes = buildIco(
        ICO_SIZES.map((size) => ({ size, png: pngBytes[size]! })),
      );
      const files: PackageFile[] = [
        { name: "favicon.ico", data: icoBytes },
        { name: "favicon-16x16.png", data: pngBytes[16]! },
        { name: "favicon-32x32.png", data: pngBytes[32]! },
        { name: "favicon-48x48.png", data: pngBytes[48]! },
        { name: "apple-touch-icon.png", data: pngBytes[180]! },
        { name: "android-chrome-192x192.png", data: pngBytes[192]! },
        { name: "android-chrome-512x512.png", data: pngBytes[512]! },
        { name: "site.webmanifest", data: textToBytes(manifestText) },
        { name: "README.txt", data: textToBytes(t("readme.body", { html: htmlSnippet })) },
      ];
      const zipBytes = buildZip(files);
      const blob = new Blob([new Uint8Array(zipBytes)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildZipFilename(siteName);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label={t("tabs.label")}
        className="flex flex-wrap gap-2"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const index = SOURCE_TABS.indexOf(activeTab);
          const nextIndex =
            event.key === "ArrowRight"
              ? (index + 1) % SOURCE_TABS.length
              : (index - 1 + SOURCE_TABS.length) % SOURCE_TABS.length;
          setActiveTab(SOURCE_TABS[nextIndex]);
        }}
      >
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.9fr)]">
        <section className="min-w-0 space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
          {activeTab === "text" ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                {t("text.label")}
                <input
                  type="text"
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  maxLength={8}
                  className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-lg"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={textBold} onChange={(event) => setTextBold(event.target.checked)} className="size-4" />
                {t("text.bold")}
              </label>
              {textTooLong ? (
                <p className="rounded-lg bg-[var(--warning-bg)] p-2 text-xs font-semibold text-[var(--warning-fg)]">
                  {t("text.tooLong")}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeTab === "emoji" ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                {t("emoji.label")}
                <input
                  type="text"
                  value={emojiValue}
                  onChange={(event) => setEmojiValue(event.target.value)}
                  maxLength={8}
                  className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-lg"
                />
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("emoji.presets")}>
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEmojiValue(emoji)}
                    aria-label={emoji}
                    className="flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xl hover:bg-[var(--surface-muted)]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{t("emoji.platformNotice")}</p>
            </div>
          ) : null}

          {activeTab === "shape" ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("shape.kind")}</p>
                <div className="mt-2 flex gap-2">
                  {SHAPE_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={shapeKind === kind}
                      onClick={() => setShapeKind(kind)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${shapeKind === kind ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}
                    >
                      {t(`shape.kinds.${kind}`)}
                    </button>
                  ))}
                </div>
              </div>
              {shapeKind === "rounded" ? (
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  {t("shape.radius")}
                  <input
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.05}
                    value={shapeRadius}
                    onChange={(event) => setShapeRadius(Number(event.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shapeBorderEnabled} onChange={(event) => setShapeBorderEnabled(event.target.checked)} className="size-4" />
                {t("shape.border")}
              </label>
              {shapeBorderEnabled ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    {t("shape.borderColor")}
                    <input type="color" value={shapeBorderColor} onChange={(event) => setShapeBorderColor(event.target.value)} className="h-9 w-14" />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    {t("shape.borderWidth")}
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={shapeBorderWidth}
                      onChange={(event) => setShapeBorderWidth(Number(event.target.value))}
                      className="min-h-9 w-16 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2"
                    />
                  </label>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("shape.content")}</p>
                <div className="mt-2 flex gap-2">
                  {(["none", "text", "emoji"] as ShapeContentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={shapeContentType === type}
                      onClick={() => setShapeContentType(type)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${shapeContentType === type ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}
                    >
                      {t(`shape.contentTypes.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
              {shapeContentType === "text" ? (
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  {t("shape.contentText")}
                  <input
                    type="text"
                    value={shapeContentText}
                    onChange={(event) => setShapeContentText(event.target.value)}
                    maxLength={8}
                    className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                  />
                </label>
              ) : null}
              {shapeContentType === "emoji" ? (
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  {t("shape.contentEmoji")}
                  <input
                    type="text"
                    value={shapeContentEmoji}
                    onChange={(event) => setShapeContentEmoji(event.target.value)}
                    maxLength={8}
                    className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                  />
                </label>
              ) : null}
              {shapeTextTooLong ? (
                <p className="rounded-lg bg-[var(--warning-bg)] p-2 text-xs font-semibold text-[var(--warning-fg)]">
                  {t("text.tooLong")}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeTab === "image" ? (
            <div className="space-y-4">
              <section
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragDepth.current++;
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (--dragDepth.current <= 0) {
                    dragDepth.current = 0;
                    setDragging(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dragDepth.current = 0;
                  setDragging(false);
                  acceptFiles(event.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)]"}`}
              >
                <Upload aria-hidden="true" className="mx-auto text-[var(--primary)]" size={28} />
                <p className="mt-2 text-sm text-[var(--text-muted)]">{dragging ? t("image.drop") : t("image.help")}</p>
                <input
                  ref={fileInputRef}
                  id="favicon-image-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) acceptFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <label
                  htmlFor="favicon-image-file"
                  className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-[var(--primary-fill)] px-4 py-2.5 font-semibold text-white"
                >
                  {t("image.choose")}
                </label>
              </section>
              {imageError ? (
                <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">
                  {t(`errors.${imageError}`)}
                </p>
              ) : null}
              {uploadedImage ? (
                <>
                  <div className="flex justify-center">
                    <FaviconCanvas
                      spec={{ kind: "image", bitmap: uploadedImage.bitmap, crop, background: imageBackground }}
                      size={CROP_EDITOR_SIZE}
                      className="cursor-move touch-none rounded-xl border border-[var(--border)]"
                      onPointerDown={handlePanPointerDown}
                      onPointerMove={handlePanPointerMove}
                      onPointerUp={handlePanPointerUp}
                    />
                  </div>
                  <label className="block text-sm font-semibold text-[var(--foreground)]">
                    {t("image.zoom")}
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.1}
                      value={crop.zoom}
                      onChange={(event) => setCrop((prev) => clampCrop({ ...prev, zoom: Number(event.target.value) }))}
                      className="mt-1 w-full"
                    />
                  </label>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t("image.background")}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        aria-pressed={imageBackground === "transparent"}
                        onClick={() => setImageBackground("transparent")}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${imageBackground === "transparent" ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}
                      >
                        {t("image.transparent")}
                      </button>
                      <button
                        type="button"
                        aria-pressed={imageBackground !== "transparent"}
                        onClick={() => setImageBackground({ color: backgroundColor })}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${imageBackground !== "transparent" ? "border-[var(--primary)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}
                      >
                        {t("image.solidColor")}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{t("image.detailNotice")}</p>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab !== "image" ? (
            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                {t("colors.background")}
                <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-9 w-14" />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  className="min-h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-xs"
                />
              </label>
              {activeTab === "text" || (activeTab === "shape" && shapeContentType === "text") ? (
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  {t("colors.foreground")}
                  <input type="color" value={foregroundColor} onChange={(event) => setForegroundColor(event.target.value)} className="h-9 w-14" />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={(event) => setForegroundColor(event.target.value)}
                    className="min-h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-xs"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="block text-sm font-semibold text-[var(--foreground)]">
            {t("siteName.label")}
            <input
              type="text"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder={t("siteName.placeholder")}
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            />
          </label>

          <Button variant="secondary" onClick={resetAll}>
            <RotateCcw size={17} />
            {t("actions.reset")}
          </Button>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="font-bold text-[var(--foreground)]">{t("preview.title")}</h2>
            {lowContrast ? (
              <p className="mt-2 rounded-lg bg-[var(--warning-bg)] p-2 text-xs font-semibold text-[var(--warning-fg)]">
                {t("preview.lowContrast")}
              </p>
            ) : null}
            {spec ? (
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {PREVIEW_SIZES.map((size) => (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <FaviconCanvas spec={spec} size={size} displaySize={previewDisplaySize(size)} className="rounded border border-[var(--border)]" />
                    <span className="text-xs text-[var(--text-muted)]">{size}px</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">{t("preview.empty")}</p>
            )}
          </section>

          {spec ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="font-bold text-[var(--foreground)]">{t("context.title")}</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-[var(--border)] bg-[var(--surface-muted)] p-2">
                  <FaviconCanvas spec={spec} size={32} displaySize={16} />
                  <span className="truncate text-xs text-[var(--text-muted)]">{siteName.trim() || t("context.tabPlaceholder")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
                  <FaviconCanvas spec={spec} size={180} displaySize={44} className="rounded-xl" />
                  <span className="text-xs text-[var(--text-muted)]">{t("context.iosLabel")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
                  <FaviconCanvas spec={spec} size={192} displaySize={44} className="rounded-full" />
                  <span className="text-xs text-[var(--text-muted)]">{t("context.androidLabel")}</span>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-3">
          <Button onClick={downloadZip} disabled={!spec || generating}>
            <Download size={18} />
            {generating ? t("actions.generating") : t("actions.downloadZip")}
          </Button>
          <Button variant="secondary" onClick={copyHtmlCode}>
            <Copy size={17} />
            {copied ? t("actions.copied") : t("actions.copyHtml")}
          </Button>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{t("files.title")}</h3>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--text-muted)] sm:grid-cols-4">
            {[
              "favicon.ico",
              "favicon-16x16.png",
              "favicon-32x32.png",
              "favicon-48x48.png",
              "apple-touch-icon.png",
              "android-chrome-192x192.png",
              "android-chrome-512x512.png",
              "site.webmanifest",
            ].map((name) => (
              <li key={name} className="font-mono">{name}</li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{t("html.title")}</h3>
          <pre className="mt-2 max-h-60 overflow-x-auto whitespace-pre rounded-xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-6">
            {htmlSnippet}
          </pre>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{t("manifest.title")}</h3>
          <pre className="mt-2 max-h-60 overflow-x-auto whitespace-pre rounded-xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-6">
            {manifestText}
          </pre>
        </div>
      </section>

      <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">{t("privacy")}</p>
    </div>
  );
}
