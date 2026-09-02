export const FILE_LIMIT_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS = 100_000;
export const MAX_COLUMNS = 50;
export const MAX_NON_EMPTY_CELLS = 2_000_000;
export const PREVIEW_ROWS = 20;
export const MAX_SERIES = 5;

export type SourceKind = "xlsx" | "xls" | "csv" | "sample";
export type CellKind = "string" | "number" | "percentage" | "currency" | "date" | "datetime" | "boolean" | "empty" | "unknown";
export type ChartType = "bar" | "horizontal-bar" | "line" | "pie" | "donut" | "area" | "scatter";
export type Aggregation = "none" | "sum" | "avg" | "count" | "min" | "max";
export type SortMode = "source" | "x-asc" | "x-desc" | "value-asc" | "value-desc";
export type ThemeName = "default" | "simple" | "dark" | "presentation";
export type BackgroundName = "white" | "dark" | "transparent";
export type NumberFormat = "plain" | "grouped" | "percent" | "won" | "dollar";

export type RawCell = { value: string | number | boolean | null; display?: string; numberFormat?: string; type?: string };
export type NormalizedCell = { raw: RawCell["value"]; value: string | number | boolean | null; kind: CellKind; display: string; numberFormat?: string; sourceRow: number };
export type NormalizedColumn = { id: string; label: string; inferredKind: CellKind; sourceColumn: number };
export type NormalizedTable = { source: SourceKind; sheetId: string; columns: NormalizedColumn[]; rows: NormalizedCell[][]; rowCount: number; encoding?: string; headerRow: number | null };
export type ChartConfig = { chartType: ChartType; xColumnId: string; yColumnIds: string[]; aggregation: Aggregation; sort: SortMode; topN: number | null };
export type ChartPoint = { x: string | number; values: Array<number | null>; sourceIndex: number };
export type ChartDataset = { points: ChartPoint[]; series: Array<{ id: string; name: string }>; warning?: "pie-many" | "unordered-line"; error?: "missing-columns" | "scatter-types" | "pie-negative" | "pie-zero" | "too-many-points" };
export type WorkbookPayload = { fileName: string; fileSize: number; source: SourceKind; sheets: string[]; selectedSheet: string; rawRows: RawCell[][]; headerGuess: number | null; encoding?: string; date1904?: boolean };

export const CHART_LIMITS: Record<ChartType, number> = { bar: 500, "horizontal-bar": 500, line: 5000, area: 5000, pie: 20, donut: 20, scatter: 10_000 };

export const OUTPUT_PRESETS = [
  [1200, 630], [1080, 1080], [1920, 1080], [1080, 1920], [1000, 1500], [1200, 1200],
] as const;
