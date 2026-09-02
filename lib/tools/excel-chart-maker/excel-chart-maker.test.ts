import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { encode } from "iconv-lite";
import { buildChartDataset, recommendChart } from "./chart-data";
import { ChartFileError, decodeCsv, parseWorkbookBuffer } from "./file";
import { excelSerialToCalendar, guessHeaderRow, normalizeRows } from "./normalize";
import { buildEChartsOption, type VisualConfig } from "./echarts-renderer";
import type { ChartConfig, RawCell } from "./model";

const raw: RawCell[][] = [
  [{ value: "지역" }, { value: "매출" }, { value: "주문" }],
  [{ value: "서울" }, { value: 100 }, { value: 1 }],
  [{ value: "서울" }, { value: 200 }, { value: 3 }],
  [{ value: "부산" }, { value: 0 }, { value: null }],
];
const table = normalizeRows(raw, "csv", "CSV", 0, "UTF-8");
const config = (overrides: Partial<ChartConfig> = {}): ChartConfig => ({ chartType: "bar", xColumnId: "column-0", yColumnIds: ["column-1"], aggregation: "none", sort: "source", topN: null, ...overrides });

describe("Excel and CSV chart data", () => {
  it("guesses headers, infers types, preserves zero and missing values", () => {
    expect(guessHeaderRow(raw)).toBe(0);
    expect(table.columns.map(column => column.inferredKind)).toEqual(["string", "number", "number"]);
    expect(table.rows[2][1].value).toBe(0);
    expect(table.rows[2][2].value).toBeNull();
  });

  it("aggregates with exact SUM AVG COUNT MIN and MAX semantics", () => {
    expect(buildChartDataset(table, config({ aggregation: "sum" })).points[0].values[0]).toBe(300);
    expect(buildChartDataset(table, config({ aggregation: "avg" })).points[0].values[0]).toBe(150);
    expect(buildChartDataset(table, config({ aggregation: "count" })).points[0].values[0]).toBe(2);
    expect(buildChartDataset(table, config({ aggregation: "min" })).points[0].values[0]).toBe(100);
    expect(buildChartDataset(table, config({ aggregation: "max" })).points[0].values[0]).toBe(200);
  });

  it("sorts, limits, recommends and rejects misleading pie data", () => {
    expect(buildChartDataset(table, config({ sort: "value-desc", topN: 1 })).points[0].values[0]).toBe(200);
    expect(buildChartDataset(table, config({ sort: "value-asc" })).points.map(point => point.values[0])).toEqual([0, 100, 200]);
    expect(buildChartDataset(table, config({ sort: "x-asc" })).points.map(point => point.x)).toEqual(["부산", "서울", "서울"]);
    expect(buildChartDataset(table, config({ sort: "x-desc" })).points.map(point => point.x)).toEqual(["서울", "서울", "부산"]);
    expect(recommendChart(table, "column-0", ["column-1"]).type).toBe("bar");
    const negative = normalizeRows([[{ value: "항목" }, { value: "값" }], [{ value: "A" }, { value: -1 }]], "csv", "CSV", 0);
    expect(buildChartDataset(negative, config({ chartType: "pie" })).error).toBe("pie-negative");
  });

  it("builds renderer options for all seven charts and visual controls", () => {
    const dataset = buildChartDataset(table, config());
    const visual: VisualConfig = { chartType: "bar", title: "제목", subtitle: "부제", legend: false, legendPosition: "bottom", labels: true, xAxis: false, yAxis: true, grid: false, theme: "presentation", background: "transparent", numberFormat: "won", colors: ["#123456"] };
    for (const chartType of ["bar", "horizontal-bar", "line", "area", "scatter", "pie", "donut"] as const) expect(buildEChartsOption(dataset, { ...visual, chartType })).toHaveProperty("series");
    expect(buildEChartsOption(dataset, visual)).toMatchObject({ backgroundColor: "transparent", title: { text: "제목", subtext: "부제" }, legend: { show: false } });
  });

  it("places concise category and percentage labels inside pie charts", () => {
    const dataset = buildChartDataset(table, config({ chartType: "pie", aggregation: "sum" }));
    const visual: VisualConfig = { chartType: "pie", title: "", subtitle: "", legend: true, legendPosition: "top", labels: true, xAxis: true, yAxis: true, grid: true, theme: "default", background: "white", numberFormat: "grouped", colors: [] };
    const option = buildEChartsOption(dataset, visual) as { series: Array<{ label: { position: string; formatter: (params: { name: string; value: number; percent: number }) => string }; labelLine: { show: boolean } }> };
    expect(option.series[0].label.position).toBe("inside");
    expect(option.series[0].label.formatter({ name: "Seoul", value: 300, percent: 100 })).toBe("Seoul\n100%");
    expect(option.series[0].labelLine.show).toBe(false);
  });

  it("keeps date-only values stable and respects Excel 1900/1904 systems", () => {
    expect(excelSerialToCalendar(1)).toBe("1900-01-01");
    expect(excelSerialToCalendar(1, true)).toBe("1904-01-02");
    const dates = normalizeRows([[{ value: "날짜" }, { value: "값" }], [{ value: 46266, numberFormat: "yyyy-mm-dd" }, { value: 25, numberFormat: "0%" }]], "xlsx", "Sheet1", 0);
    expect(dates.rows[0][0]).toMatchObject({ kind: "date", value: "2026-09-01" });
    expect(dates.rows[0][1]).toMatchObject({ kind: "percentage", value: 25 });
  });

  it("decodes UTF-8 and CP949 CSV without replacement characters", () => {
    expect(decodeCsv(new TextEncoder().encode("도시,값\n서울,1"))).toEqual({ text: "도시,값\n서울,1", encoding: "UTF-8" });
    const cp949 = new Uint8Array(encode("도시,값\n서울,1", "cp949"));
    expect(decodeCsv(cp949)).toEqual({ text: "도시,값\n서울,1", encoding: "CP949/EUC-KR" });
  });

  it("parses XLSX, legacy XLS, multi-sheet and cached formula results", () => {
    const workbook = XLSX.utils.book_new();
    const first = XLSX.utils.aoa_to_sheet([["항목", "값"], ["A", 1], ["B", 2]]);
    first.B4 = { t: "n", f: "SUM(B2:B3)", v: 3 } as XLSX.CellObject; first.A4 = { t: "s", v: "합계" }; first["!ref"] = "A1:B4";
    XLSX.utils.book_append_sheet(workbook, first, "매출"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["X", "Y"], [1, 2]]), "산점도");
    for (const bookType of ["xlsx", "xls"] as const) {
      const bytes = XLSX.write(workbook, { type: "array", bookType });
      const parsed = parseWorkbookBuffer(bytes, `fixture.${bookType}`, bytes.byteLength, "매출");
      expect(parsed.sheets).toEqual(["매출", "산점도"]); expect(parsed.rawRows[3][1].value).toBe(3);
    }
  });

  it("preserves the workbook 1904 date system through parsing and normalization", () => {
    const workbook = XLSX.utils.book_new(); workbook.Workbook = { WBProps: { date1904: true } };
    const sheet = XLSX.utils.aoa_to_sheet([["날짜", "값"], [1, 10]]); sheet.A2.z = "yyyy-mm-dd"; XLSX.utils.book_append_sheet(workbook, sheet, "날짜");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }); const parsed = parseWorkbookBuffer(bytes, "date-1904.xlsx");
    expect(parsed.date1904).toBe(true); expect(normalizeRows(parsed.rawRows, parsed.source, parsed.selectedSheet, parsed.headerGuess, undefined, parsed.date1904).rows[0][0].value).toBe("1904-01-02");
  });

  it("rejects disguised and oversized files with explicit errors", () => {
    expect(() => parseWorkbookBuffer(new TextEncoder().encode("not zip").buffer, "bad.xlsx")).toThrowError(ChartFileError);
    expect(() => parseWorkbookBuffer(new ArrayBuffer(1), "bad.txt")).toThrowError(ChartFileError);
    const overRows = new TextEncoder().encode(`header\n${"value\n".repeat(100_000)}`);
    expect(() => parseWorkbookBuffer(overRows.buffer, "too-many.csv")).toThrowError(expect.objectContaining({ code: "limits" }));
  });

  it("rejects malformed quoted CSV instead of crashing", () => {
    const broken = new TextEncoder().encode('name,value\n"missing end,1');
    expect(() => parseWorkbookBuffer(broken.buffer, "broken.csv")).toThrowError(expect.objectContaining({ code: "parse" }));
  });
});
