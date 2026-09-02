import { CHART_LIMITS, type ChartConfig, type ChartDataset, type ChartType, type NormalizedTable } from "./model";
import { isNumericKind } from "./normalize";

export function recommendChart(table: NormalizedTable, xColumnId: string, yColumnIds: string[]): { type: ChartType; reason: "time" | "numeric" | "category" | "long-labels" } {
  const x = table.columns.find(column => column.id === xColumnId);
  const y = table.columns.find(column => column.id === yColumnIds[0]);
  if (x && y && isNumericKind(x.inferredKind) && isNumericKind(y.inferredKind)) return { type: "scatter", reason: "numeric" };
  if (x?.inferredKind === "date" || x?.inferredKind === "datetime") return { type: "line", reason: "time" };
  const values = table.rows.map(row => String(row[x?.sourceColumn ?? 0]?.value ?? ""));
  if (values.length >= 6 || values.reduce((sum, value) => sum + value.length, 0) / Math.max(1, values.length) >= 8) return { type: "horizontal-bar", reason: "long-labels" };
  return { type: "bar", reason: "category" };
}

function compare(a: string | number, b: string | number) { return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)); }

export function buildChartDataset(table: NormalizedTable, config: ChartConfig): ChartDataset {
  const xColumn = table.columns.find(column => column.id === config.xColumnId);
  const yColumns = config.yColumnIds.map(id => table.columns.find(column => column.id === id)).filter((column): column is NonNullable<typeof column> => Boolean(column));
  if (!xColumn || !yColumns.length) return { points: [], series: [], error: "missing-columns" };
  if (config.chartType === "scatter" && (!isNumericKind(xColumn.inferredKind) || !isNumericKind(yColumns[0].inferredKind))) return { points: [], series: [], error: "scatter-types" };
  const raw = table.rows.map((row, sourceIndex) => ({ x: row[xColumn.sourceColumn]?.value, values: yColumns.map(column => row[column.sourceColumn]?.value), sourceIndex })).filter(item => (typeof item.x === "string" || typeof item.x === "number") && item.values.some(value => typeof value === "number"));
  let points: ChartDataset["points"];
  if (config.aggregation === "none") points = raw.map(item => ({ x: item.x as string | number, values: item.values.map(value => typeof value === "number" && Number.isFinite(value) ? value : null), sourceIndex: item.sourceIndex }));
  else {
    const groups = new Map<string, typeof raw>();
    raw.forEach(item => { const key = `${typeof item.x}:${String(item.x)}`; groups.set(key, [...(groups.get(key) ?? []), item]); });
    points = [...groups.values()].map(group => ({ x: group[0].x as string | number, sourceIndex: group[0].sourceIndex, values: yColumns.map((_, index) => {
      const values = group.map(item => item.values[index]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (config.aggregation === "count") return values.length;
      if (!values.length) return null;
      if (config.aggregation === "sum") return values.reduce((a, b) => a + b, 0);
      if (config.aggregation === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
      return config.aggregation === "min" ? Math.min(...values) : Math.max(...values);
    }) }));
  }
  if (config.sort === "x-asc" || config.sort === "x-desc") points.sort((a, b) => compare(a.x, b.x) * (config.sort === "x-asc" ? 1 : -1));
  if (config.sort === "value-asc" || config.sort === "value-desc") points.sort((a, b) => ((a.values[0] ?? -Infinity) - (b.values[0] ?? -Infinity)) * (config.sort === "value-asc" ? 1 : -1));
  if (config.topN) points = points.slice(0, config.topN);
  const series = yColumns.map(column => ({ id: column.id, name: column.label }));
  if ((config.chartType === "pie" || config.chartType === "donut") && points.some(point => (point.values[0] ?? 0) < 0)) return { points, series, error: "pie-negative" };
  if ((config.chartType === "pie" || config.chartType === "donut") && points.reduce((sum, point) => sum + (point.values[0] ?? 0), 0) <= 0) return { points, series, error: "pie-zero" };
  if (points.length > CHART_LIMITS[config.chartType]) return { points, series, error: "too-many-points" };
  return { points, series, warning: (config.chartType === "pie" || config.chartType === "donut") && points.length > 6 ? "pie-many" : undefined };
}

