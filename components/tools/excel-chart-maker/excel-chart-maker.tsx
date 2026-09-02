"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, RotateCcw, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { buildChartDataset, recommendChart } from "@/lib/tools/excel-chart-maker/chart-data";
import { FILE_LIMIT_BYTES, MAX_SERIES, OUTPUT_PRESETS, PREVIEW_ROWS, type Aggregation, type BackgroundName, type ChartConfig, type ChartType, type NumberFormat, type RawCell, type SortMode, type ThemeName, type WorkbookPayload } from "@/lib/tools/excel-chart-maker/model";
import { isNumericKind, normalizeRows } from "@/lib/tools/excel-chart-maker/normalize";
import type { VisualConfig } from "@/lib/tools/excel-chart-maker/echarts-renderer";

type FileError = "file-large" | "unsupported" | "signature" | "parse" | "empty" | "limits" | "encoding";
type ExportFormat = "png" | "jpeg" | "svg";
const chartTypes: ChartType[] = ["bar", "horizontal-bar", "line", "pie", "donut", "area", "scatter"];
const themes: ThemeName[] = ["default", "simple", "dark", "presentation"];
const sampleRows: RawCell[][] = [
  ["월", "매출", "주문 수"].map(value => ({ value })),
  ...[["1월", 1200000, 40], ["2월", 1800000, 55], ["3월", 1500000, 48], ["4월", 2200000, 64], ["5월", 2450000, 72]].map(row => row.map(value => ({ value }))),
];

function defaultConfig(): ChartConfig { return { chartType: "bar", xColumnId: "column-0", yColumnIds: ["column-1"], aggregation: "none", sort: "source", topN: null }; }

export function ExcelChartMaker() {
  const t = useTranslations("Tools.excelChartMaker");
  const scatterT = useTranslations("Tools.excelChartScatterGuide");
  const inputRef = useRef<HTMLInputElement>(null), workerRef = useRef<Worker | null>(null), operationRef = useRef(0), chartHostRef = useRef<HTMLDivElement>(null), chartRef = useRef<{ dispose(): void; resize(): void } | null>(null);
  const [file, setFile] = useState<File | null>(null), [payload, setPayload] = useState<WorkbookPayload | null>(null), [headerRow, setHeaderRow] = useState<number | null>(0), [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false), [error, setError] = useState<FileError | null>(null), [status, setStatus] = useState("");
  const [config, setConfig] = useState<ChartConfig>(defaultConfig), [title, setTitle] = useState(""), [subtitle, setSubtitle] = useState(""), [legend, setLegend] = useState(true), [legendPosition, setLegendPosition] = useState<"top" | "bottom">("top"), [labels, setLabels] = useState(false), [showX, setShowX] = useState(true), [showY, setShowY] = useState(true), [grid, setGrid] = useState(true), [theme, setTheme] = useState<ThemeName>("default"), [background, setBackground] = useState<BackgroundName>("white"), [numberFormat, setNumberFormat] = useState<NumberFormat>("grouped"), [colors, setColors] = useState(["#2563eb", "#f97316", "#16a34a", "#9333ea", "#e11d48"]), [width, setWidth] = useState(1200), [height, setHeight] = useState(630), [scale, setScale] = useState(1), [format, setFormat] = useState<ExportFormat>("png"), [quality, setQuality] = useState(0.9), [exporting, setExporting] = useState(false);

  const table = useMemo(() => payload ? normalizeRows(payload.rawRows, payload.source, payload.selectedSheet, headerRow, payload.encoding, payload.date1904) : null, [payload, headerRow]);
  const numericColumns = useMemo(() => table?.columns.filter(column => isNumericKind(column.inferredKind)) ?? [], [table]);
  const selectableXColumns = config.chartType === "scatter" ? numericColumns : table?.columns ?? [];
  const dataset = useMemo(() => table ? buildChartDataset(table, config) : null, [table, config]);
  const recommendation = useMemo(() => table ? recommendChart(table, config.xColumnId, config.yColumnIds) : null, [table, config.xColumnId, config.yColumnIds]);
  const visual = useMemo<VisualConfig>(() => ({ chartType: config.chartType, title, subtitle, legend, legendPosition, labels, xAxis: showX, yAxis: showY, grid, theme, background, numberFormat, colors }), [config.chartType, title, subtitle, legend, legendPosition, labels, showX, showY, grid, theme, background, numberFormat, colors]);
  const outputValid = width >= 200 && height >= 200 && width <= 4000 && height <= 4000 && width * scale <= 8000 && height * scale <= 8000 && width * height * scale * scale <= 32_000_000;

  const resetChart = useCallback((tablePayload?: WorkbookPayload | null) => {
    const nextTable = tablePayload ? normalizeRows(tablePayload.rawRows, tablePayload.source, tablePayload.selectedSheet, tablePayload.headerGuess, tablePayload.encoding, tablePayload.date1904) : null;
    const x = nextTable?.columns.find(column => !isNumericKind(column.inferredKind)) ?? nextTable?.columns[0];
    const ys = nextTable?.columns.filter(column => isNumericKind(column.inferredKind)).slice(0, 1) ?? [];
    const next = { ...defaultConfig(), xColumnId: x?.id ?? "column-0", yColumnIds: ys.map(column => column.id) };
    if (nextTable && x && ys.length) next.chartType = recommendChart(nextTable, next.xColumnId, next.yColumnIds).type;
    setConfig(next); setTitle(ys.length && x ? `${x.label} · ${ys[0].label}` : ""); setSubtitle(""); setLegend(true); setLegendPosition("top"); setLabels(false); setShowX(true); setShowY(true); setGrid(true); setTheme("default"); setBackground("white"); setNumberFormat("grouped"); setColors(["#2563eb", "#f97316", "#16a34a", "#9333ea", "#e11d48"]); setWidth(1200); setHeight(630); setScale(1); setFormat("png"); setQuality(0.9);
  }, []);

  useEffect(() => () => { workerRef.current?.terminate(); chartRef.current?.dispose(); }, []);
  useEffect(() => {
    chartRef.current?.dispose(); chartRef.current = null;
    if (!chartHostRef.current || !dataset || dataset.error || !dataset.points.length) return;
    let active = true; let observer: ResizeObserver | null = null;
    import("@/lib/tools/excel-chart-maker/echarts-renderer").then(module => {
      if (!active || !chartHostRef.current) return;
      chartRef.current = module.mountChart(chartHostRef.current, dataset, visual);
      observer = new ResizeObserver(() => chartRef.current?.resize()); observer.observe(chartHostRef.current);
    }).catch(() => { if (active) setStatus(t("errors.render")); });
    return () => { active = false; observer?.disconnect(); chartRef.current?.dispose(); chartRef.current = null; };
  }, [dataset, visual, t]);

  function runWorker(selectedFile: File, sheet?: string) {
    const id = ++operationRef.current; workerRef.current?.terminate(); setBusy(true); setError(null); setStatus(t("status.reading"));
    selectedFile.arrayBuffer().then(buffer => {
      if (id !== operationRef.current) return;
      const worker = new Worker(new URL("../../../lib/tools/excel-chart-maker/excel-chart-worker.ts", import.meta.url), { type: "module" }); workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; payload?: WorkbookPayload; code?: FileError }>) => {
        if (event.data.id !== id) return; setBusy(false); worker.terminate(); workerRef.current = null;
        if (!event.data.ok || !event.data.payload) { setPayload(null); setError(event.data.code ?? "parse"); setStatus(""); return; }
        const result = event.data.payload; setPayload(result); setHeaderRow(result.headerGuess); resetChart(result); setStatus(t("status.ready"));
      };
      worker.onerror = () => { if (id === operationRef.current) { setBusy(false); setPayload(null); setError("parse"); setStatus(""); } worker.terminate(); };
      worker.postMessage({ id, buffer, fileName: selectedFile.name, fileSize: selectedFile.size, sheet }, [buffer]);
    }).catch(() => { setBusy(false); setError("parse"); setStatus(""); });
  }

  function accept(files: FileList | File[]) {
    const selected = files[0]; if (!selected) return;
    if (selected.size > FILE_LIMIT_BYTES) { setError("file-large"); return; }
    setFile(selected); runWorker(selected);
  }

  function loadSample() {
    operationRef.current++; workerRef.current?.terminate(); workerRef.current = null; setFile(null); setError(null);
    const result: WorkbookPayload = { fileName: t("sample.name"), fileSize: 0, source: "sample", sheets: [t("sample.sheet")], selectedSheet: t("sample.sheet"), rawRows: sampleRows, headerGuess: 0, encoding: "UTF-8" };
    setPayload(result); setHeaderRow(0); resetChart(result); setStatus(t("status.ready"));
  }

  function clearAll() { operationRef.current++; workerRef.current?.terminate(); workerRef.current = null; chartRef.current?.dispose(); setFile(null); setPayload(null); setHeaderRow(0); setError(null); setStatus(""); resetChart(null); if (inputRef.current) inputRef.current.value = ""; }
  function chooseSheet(sheet: string) { if (file) runWorker(file, sheet); }
  function toggleSeries(id: string) { setConfig(current => ({ ...current, yColumnIds: current.yColumnIds.includes(id) ? current.yColumnIds.filter(item => item !== id) : current.yColumnIds.length < MAX_SERIES ? [...current.yColumnIds, id] : current.yColumnIds })); }
  function selectChartType(type: ChartType) {
    setConfig(current => {
      if (type === "scatter") {
        const currentXIsNumeric = numericColumns.some(column => column.id === current.xColumnId);
        const xColumnId = currentXIsNumeric ? current.xColumnId : numericColumns[0]?.id ?? "";
        const currentY = current.yColumnIds.find(id => id !== xColumnId && numericColumns.some(column => column.id === id));
        const yColumnId = currentY ?? numericColumns.find(column => column.id !== xColumnId)?.id ?? "";
        return { ...current, chartType: type, xColumnId, yColumnIds: yColumnId ? [yColumnId] : [] };
      }
      return { ...current, chartType: type, yColumnIds: type === "pie" || type === "donut" ? current.yColumnIds.slice(0, 1) : current.yColumnIds };
    });
    if (type === "pie" || type === "donut") setLabels(true);
  }
  function useRecommendation() { if (recommendation) selectChartType(recommendation.type); }

  async function download() {
    if (!dataset || dataset.error || !outputValid) return; setExporting(true); setStatus(t("status.exporting"));
    try { const { exportChart } = await import("@/lib/tools/excel-chart-maker/echarts-renderer"); const blob = await exportChart(dataset, visual, format, width, height, scale, quality); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `chart.${format === "jpeg" ? "jpg" : format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); setStatus(t("status.exported", { width: width * scale, height: height * scale })); }
    catch { setStatus(t("errors.export")); }
    finally { setExporting(false); }
  }

  const errorText = error ? t(`errors.${error}`) : dataset?.error ? t(`chartErrors.${dataset.error}`) : "";
  return <div className="space-y-6" data-chart-labels={labels ? "on" : "off"}>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">{t("upload.title")}</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{t("upload.help")}</p></div><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => inputRef.current?.click()}><Upload aria-hidden size={18}/>{t("actions.choose")}</Button><Button data-testid="load-chart-sample" type="button" variant="secondary" onClick={loadSample}><BarChart3 aria-hidden size={18}/>{t("actions.sample")}</Button>{payload ? <Button type="button" variant="secondary" onClick={clearAll}><Trash2 aria-hidden size={18}/>{t("actions.clear")}</Button> : null}</div></div>
      <input ref={inputRef} id="chart-file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => accept(event.target.files ?? [])}/>
      <label htmlFor="chart-file" onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }} className={`mt-5 grid min-h-28 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface-muted)]"}`}><span><FileSpreadsheet className="mx-auto text-[var(--primary)]" aria-hidden/><span className="mt-2 block font-semibold">{busy ? t("status.reading") : t("upload.drop")}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{t("upload.limit")}</span></span></label>
      <p className="mt-4 rounded-xl bg-[var(--info-bg)] px-4 py-3 text-sm leading-6 text-[var(--info-fg)]">{t("privacy")}</p>
      {errorText ? <p role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm font-semibold text-[var(--error-fg)]">{errorText}</p> : null}<p aria-live="polite" className="sr-only">{status}</p>
      {payload ? <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4"><Info label={t("file.name")} value={payload.fileName}/><Info label={t("file.size")} value={payload.fileSize ? `${(payload.fileSize / 1024).toFixed(1)} KB` : t("sample.label")}/><Info label={t("file.sheets")} value={String(payload.sheets.length)}/><Info label={t("file.encoding")} value={payload.encoding ?? "Excel"}/></div> : null}
    </section>

    {payload && table ? <>
      <section className="grid gap-6 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <Settings title={t("sections.data")} open>
            <Field label={t("fields.sheet")}><select value={payload.selectedSheet} onChange={event => chooseSheet(event.target.value)} disabled={!file || payload.sheets.length === 1} className="control">{payload.sheets.map(sheet => <option key={sheet}>{sheet}</option>)}</select></Field>
            <Field label={t("fields.header")}><select value={headerRow === null ? "none" : String(headerRow)} onChange={event => { const next = event.target.value === "none" ? null : Number(event.target.value); setHeaderRow(next); requestAnimationFrame(() => { const nextTable = normalizeRows(payload.rawRows, payload.source, payload.selectedSheet, next, payload.encoding, payload.date1904); const x = nextTable.columns.find(column => !isNumericKind(column.inferredKind)) ?? nextTable.columns[0]; const y = nextTable.columns.find(column => isNumericKind(column.inferredKind)); setConfig(current => ({ ...current, xColumnId: x?.id ?? "", yColumnIds: y ? [y.id] : [] })); }); }} className="control"><option value="none">{t("fields.noHeader")}</option>{payload.rawRows.slice(0, 20).map((_, index) => <option key={index} value={index}>{t("fields.row", { row: index + 1 })}{payload.headerGuess === index ? ` · ${t("fields.auto")}` : ""}</option>)}</select></Field>
            <Field label={config.chartType === "scatter" ? t("fields.xValue") : t("preview.x")}><select data-testid="chart-x-column" value={config.xColumnId} onChange={event => { const xColumnId = event.target.value; setConfig(current => { if (current.chartType !== "scatter" || !current.yColumnIds.includes(xColumnId)) return { ...current, xColumnId }; const nextY = numericColumns.find(column => column.id !== xColumnId)?.id; return { ...current, xColumnId, yColumnIds: nextY ? [nextY] : [] }; }); }} className="control">{selectableXColumns.map(column => <option key={column.id} value={column.id}>{column.label} · {t(`types.${column.inferredKind}`)}</option>)}</select></Field>
            <fieldset><legend className="text-sm font-bold">{config.chartType === "scatter" ? t("fields.yValue") : t("fields.series")}</legend><p className="mt-1 text-xs text-[var(--text-muted)]">{t("fields.seriesHelp", { max: config.chartType === "scatter" ? 1 : MAX_SERIES })}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{numericColumns.map(column => { const disabled = config.chartType === "scatter" && column.id === config.xColumnId; return <label key={column.id} className={`flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 ${disabled ? "opacity-50" : ""}`}><input type={config.chartType === "scatter" ? "radio" : "checkbox"} name={config.chartType === "scatter" ? "scatter-y" : undefined} disabled={disabled} checked={config.yColumnIds.includes(column.id)} onChange={() => config.chartType === "scatter" ? setConfig(current => ({ ...current, yColumnIds: [column.id] })) : toggleSeries(column.id)} className="size-4 accent-blue-600"/><span className="truncate">{column.label}</span></label>; })}</div></fieldset>
            {config.chartType === "scatter" ? <div data-testid="scatter-guide" className="rounded-xl border border-[var(--border)] bg-[var(--info-bg)] p-3 text-sm leading-6"><strong>{scatterT("title")}</strong><p className="mt-1 text-[var(--text-muted)]">{scatterT("description")}</p><p className="mt-2 font-semibold">{scatterT("example")}</p></div> : null}
            {recommendation ? <div className="rounded-xl bg-[var(--info-bg)] p-3 text-sm"><strong>{t("recommend.title")}: {t(`charts.${recommendation.type}`)}</strong><p className="mt-1 text-[var(--text-muted)]">{t(`recommend.${recommendation.reason}`)}</p><button type="button" onClick={useRecommendation} className="mt-2 min-h-11 font-bold text-[var(--primary)] underline">{t("recommend.apply")}</button></div> : null}
          </Settings>
          <Settings title={t("sections.chart")}>
            <fieldset><legend className="text-sm font-bold">{t("fields.chartType")}</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{chartTypes.map(type => { const disabled = type === "scatter" && numericColumns.length < 2; return <label key={type} title={disabled ? scatterT("unavailable") : undefined} className={`grid min-h-11 place-items-center rounded-xl border px-2 text-center text-sm font-semibold ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${config.chartType === type ? "border-[var(--primary)] bg-[var(--info-bg)] text-[var(--primary)]" : "border-[var(--border)]"}`}><input className="sr-only" type="radio" name="chart-type" value={type} disabled={disabled} checked={config.chartType === type} onChange={() => selectChartType(type)}/>{t(`charts.${type}`)}</label>; })}</div>{numericColumns.length < 2 ? <p className="mt-2 text-xs text-[var(--text-muted)]">{scatterT("unavailable")}</p> : null}</fieldset>
            <div className="grid gap-3 sm:grid-cols-3"><Field label={t("fields.aggregation")}><select value={config.aggregation} onChange={event => setConfig(current => ({ ...current, aggregation: event.target.value as Aggregation }))} className="control">{["none","sum","avg","count","min","max"].map(value => <option key={value} value={value}>{t(`aggregations.${value}`)}</option>)}</select></Field><Field label={t("fields.sort")}><select value={config.sort} onChange={event => setConfig(current => ({ ...current, sort: event.target.value as SortMode }))} className="control">{["source","x-asc","x-desc","value-asc","value-desc"].map(value => <option key={value} value={value}>{t(`sorts.${value}`)}</option>)}</select></Field><Field label={t("fields.topN")}><input type="number" min="1" max="100" value={config.topN ?? ""} placeholder={t("fields.all")} onChange={event => setConfig(current => ({ ...current, topN: event.target.value ? Number(event.target.value) : null }))} className="control"/></Field></div>
            <Field label={t("fields.title")}><input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} className="control"/></Field><Field label={t("fields.subtitle")}><input value={subtitle} maxLength={140} onChange={event => setSubtitle(event.target.value)} className="control"/></Field>
            <div className="grid gap-2 sm:grid-cols-2">{[["legend",legend,setLegend],["labels",labels,setLabels],["xAxis",showX,setShowX],["yAxis",showY,setShowY],["grid",grid,setGrid]].map(([key,value,setter]) => <Toggle key={String(key)} label={t(`fields.${key}`)} checked={value as boolean} onChange={setter as (value:boolean)=>void}/>)}</div>
            {legend ? <Field label={t("fields.legendPosition")}><select value={legendPosition} onChange={event => setLegendPosition(event.target.value as "top" | "bottom")} className="control"><option value="top">{t("positions.top")}</option><option value="bottom">{t("positions.bottom")}</option></select></Field> : null}
          </Settings>
          <Settings title={t("sections.design")}>
            <div className="grid gap-3 sm:grid-cols-2"><Field label={t("fields.theme")}><select value={theme} onChange={event => setTheme(event.target.value as ThemeName)} className="control">{themes.map(value => <option key={value} value={value}>{t(`themes.${value}`)}</option>)}</select></Field><Field label={t("fields.background")}><select value={background} onChange={event => setBackground(event.target.value as BackgroundName)} className="control">{["white","dark","transparent"].map(value => <option key={value} value={value}>{t(`backgrounds.${value}`)}</option>)}</select></Field><Field label={t("fields.numberFormat")}><select value={numberFormat} onChange={event => setNumberFormat(event.target.value as NumberFormat)} className="control">{["plain","grouped","percent","won","dollar"].map(value => <option key={value} value={value}>{t(`numberFormats.${value}`)}</option>)}</select></Field></div>
            <fieldset><legend className="text-sm font-bold">{t("fields.colors")}</legend><div className="mt-2 flex flex-wrap gap-3">{config.yColumnIds.map((id,index) => <label key={id} className="flex items-center gap-2 text-sm"><input type="color" value={colors[index] ?? "#2563eb"} aria-label={table.columns.find(column => column.id === id)?.label} onChange={event => setColors(current => current.map((color,colorIndex) => colorIndex === index ? event.target.value : color))} className="size-11 rounded"/><span>{table.columns.find(column => column.id === id)?.label}</span></label>)}</div></fieldset>
          </Settings>
          <Settings title={t("sections.export")}>
            <div className="grid grid-cols-2 gap-2">{OUTPUT_PRESETS.map(([presetWidth,presetHeight]) => <button key={`${presetWidth}x${presetHeight}`} type="button" onClick={() => { setWidth(presetWidth); setHeight(presetHeight); }} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${width === presetWidth && height === presetHeight ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)]"}`}>{presetWidth}×{presetHeight}</button>)}</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2"><Field label={t("fields.width")}><input type="number" min="200" max="4000" value={width} onChange={event => setWidth(Number(event.target.value))} className="control"/></Field><span className="pb-3">×</span><Field label={t("fields.height")}><input type="number" min="200" max="4000" value={height} onChange={event => setHeight(Number(event.target.value))} className="control"/></Field></div>
            <div className="grid gap-3 sm:grid-cols-3"><Field label={t("fields.scale")}><select value={format === "svg" ? 1 : scale} disabled={format === "svg"} onChange={event => setScale(Number(event.target.value))} className="control">{[1,2,3].map(value => <option key={value} value={value}>{value}×</option>)}</select></Field><Field label={t("fields.format")}><select value={format} onChange={event => { const next = event.target.value as ExportFormat; setFormat(next); if (next === "svg") setScale(1); }} className="control"><option value="png">PNG</option><option value="jpeg">JPG</option><option value="svg">SVG</option></select></Field>{format === "jpeg" ? <Field label={t("fields.quality")}><select value={quality} onChange={event => setQuality(Number(event.target.value))} className="control"><option value="0.8">80%</option><option value="0.9">90%</option><option value="1">100%</option></select></Field> : null}</div>
            <p className={`text-sm ${outputValid ? "text-[var(--text-muted)]" : "font-semibold text-[var(--error-fg)]"}`}>{outputValid ? t("export.resultSize", { width: width * scale, height: height * scale }) : t("errors.size")}</p>
            <Button type="button" onClick={download} disabled={exporting || !dataset || Boolean(dataset.error) || !outputValid} className="w-full"><Download aria-hidden size={18}/>{exporting ? t("status.exporting") : t("actions.download", { format: format === "jpeg" ? "JPG" : format.toUpperCase() })}</Button>
            <Button type="button" variant="secondary" onClick={() => resetChart(payload)} className="w-full"><RotateCcw aria-hidden size={18}/>{t("actions.resetChart")}</Button>
          </Settings>
        </div>
        <section aria-labelledby="chart-preview-title" className="order-1 min-w-0 xl:order-2"><div className="xl:sticky xl:top-24"><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="chart-preview-title" className="text-xl font-bold">{t("preview.title")}</h2><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold">{width}×{height} · {config.chartType}</span></div>{dataset?.warning ? <p className="mt-3 rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">{t(`warnings.${dataset.warning}`)}</p> : null}<div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]" style={{ aspectRatio: `${width}/${height}` }}>{dataset && !dataset.error && dataset.points.length ? <div ref={chartHostRef} role="img" aria-label={t("preview.summary", { title: title || t("preview.untitled"), points: dataset.points.length, series: dataset.series.length })} className="size-full min-h-64"/> : <div className="grid size-full min-h-72 place-items-center p-6 text-center text-[var(--text-muted)]">{errorText || t("preview.empty")}</div>}</div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><Info label={t("preview.points")} value={String(dataset?.points.length ?? 0)}/><Info label={t("preview.series")} value={String(dataset?.series.length ?? 0)}/><Info label={t("preview.x")} value={table.columns.find(column => column.id === config.xColumnId)?.label ?? "-"}/><Info label={t("preview.operation")} value={t(`charts.${config.chartType}`)}/></dl></div></div></section>
      </section>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold">{t("table.title")}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{t("table.summary", { rows: table.rowCount, columns: table.columns.length, preview: Math.min(PREVIEW_ROWS, table.rowCount) })}</p></div></div><div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-[var(--border)]"><table className="min-w-full border-collapse text-sm"><thead><tr>{table.columns.map(column => <th key={column.id} scope="col" className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-left"><span>{column.label}</span><span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{t(`types.${column.inferredKind}`)}</span></th>)}</tr></thead><tbody>{table.rows.slice(0, PREVIEW_ROWS).map((row,rowIndex) => <tr key={rowIndex}>{table.columns.map(column => <td key={column.id} className="max-w-64 truncate border-b border-[var(--border)] px-3 py-2">{row[column.sourceColumn]?.display || <span className="text-[var(--text-muted)]">—</span>}</td>)}</tr>)}</tbody></table></div></section>
    </> : null}
  </div>;
}

function Settings({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) { return <details open={open} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 py-3 font-bold marker:content-none">{title}<span aria-hidden className="text-[var(--text-muted)] group-open:rotate-180">⌄</span></summary><div className="space-y-4 border-t border-[var(--border)] p-4">{children}</div></details>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }) { return <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="size-4 accent-blue-600"/><span className="text-sm font-medium">{label}</span></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs font-bold text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>; }
