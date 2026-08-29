"use client";
/* eslint-disable @next/next/no-img-element -- private local Blob URLs must retain source pixels */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  ImagePlus,
  Play,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { detectStatusBar } from "@/lib/tools/screenshot-statusbar-remover/detection";
import {
  clampCropHeight,
  clientYToImageY,
  maxCropHeightFor,
} from "@/lib/tools/screenshot-statusbar-remover/geometry";
import type { Confidence } from "@/lib/tools/screenshot-statusbar-remover/types";
import {
  canAutoDetect,
  isLandscape,
  isTooSmallToDetect,
  validDimensions,
  validateFile,
  type ValidationError,
} from "@/lib/tools/screenshot-statusbar-remover/validation";

type Loaded = { file: File; url: string; width: number; height: number };
type UiError =
  | ValidationError
  | "multiple-files"
  | "canvas-failed"
  | "crop-exceeds-image";
const ANALYSIS_WIDTH = 360;
const ANALYSIS_TOP_FRACTION = 0.1;

function outputMime(file: File) {
  return file.type === "image/jpeg" || file.type === "image/webp"
    ? file.type
    : "image/png";
}
function outputExtension(mime: string) {
  return mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
}
function baseName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function ScreenshotStatusbarRemover() {
  const t = useTranslations("Tools.screenshotStatusbarRemover"),
    fileRef = useRef<HTMLInputElement>(null),
    imageRef = useRef<HTMLImageElement>(null),
    urlRef = useRef<string | null>(null),
    resultRef = useRef<string | null>(null),
    generation = useRef(0),
    dragDepth = useRef(0),
    pointerActive = useRef(false),
    detectedForRef = useRef<Loaded | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [ready, setReady] = useState(false),
    [cropHeight, setCropHeight] = useState(0),
    [detectedCropHeight, setDetectedCropHeight] = useState(0),
    [confidence, setConfidence] = useState<Confidence | null>(null),
    [landscape, setLandscape] = useState(false),
    [tooSmall, setTooSmall] = useState(false),
    [preview, setPreview] = useState<"editor" | "clean" | "result">("editor"),
    [rendering, setRendering] = useState(false),
    [error, setError] = useState<UiError | null>(null),
    [dragging, setDragging] = useState(false),
    [result, setResult] = useState<{ url: string; blob: Blob } | null>(null),
    [displayScale, setDisplayScale] = useState(1);
  useEffect(() => {
    if (!loaded || preview !== "editor" || !imageRef.current) return;
    const el = imageRef.current;
    const measure = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setDisplayScale(width / loaded.width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, preview]);
  const releaseResult = useCallback(() => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResult(null);
    setPreview("editor");
  }, []);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    },
    [],
  );
  function invalidate() {
    releaseResult();
    setError(null);
  }
  function clear() {
    releaseResult();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    detectedForRef.current = null;
    setLoaded(null);
    setReady(false);
    setCropHeight(0);
    setDetectedCropHeight(0);
    setConfidence(null);
    setLandscape(false);
    setTooSmall(false);
    setError(null);
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.focus();
    }
  }
  async function loadFile(file: File) {
    releaseResult();
    const basic = validateFile(file);
    if (basic) {
      setError(basic);
      return;
    }
    const id = ++generation.current,
      url = URL.createObjectURL(file),
      image = new Image();
    image.decoding = "async";
    image.src = url;
    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(url);
      setError("decode-failed");
      return;
    }
    if (id !== generation.current) {
      URL.revokeObjectURL(url);
      return;
    }
    if (!validDimensions(image.naturalWidth, image.naturalHeight)) {
      URL.revokeObjectURL(url);
      setError("dimension-limit");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setLoaded({
      file,
      url,
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    setReady(false);
    setCropHeight(0);
    setDetectedCropHeight(0);
    setConfidence(null);
    setLandscape(isLandscape(image.naturalWidth, image.naturalHeight));
    setTooSmall(isTooSmallToDetect(image.naturalWidth, image.naturalHeight));
    setError(null);
  }
  function accept(files: FileList | File[]) {
    if (files.length !== 1) {
      setError("multiple-files");
      return;
    }
    void loadFile(files[0]);
  }
  function runDetection() {
    if (!loaded || !imageRef.current) return;
    if (!canAutoDetect(loaded.width, loaded.height)) return;
    const canvasWidth = ANALYSIS_WIDTH,
      canvasHeight = Math.max(
        1,
        Math.round((ANALYSIS_WIDTH * loaded.height) / loaded.width),
      ),
      topHeight = Math.min(
        canvasHeight,
        Math.ceil(canvasHeight * ANALYSIS_TOP_FRACTION) + 4,
      ),
      canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = topHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(
      imageRef.current,
      0,
      0,
      loaded.width,
      loaded.height,
      0,
      0,
      canvasWidth,
      canvasHeight,
    );
    const imageData = context.getImageData(0, 0, canvasWidth, topHeight),
      result = detectStatusBar(imageData, canvasHeight);
    if (result.detected) {
      const height = clampCropHeight(
        Math.round(result.cropRatio * loaded.height),
        loaded.height,
        maxCropHeightFor(loaded.height),
      );
      setCropHeight(height);
      setDetectedCropHeight(height);
      setConfidence(result.confidence);
    } else {
      setCropHeight(0);
      setDetectedCropHeight(0);
      setConfidence("low");
    }
  }
  function handleImageLoad() {
    setReady(true);
    // The editor <img> can remount when switching preview modes (e.g. back
    // from "result" to "editor"), re-firing onLoad for the same file. Only
    // run detection once per loaded image, or it silently overwrites any
    // manual adjustment the user already made.
    if (loaded && detectedForRef.current !== loaded) {
      detectedForRef.current = loaded;
      runDetection();
    }
  }
  function adjustCropHeight(next: number) {
    if (!loaded) return;
    invalidate();
    setCropHeight(clampCropHeight(next, loaded.height, maxCropHeightFor(loaded.height)));
  }
  function resetCropHeight() {
    adjustCropHeight(detectedCropHeight);
  }
  function pointerDown(event: React.PointerEvent<SVGRectElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerActive.current = true;
  }
  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!pointerActive.current || !loaded) return;
    const y = clientYToImageY(
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      loaded.height,
    );
    if (y === null) return;
    adjustCropHeight(y);
  }
  function pointerUp() {
    pointerActive.current = false;
  }
  async function renderResult() {
    if (!loaded || !imageRef.current) return;
    if (cropHeight >= loaded.height) {
      setError("crop-exceeds-image");
      return;
    }
    setRendering(true);
    try {
      const resultHeight = loaded.height - cropHeight,
        canvas = document.createElement("canvas");
      canvas.width = loaded.width;
      canvas.height = resultHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(
        imageRef.current,
        0,
        cropHeight,
        loaded.width,
        resultHeight,
        0,
        0,
        loaded.width,
        resultHeight,
      );
      const mime = outputMime(loaded.file);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error())),
          mime,
          0.92,
        ),
      );
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult({ url, blob });
      setPreview("result");
    } catch {
      setError("canvas-failed");
    } finally {
      setRendering(false);
    }
  }
  function download() {
    if (!result || !loaded) return;
    const mime = outputMime(loaded.file),
      link = document.createElement("a");
    link.href = result.url;
    link.download = `${baseName(loaded.file.name)}-no-statusbar.${outputExtension(mime)}`;
    document.body.append(link);
    link.click();
    link.remove();
  }
  const maxCrop = loaded ? maxCropHeightFor(loaded.height) : 0,
    showNotDetected = Boolean(
      loaded && !landscape && !tooSmall && confidence === "low",
    ),
    // Keep the drag hit-band a real ~44 CSS px touch target regardless of
    // how much the image is scaled down to fit the viewport — a fixed
    // image-pixel size (as used for the line/handle visuals) shrinks well
    // below a usable touch target on typical mobile display scales.
    hitBandHeight = loaded
      ? Math.min(
          Math.max(44 / displayScale, 12),
          Math.max(12, loaded.height * 0.25),
        )
      : 12;
  return (
    <section className="space-y-6">
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
          accept(event.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center sm:p-8 ${dragging ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
      >
        <ImagePlus
          aria-hidden="true"
          className="mx-auto text-[var(--primary)]"
          size={36}
        />
        <h2 className="mt-3 text-xl font-bold">{t("upload.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {dragging ? t("upload.drop") : t("upload.help")}
        </p>
        <input
          ref={fileRef}
          id="statusbar-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) accept(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <label
            htmlFor="statusbar-file"
            className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-[var(--primary-fill)] px-4 py-2.5 font-semibold text-white focus-within:ring-4 focus-within:ring-[var(--focus-ring)]"
          >
            {loaded ? t("actions.change") : t("actions.choose")}
          </label>
          {loaded ? (
            <Button variant="secondary" onClick={clear}>
              <RotateCcw size={17} />
              {t("actions.clear")}
            </Button>
          ) : null}
        </div>
      </section>
      <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">
        {t("privacy")}
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 font-semibold text-[var(--error-fg)]"
        >
          {t(`errors.${error}`)}
        </p>
      ) : null}
      {loaded ? (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
            <h2 className="font-bold">{loaded.file.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {loaded.width} × {loaded.height}px ·{" "}
              {(loaded.file.size / 1024 / 1024).toFixed(2)} MiB
            </p>
          </section>
          {landscape ? (
            <p className="rounded-xl bg-[var(--warning-bg)] p-4 text-sm font-semibold text-[var(--warning-fg)]">
              {t("notices.landscape")}
            </p>
          ) : tooSmall ? (
            <p className="rounded-xl bg-[var(--warning-bg)] p-4 text-sm font-semibold text-[var(--warning-fg)]">
              {t("notices.tooSmall")}
            </p>
          ) : showNotDetected ? (
            <p className="rounded-xl bg-[var(--warning-bg)] p-4 text-sm font-semibold text-[var(--warning-fg)]">
              {t("notices.notDetected")}
            </p>
          ) : confidence ? (
            <div
              role="status"
              className={`rounded-xl p-4 text-sm font-semibold ${confidence === "high" ? "bg-[var(--info-bg)] text-[var(--info-fg)]" : "bg-[var(--warning-bg)] text-[var(--warning-fg)]"}`}
            >
              {t("notices.confidence", {
                level: t(`confidence.${confidence}`),
                height: cropHeight,
              })}
              {confidence !== "high" ? (
                <span className="mt-1 block font-normal">
                  {t("notices.reviewSuggested")}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.55fr)]">
            <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={preview === "clean" ? "primary" : "secondary"}
                  onClick={() =>
                    setPreview(preview === "clean" ? "editor" : "clean")
                  }
                >
                  <Eye size={17} />
                  {preview === "clean" ? t("actions.editor") : t("actions.original")}
                </Button>
                {result ? (
                  <Button variant="secondary" onClick={() => setPreview("result")}>
                    <Eye size={17} />
                    {t("actions.result")}
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={resetCropHeight}>
                  <RotateCcw size={17} />
                  {t("actions.reset")}
                </Button>
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {t("editor.help")}
              </p>
              <div className="mt-4 max-h-[75vh] overflow-auto rounded-xl bg-[var(--surface-muted)] p-2">
                {preview === "result" && result ? (
                  <img
                    src={result.url}
                    alt={t("preview.resultAlt")}
                    className="mx-auto block max-w-full"
                  />
                ) : preview === "clean" ? (
                  <img
                    ref={imageRef}
                    src={loaded.url}
                    alt={t("preview.cleanAlt")}
                    onLoad={handleImageLoad}
                    draggable={false}
                    className="mx-auto block max-w-full select-none"
                  />
                ) : (
                  <div className="relative mx-auto w-fit max-w-full">
                    <img
                      ref={imageRef}
                      src={loaded.url}
                      alt={t("preview.originalAlt")}
                      onLoad={handleImageLoad}
                      draggable={false}
                      className="block max-w-full select-none"
                    />
                    <svg
                      viewBox={`0 0 ${loaded.width} ${loaded.height}`}
                      aria-label={t("editor.canvasLabel")}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        const step = event.shiftKey ? 10 : 1;
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          adjustCropHeight(cropHeight - step);
                        } else if (event.key === "ArrowDown") {
                          event.preventDefault();
                          adjustCropHeight(cropHeight + step);
                        }
                      }}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={pointerUp}
                      className="absolute inset-0 size-full touch-none"
                    >
                      <rect
                        x={0}
                        y={0}
                        width={loaded.width}
                        height={cropHeight}
                        fill="rgba(220,38,38,.22)"
                      />
                      <rect
                        x={0}
                        y={Math.max(0, cropHeight - hitBandHeight / 2)}
                        width={loaded.width}
                        height={hitBandHeight}
                        fill="transparent"
                        pointerEvents="all"
                        className="cursor-row-resize"
                        onPointerDown={pointerDown}
                      />
                      <line
                        x1={0}
                        y1={cropHeight}
                        x2={loaded.width}
                        y2={cropHeight}
                        stroke="#2563eb"
                        strokeWidth={Math.max(2, loaded.width / 400)}
                        pointerEvents="none"
                      />
                      <circle
                        cx={loaded.width / 2}
                        cy={cropHeight}
                        r={Math.max(9, loaded.width / 150)}
                        fill="#2563eb"
                        stroke="#fff"
                        strokeWidth={Math.max(2, loaded.width / 700)}
                        pointerEvents="none"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </section>
            <aside className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <h2 className="font-bold">{t("editor.heightTitle")}</h2>
                <label className="mt-3 block text-sm font-semibold">
                  {t("editor.heightPx")}
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      aria-label={t("actions.minus1")}
                      onClick={() => adjustCropHeight(cropHeight - 1)}
                    >
                      −1
                    </Button>
                    <input
                      type="number"
                      min={0}
                      max={maxCrop}
                      value={cropHeight}
                      onChange={(event) =>
                        adjustCropHeight(Number(event.target.value))
                      }
                      className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-center"
                    />
                    <Button
                      variant="secondary"
                      aria-label={t("actions.plus1")}
                      onClick={() => adjustCropHeight(cropHeight + 1)}
                    >
                      +1
                    </Button>
                  </div>
                </label>
                <input
                  type="range"
                  min={0}
                  max={maxCrop}
                  value={cropHeight}
                  aria-label={t("editor.slider")}
                  onChange={(event) => adjustCropHeight(Number(event.target.value))}
                  className="mt-4 w-full"
                />
              </section>
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <Button
                  className="w-full"
                  onClick={renderResult}
                  disabled={rendering || !ready}
                >
                  <Play size={18} />
                  {t("actions.preview")}
                </Button>
              </section>
              {result ? (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <h2 className="font-bold">{t("result.title")}</h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {t("result.review")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {t("result.metadata")}
                  </p>
                  <Button className="mt-4 w-full" onClick={download}>
                    <Download size={18} />
                    {t("actions.download")}
                  </Button>
                </section>
              ) : null}
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}
