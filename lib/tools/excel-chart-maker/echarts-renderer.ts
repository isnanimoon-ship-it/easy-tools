import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import { DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent } from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import type { ComposeOption, ECharts, EChartsCoreOption } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption, ScatterSeriesOption } from "echarts/charts";
import type { GridComponentOption, LegendComponentOption, TitleComponentOption, TooltipComponentOption } from "echarts/components";
import type { BackgroundName, ChartDataset, ChartType, NumberFormat, ThemeName } from "./model";

echarts.use([BarChart, LineChart, PieChart, ScatterChart, DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent, CanvasRenderer, SVGRenderer]);

type Option = ComposeOption<BarSeriesOption | LineSeriesOption | PieSeriesOption | ScatterSeriesOption | GridComponentOption | LegendComponentOption | TitleComponentOption | TooltipComponentOption>;
export type VisualConfig = { chartType: ChartType; title: string; subtitle: string; legend: boolean; legendPosition: "top" | "bottom"; labels: boolean; xAxis: boolean; yAxis: boolean; grid: boolean; theme: ThemeName; background: BackgroundName; numberFormat: NumberFormat; colors: string[] };

const palettes: Record<ThemeName, string[]> = {
  default: ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#e11d48"],
  simple: ["#334155", "#64748b", "#94a3b8", "#475569", "#0f172a"],
  dark: ["#60a5fa", "#fb923c", "#4ade80", "#c084fc", "#fb7185"],
  presentation: ["#0f766e", "#c2410c", "#1d4ed8", "#a21caf", "#be123c"],
};
const backgrounds: Record<BackgroundName, string> = { white: "#ffffff", dark: "#0f172a", transparent: "transparent" };

function formatter(format: NumberFormat) {
  return (input: unknown) => { const value = Number(input); if (!Number.isFinite(value)) return String(input ?? ""); if (format === "percent") return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; if (format === "won") return `${value.toLocaleString()}원`; if (format === "dollar") return `$${value.toLocaleString()}`; return format === "grouped" ? value.toLocaleString() : String(value); };
}

export function buildEChartsOption(dataset: ChartDataset, visual: VisualConfig): EChartsCoreOption {
  const dark = visual.background === "dark" || visual.theme === "dark";
  const text = dark ? "#f8fafc" : "#0f172a", muted = dark ? "#94a3b8" : "#64748b", grid = dark ? "#334155" : "#e2e8f0";
  const colors = visual.colors.length ? visual.colors : palettes[visual.theme]; const valueFormat = formatter(visual.numberFormat);
  const common: Option = { animation: false, backgroundColor: backgrounds[visual.background], color: colors, title: { text: visual.title, subtext: visual.subtitle, left: "center", textStyle: { color: text, fontFamily: "system-ui", fontSize: 22 }, subtextStyle: { color: muted, fontFamily: "system-ui" } }, legend: visual.legend ? { show: true, top: visual.legendPosition === "top" ? 56 : undefined, bottom: visual.legendPosition === "bottom" ? 12 : undefined, textStyle: { color: text } } : { show: false }, tooltip: { trigger: visual.chartType === "pie" || visual.chartType === "donut" ? "item" : "axis" } };
  if (visual.chartType === "pie" || visual.chartType === "donut") {
    return {
      ...common,
      series: [{
        name: dataset.series[0]?.name,
        type: "pie",
        radius: visual.chartType === "donut" ? ["42%", "70%"] : "70%",
        center: ["50%", "57%"],
        data: dataset.points.map(point => ({ name: String(point.x), value: point.values[0] ?? 0 })),
        avoidLabelOverlap: true,
        minShowLabelAngle: 5,
        labelLayout: { hideOverlap: true },
        label: {
          show: visual.labels,
          position: "inside",
          color: "#ffffff",
          textBorderColor: "rgba(15, 23, 42, 0.8)",
          textBorderWidth: 3,
          formatter: (params: { name?: string; percent?: number }) => `${params.name}\n${params.percent ?? 0}%`,
        },
        labelLine: { show: false },
      }],
    };
  }
  const horizontal = visual.chartType === "horizontal-bar";
  const categories = dataset.points.map(point => point.x);
  const series = dataset.series.map((item, index) => {
    const values = dataset.points.map(point => point.values[index]);
    const base = { name: item.name, data: values, label: { show: visual.labels, position: visual.chartType.includes("bar") ? "top" : "top", formatter: (params: { value?: unknown }) => valueFormat(params.value) } };
    if (visual.chartType === "scatter") return { ...base, type: "scatter" as const, data: dataset.points.map(point => [point.x, point.values[index]]) };
    if (visual.chartType === "line" || visual.chartType === "area") return { ...base, type: "line" as const, smooth: false, connectNulls: false, areaStyle: visual.chartType === "area" ? {} : undefined };
    return { ...base, type: "bar" as const };
  });
  const categoryAxis = { type: "category" as const, data: categories, show: true, axisLabel: { color: text, hideOverlap: true }, axisLine: { lineStyle: { color: muted } } };
  const valueAxis = { type: "value" as const, show: true, axisLabel: { color: text, formatter: valueFormat }, axisLine: { lineStyle: { color: muted } }, splitLine: { show: visual.grid, lineStyle: { color: grid } } };
  const scatterAxis = { type: "value" as const, show: true, axisLabel: { color: text }, splitLine: { show: visual.grid, lineStyle: { color: grid } } };
  return { ...common, grid: { left: horizontal ? 100 : 65, right: 35, top: visual.legend ? 100 : 78, bottom: visual.legend && visual.legendPosition === "bottom" ? 65 : 55, outerBoundsMode: "same", outerBoundsContain: "axisLabel" }, xAxis: visual.chartType === "scatter" ? { ...scatterAxis, show: visual.xAxis } : horizontal ? { ...valueAxis, show: visual.xAxis } : { ...categoryAxis, show: visual.xAxis }, yAxis: visual.chartType === "scatter" ? { ...scatterAxis, show: visual.yAxis } : horizontal ? { ...categoryAxis, show: visual.yAxis } : { ...valueAxis, show: visual.yAxis }, series };
}

export function mountChart(element: HTMLElement, dataset: ChartDataset, visual: VisualConfig, renderer: "canvas" | "svg" = "canvas", width?: number, height?: number, devicePixelRatio?: number): ECharts {
  const instance = echarts.init(element, null, { renderer, width, height, devicePixelRatio });
  instance.setOption(buildEChartsOption(dataset, visual), true); return instance;
}

export async function exportChart(dataset: ChartDataset, visual: VisualConfig, format: "png" | "jpeg" | "svg", width: number, height: number, scale: number, quality = 0.9) {
  const host = document.createElement("div"); host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px`; document.body.append(host);
  const renderer = format === "svg" ? "svg" : "canvas";
  const instance = mountChart(host, dataset, visual, renderer, width, height, 1);
  try {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    let dataUrl = instance.getDataURL({ type: format, pixelRatio: format === "svg" ? 1 : scale, backgroundColor: format === "jpeg" && visual.background === "transparent" ? "#ffffff" : undefined });
    if (format === "jpeg" && quality < 1) { const image = new Image(); image.src = dataUrl; await image.decode(); const canvas = document.createElement("canvas"); canvas.width = width * scale; canvas.height = height * scale; canvas.getContext("2d")?.drawImage(image, 0, 0); dataUrl = canvas.toDataURL("image/jpeg", quality); }
    const response = await fetch(dataUrl); const blob = await response.blob();
    if (format !== "svg") { const bitmap = await createImageBitmap(blob); const expectedWidth = width * scale, expectedHeight = height * scale; const valid = bitmap.width === expectedWidth && bitmap.height === expectedHeight; bitmap.close(); if (!valid) throw new Error("dimensions"); }
    else { const text = await blob.text(); const documentNode = new DOMParser().parseFromString(text, "image/svg+xml"); if (documentNode.querySelector("parsererror") || documentNode.querySelector("script")) throw new Error("svg"); }
    return blob;
  } finally { instance.dispose(); host.remove(); }
}
