"use client";
/* eslint-disable @next/next/no-img-element -- private local Blob URLs must retain source pixels */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  Eye,
  ImagePlus,
  MousePointer2,
  Play,
  Redo2,
  RotateCcw,
  SquareDashedMousePointer,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  clientToImage,
  clampRect,
} from "@/lib/tools/privacy-redactor/geometry";
import { applyMasks } from "@/lib/tools/privacy-redactor/masking";
import type {
  MaskStyle,
  Rect,
  RedactionRegion,
} from "@/lib/tools/privacy-redactor/types";
import {
  isAnimatedWebp,
  validDimensions,
  validateFile,
  type ValidationError,
} from "@/lib/tools/privacy-redactor/validation";

type Loaded = { file: File; url: string; width: number; height: number };
type UiError = ValidationError | "multiple-files" | "canvas-failed" | "no-selected-region";
type PointerAction = {
  kind: "draw" | "move" | "resize";
  start: { x: number; y: number };
  original?: Rect;
  id?: string;
  handle?: string;
};
const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const ZOOM_LEVELS = [50, 100, 150, 200];
const HISTORY_LIMIT = 50;
function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function PrivacyRedactor() {
  const t = useTranslations("Tools.privacyRedactor"),
    fileRef = useRef<HTMLInputElement>(null),
    imageRef = useRef<HTMLImageElement>(null),
    urlRef = useRef<string | null>(null),
    resultRef = useRef<string | null>(null),
    generation = useRef(0),
    dragDepth = useRef(0),
    pointer = useRef<PointerAction | null>(null),
    draftRef = useRef<Rect | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [ready, setReady] = useState(false),
    [regions, setRegions] = useState<RedactionRegion[]>([]),
    [history, setHistory] = useState<RedactionRegion[][]>([]),
    [future, setFuture] = useState<RedactionRegion[][]>([]),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [mode, setMode] = useState<"select" | "add">("select"),
    [zoom, setZoom] = useState<number | null>(null),
    [draft, setDraft] = useState<Rect | null>(null),
    [style, setStyle] = useState<MaskStyle>({
      kind: "solid",
      color: "#000000",
      pixelSize: 16,
    }),
    [rendering, setRendering] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState<UiError | null>(null),
    [dragging, setDragging] = useState(false),
    [result, setResult] = useState<{ url: string; blob: Blob } | null>(null),
    [preview, setPreview] = useState<"editor" | "clean" | "result">("editor");
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
  function pushHistory() {
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), regions]);
    setFuture([]);
  }
  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [...current, regions]);
    setRegions(previous);
    setSelectedId((current) =>
      current && previous.some((region) => region.id === current)
        ? current
        : null,
    );
    invalidate();
  }
  function redo() {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture((current) => current.slice(0, -1));
    setHistory((current) => [...current, regions]);
    setRegions(next);
    setSelectedId((current) =>
      current && next.some((region) => region.id === current) ? current : null,
    );
    invalidate();
  }
  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
  function clear() {
    releaseResult();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setLoaded(null);
    setReady(false);
    setRegions([]);
    setHistory([]);
    setFuture([]);
    setSelectedId(null);
    setDraft(null);
    setError(null);
    setMode("select");
    setZoom(null);
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
    if (await isAnimatedWebp(file)) {
      setError("animated-image");
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
    setRegions([]);
    setHistory([]);
    setFuture([]);
    setSelectedId(null);
    setZoom(null);
    setError(null);
    setStatus("");
  }
  function accept(files: FileList | File[]) {
    if (files.length !== 1) {
      setError("multiple-files");
      return;
    }
    void loadFile(files[0]);
  }
  function updateRegion(id: string, patch: Partial<RedactionRegion>) {
    if (!loaded) return;
    invalidate();
    setRegions((current) =>
      current.map((region) =>
        region.id === id
          ? {
              ...region,
              ...patch,
              ...clampRect(
                { ...region, ...patch },
                loaded.width,
                loaded.height,
              ),
            }
          : region,
      ),
    );
  }
  function removeRegion(id: string) {
    pushHistory();
    invalidate();
    setRegions((current) => current.filter((region) => region.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function duplicateRegion(id: string) {
    if (!loaded) return;
    const region = regions.find((item) => item.id === id);
    if (!region) return;
    const offset = Math.max(10, Math.round(region.width * 0.15)),
      next: RedactionRegion = {
        ...clampRect(
          {
            x: region.x + offset,
            y: region.y + offset,
            width: region.width,
            height: region.height,
          },
          loaded.width,
          loaded.height,
        ),
        id: uid(),
        selected: true,
      };
    pushHistory();
    invalidate();
    setRegions((current) => [...current, next]);
    setSelectedId(next.id);
    setMode("select");
  }
  function addDefaultRegion() {
    if (!loaded) return;
    const width = Math.max(24, Math.round(loaded.width * 0.25)),
      height = Math.max(24, Math.round(loaded.height * 0.12)),
      region: RedactionRegion = {
        id: uid(),
        selected: true,
        x: Math.round((loaded.width - width) / 2),
        y: Math.round((loaded.height - height) / 2),
        width,
        height,
      };
    pushHistory();
    invalidate();
    setRegions((current) => [...current, region]);
    setSelectedId(region.id);
    setMode("select");
  }
  function point(event: React.PointerEvent<SVGSVGElement>) {
    if (!loaded) return null;
    return clientToImage(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      loaded.width,
      loaded.height,
    );
  }
  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!loaded) return;
    const p = point(event);
    if (!p) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (mode === "add") {
      const initial = { x: p.x, y: p.y, width: 1, height: 1 };
      pointer.current = { kind: "draw", start: p };
      draftRef.current = initial;
      setDraft(initial);
      setSelectedId(null);
    }
  }
  function regionDown(
    event: React.PointerEvent<SVGRectElement>,
    region: RedactionRegion,
  ) {
    if (mode !== "select") return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg || !loaded) return;
    svg.setPointerCapture(event.pointerId);
    const p = clientToImage(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      loaded.width,
      loaded.height,
    );
    if (!p) return;
    pushHistory();
    pointer.current = {
      kind: "move",
      start: p,
      original: {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      },
      id: region.id,
    };
    setSelectedId(region.id);
  }
  function handleDown(
    event: React.PointerEvent<SVGCircleElement>,
    region: RedactionRegion,
    handle: string,
  ) {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg || !loaded) return;
    svg.setPointerCapture(event.pointerId);
    const p = clientToImage(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      loaded.width,
      loaded.height,
    );
    if (!p) return;
    pushHistory();
    pointer.current = {
      kind: "resize",
      start: p,
      original: {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      },
      id: region.id,
      handle,
    };
    setSelectedId(region.id);
  }
  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!pointer.current || !loaded) return;
    const p = point(event);
    if (!p) return;
    const action = pointer.current,
      dx = p.x - action.start.x,
      dy = p.y - action.start.y;
    if (action.kind === "draw") {
      const next = {
        x: Math.min(action.start.x, p.x),
        y: Math.min(action.start.y, p.y),
        width: Math.max(1, Math.abs(dx)),
        height: Math.max(1, Math.abs(dy)),
      };
      draftRef.current = next;
      setDraft(next);
      return;
    }
    if (!action.original || !action.id) return;
    let next = { ...action.original };
    if (action.kind === "move")
      next = { ...next, x: next.x + dx, y: next.y + dy };
    else {
      if (action.handle?.includes("e")) next.width += dx;
      if (action.handle?.includes("s")) next.height += dy;
      if (action.handle?.includes("w")) {
        next.x += dx;
        next.width -= dx;
      }
      if (action.handle?.includes("n")) {
        next.y += dy;
        next.height -= dy;
      }
    }
    const id = action.id;
    setRegions((current) =>
      current.map((region) =>
        region.id === id
          ? { ...region, ...clampRect(next, loaded.width, loaded.height) }
          : region,
      ),
    );
    invalidate();
  }
  function pointerUp() {
    const currentDraft = draftRef.current;
    if (pointer.current?.kind === "draw" && currentDraft && loaded) {
      const rect = clampRect(currentDraft, loaded.width, loaded.height);
      if (rect.width > 2 && rect.height > 2) {
        const region: RedactionRegion = { ...rect, id: uid(), selected: true };
        pushHistory();
        setRegions((current) => [...current, region]);
        setSelectedId(region.id);
        invalidate();
      }
    }
    pointer.current = null;
    draftRef.current = null;
    setDraft(null);
  }
  function nudgeSelected(dx: number, dy: number) {
    if (!selectedId) return;
    const region = regions.find((item) => item.id === selectedId);
    if (!region) return;
    pushHistory();
    updateRegion(selectedId, { x: region.x + dx, y: region.y + dy });
  }
  async function renderResult() {
    if (!loaded || !imageRef.current) return;
    if (!regions.some((region) => region.selected)) {
      setError("no-selected-region");
      return;
    }
    setRendering(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = loaded.width;
      canvas.height = loaded.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      applyMasks(
        context,
        imageRef.current,
        regions,
        style,
        loaded.width,
        loaded.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error())),
          "image/png",
        ),
      );
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult({ url, blob });
      setPreview("result");
      setStatus(t("result.review"));
    } catch {
      setError("canvas-failed");
    } finally {
      setRendering(false);
    }
  }
  function download() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.url;
    link.download = "privacy-redacted.png";
    document.body.append(link);
    link.click();
    link.remove();
  }
  const selected = regions.find((region) => region.id === selectedId),
    selectedCount = regions.filter((region) => region.selected).length,
    editorWidth = loaded && zoom ? Math.round((loaded.width * zoom) / 100) : undefined;
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
          id="privacy-file"
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
            htmlFor="privacy-file"
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
            {status ? (
              <p
                role="status"
                className="mt-3 text-sm font-semibold text-[var(--info-fg)]"
              >
                {status}
              </p>
            ) : null}
          </section>
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.55fr)]">
            <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={mode === "select" ? "primary" : "secondary"}
                  onClick={() => {
                    setMode("select");
                    setPreview("editor");
                  }}
                >
                  <MousePointer2 size={17} />
                  {t("actions.select")}
                </Button>
                <Button
                  variant={mode === "add" ? "primary" : "secondary"}
                  onClick={() => {
                    setMode("add");
                    setPreview("editor");
                  }}
                >
                  <SquareDashedMousePointer size={17} />
                  {t("actions.addRegion")}
                </Button>
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
                <span className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden="true" />
                <Button
                  variant="secondary"
                  onClick={undo}
                  disabled={!history.length}
                  aria-label={t("actions.undo")}
                >
                  <Undo2 size={17} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={redo}
                  disabled={!future.length}
                  aria-label={t("actions.redo")}
                >
                  <Redo2 size={17} />
                </Button>
                {preview === "editor" ? (
                  <>
                    <span className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden="true" />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const index = zoom ? ZOOM_LEVELS.indexOf(zoom) : 1;
                        setZoom(ZOOM_LEVELS[Math.max(0, index - 1)]);
                      }}
                      disabled={zoom === ZOOM_LEVELS[0]}
                      aria-label={t("actions.zoomOut")}
                    >
                      <ZoomOut size={17} />
                    </Button>
                    <Button
                      variant={zoom === null ? "primary" : "secondary"}
                      onClick={() => setZoom(null)}
                    >
                      {zoom === null ? t("actions.zoomFit") : `${zoom}%`}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const index = zoom ? ZOOM_LEVELS.indexOf(zoom) : 1;
                        setZoom(
                          ZOOM_LEVELS[
                            Math.min(ZOOM_LEVELS.length - 1, index + 1)
                          ],
                        );
                      }}
                      disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                      aria-label={t("actions.zoomIn")}
                    >
                      <ZoomIn size={17} />
                    </Button>
                  </>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {mode === "add" ? t("editor.addHelp") : t("editor.selectHelp")}
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
                    onLoad={() => setReady(true)}
                    draggable={false}
                    className="mx-auto block max-w-full select-none"
                  />
                ) : (
                  <div
                    className={
                      editorWidth
                        ? "relative mx-auto"
                        : "relative mx-auto w-fit max-w-full"
                    }
                    style={editorWidth ? { width: editorWidth } : undefined}
                  >
                    <img
                      ref={imageRef}
                      src={loaded.url}
                      alt={t("preview.originalAlt")}
                      onLoad={() => setReady(true)}
                      draggable={false}
                      className={
                        editorWidth
                          ? "block w-full select-none"
                          : "block max-w-full select-none"
                      }
                    />
                    <svg
                      viewBox={`0 0 ${loaded.width} ${loaded.height}`}
                      aria-label={t("editor.canvasLabel")}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (
                          (event.key === "Delete" ||
                            event.key === "Backspace") &&
                          selectedId
                        ) {
                          event.preventDefault();
                          removeRegion(selectedId);
                          return;
                        }
                        if (!selectedId) return;
                        const step = event.shiftKey ? 10 : 1;
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          nudgeSelected(-step, 0);
                        } else if (event.key === "ArrowRight") {
                          event.preventDefault();
                          nudgeSelected(step, 0);
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          nudgeSelected(0, -step);
                        } else if (event.key === "ArrowDown") {
                          event.preventDefault();
                          nudgeSelected(0, step);
                        }
                      }}
                      onPointerDown={pointerDown}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={pointerUp}
                      className={`absolute inset-0 size-full touch-none ${mode === "add" ? "cursor-crosshair" : ""}`}
                    >
                      {regions.map((region) => (
                        <g key={region.id} opacity={region.selected ? 1 : 0.45}>
                          <rect
                            x={region.x}
                            y={region.y}
                            width={region.width}
                            height={region.height}
                            fill={
                              region.selected
                                ? "rgba(220,38,38,.22)"
                                : "rgba(100,116,139,.15)"
                            }
                            stroke={
                              selectedId === region.id ? "#2563eb" : "#dc2626"
                            }
                            strokeWidth={Math.max(2, loaded.width / 500)}
                            onPointerDown={(event) => regionDown(event, region)}
                          />
                          {selectedId === region.id &&
                            handles.map((handle) => {
                              const p = handlePoint(region, handle);
                              return (
                                <circle
                                  key={handle}
                                  cx={p.x}
                                  cy={p.y}
                                  r={Math.max(7, loaded.width / 180)}
                                  fill="#fff"
                                  stroke="#2563eb"
                                  strokeWidth={Math.max(2, loaded.width / 700)}
                                  onPointerDown={(event) =>
                                    handleDown(event, region, handle)
                                  }
                                />
                              );
                            })}
                        </g>
                      ))}
                      {draft ? (
                        <>
                          <rect
                            {...draft}
                            fill="rgba(37,99,235,.18)"
                            stroke="#2563eb"
                            strokeDasharray="12 8"
                            strokeWidth={Math.max(2, loaded.width / 500)}
                          />
                          <text
                            x={draft.x + 4}
                            y={
                              draft.y > loaded.height * 0.06
                                ? draft.y - Math.max(6, loaded.width / 250)
                                : draft.y + draft.height + Math.max(18, loaded.width / 60)
                            }
                            fill="#2563eb"
                            fontWeight="bold"
                            fontSize={Math.max(13, loaded.width / 60)}
                          >
                            {t("editor.sizeLabel", {
                              width: Math.round(draft.width),
                              height: Math.round(draft.height),
                            })}
                          </text>
                        </>
                      ) : null}
                    </svg>
                  </div>
                )}
              </div>
            </section>
            <aside className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold">
                    {t("regions.title", { count: regions.length })}
                  </h2>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-bold">
                    {t("regions.selected", { count: selectedCount })}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      invalidate();
                      setRegions((current) =>
                        current.map((region) => ({ ...region, selected: true })),
                      );
                    }}
                  >
                    {t("actions.selectAll")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      invalidate();
                      setRegions((current) =>
                        current.map((region) => ({
                          ...region,
                          selected: false,
                        })),
                      );
                    }}
                  >
                    {t("actions.clearAll")}
                  </Button>
                  <Button variant="secondary" onClick={addDefaultRegion}>
                    {t("actions.addByCoordinates")}
                  </Button>
                </div>
                {regions.length ? (
                  <div className="mt-4 space-y-2">
                    {regions.map((region, index) => (
                      <div
                        key={region.id}
                        className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-left text-sm ${selectedId === region.id ? "bg-[var(--info-bg)]" : "bg-[var(--surface-muted)]"}`}
                      >
                        <input
                          aria-label={t("regions.redact")}
                          type="checkbox"
                          checked={region.selected}
                          onChange={(event) => {
                            updateRegion(region.id, {
                              selected: event.target.checked,
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedId(region.id)}
                          className="min-w-0 flex-1 truncate py-2 text-left"
                        >
                          {t("regions.item", { index: index + 1 })}
                        </button>
                        <span className="text-xs text-[var(--text-muted)]">
                          {Math.round(region.width)}×{Math.round(region.height)}
                        </span>
                        <button
                          type="button"
                          aria-label={t("actions.duplicate")}
                          className="min-h-11 min-w-11 p-2 text-[var(--text-muted)]"
                          onClick={() => duplicateRegion(region.id)}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={t("actions.delete")}
                          className="min-h-11 min-w-11 p-2 text-[var(--error-fg)]"
                          onClick={() => removeRegion(region.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    {t("regions.empty")}
                  </p>
                )}
              </section>
              {selected ? (
                <RegionEditor
                  region={selected}
                  loaded={loaded}
                  update={updateRegion}
                  remove={removeRegion}
                  duplicate={duplicateRegion}
                  t={t}
                />
              ) : null}
            </aside>
          </div>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">{t("mask.title")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="font-semibold">
                {t("mask.method")}
                <select
                  value={style.kind}
                  onChange={(event) => {
                    invalidate();
                    setStyle((current) => ({
                      ...current,
                      kind: event.target.value as MaskStyle["kind"],
                    }));
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                >
                  <option value="solid">{t("mask.solid")}</option>
                  <option value="pixelate">{t("mask.pixelate")}</option>
                </select>
              </label>
              {style.kind === "solid" ? (
                <label className="font-semibold">
                  {t("mask.color")}
                  <select
                    value={style.color}
                    onChange={(event) => {
                      invalidate();
                      setStyle((current) => ({
                        ...current,
                        color: event.target.value as MaskStyle["color"],
                      }));
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                  >
                    <option value="#000000">{t("mask.black")}</option>
                    <option value="#ffffff">{t("mask.white")}</option>
                  </select>
                </label>
              ) : (
                <label className="font-semibold">
                  {t("mask.pixelSize")}
                  <select
                    value={style.pixelSize}
                    onChange={(event) => {
                      invalidate();
                      setStyle((current) => ({
                        ...current,
                        pixelSize: Number(event.target.value) as 8 | 16 | 24,
                      }));
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                  >
                    {[8, 16, 24].map((size) => (
                      <option key={size} value={size}>
                        {size}px
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <p className="mt-4 rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">
              {t("mask.warning")}
            </p>
            <Button
              className="mt-4 w-full sm:w-auto"
              onClick={renderResult}
              disabled={rendering || !ready}
            >
              <Play size={18} />
              {t("actions.preview")}
            </Button>
          </section>
          {result ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold">{t("result.title")}</h2>
              <p className="mt-3 rounded-xl bg-[var(--warning-bg)] p-4 text-sm font-semibold text-[var(--warning-fg)]">
                {t("result.review")}
              </p>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {t("result.metadata")}
              </p>
              <Button className="mt-4 w-full sm:w-auto" onClick={download}>
                <Download size={18} />
                {t("actions.download")}
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
function handlePoint(region: Rect, handle: string) {
  return {
    x: handle.includes("w")
      ? region.x
      : handle.includes("e")
        ? region.x + region.width
        : region.x + region.width / 2,
    y: handle.includes("n")
      ? region.y
      : handle.includes("s")
        ? region.y + region.height
        : region.y + region.height / 2,
  };
}
function RegionEditor({
  region,
  loaded,
  update,
  remove,
  duplicate,
  t,
}: {
  region: RedactionRegion;
  loaded: Loaded;
  update: (id: string, patch: Partial<RedactionRegion>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <h2 className="font-bold">{t("editor.coordinates")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <label key={key} className="text-sm font-semibold">
            {t(`editor.${key}`)}
            <input
              type="number"
              min={key === "width" || key === "height" ? 1 : 0}
              max={
                key === "x" || key === "width" ? loaded.width : loaded.height
              }
              value={region[key]}
              onChange={(event) =>
                update(region.id, { [key]: Number(event.target.value) })
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => duplicate(region.id)}
        >
          <Copy size={17} />
          {t("actions.duplicate")}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => remove(region.id)}
        >
          <Trash2 size={17} />
          {t("actions.delete")}
        </Button>
      </div>
    </section>
  );
}
