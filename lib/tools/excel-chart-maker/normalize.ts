import type { CellKind, NormalizedCell, NormalizedTable, RawCell, SourceKind } from "./model";

const ERROR_VALUES = new Set(["#N/A", "#VALUE!", "#DIV/0!", "#REF!"]);
const DATE_PATTERN = /^(\d{4})[-/.](\d{2})[-/.](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const NUMBER_PATTERN = /^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;

export function columnName(index: number) {
  let value = index + 1, result = "";
  while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}

export function excelSerialToCalendar(serial: number, date1904 = false) {
  let days = Math.floor(serial);
  const fraction = serial - days;
  if (date1904) days += 1462;
  if (days >= 60) days -= 1;
  const epoch = Date.UTC(1899, 11, 31);
  const date = new Date(epoch + days * 86_400_000);
  const seconds = Math.round(fraction * 86_400);
  const pad = (value: number) => String(value).padStart(2, "0");
  const base = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  if (!seconds) return base;
  const hour = Math.floor(seconds / 3600) % 24, minute = Math.floor(seconds / 60) % 60, second = seconds % 60;
  return `${base} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function parseString(value: string): { kind: CellKind; value: string | number | null } {
  const trimmed = value.trim();
  if (!trimmed || ERROR_VALUES.has(trimmed)) return { kind: "empty", value: null };
  const date = trimmed.match(DATE_PATTERN);
  if (date) {
    const [, year, month, day, hour, minute, second] = date;
    const y = Number(year), m = Number(month), d = Number(day);
    const valid = new Date(Date.UTC(y, m - 1, d));
    if (valid.getUTCFullYear() === y && valid.getUTCMonth() === m - 1 && valid.getUTCDate() === d) {
      return { kind: hour ? "datetime" : "date", value: `${year}-${month}-${day}${hour ? ` ${hour}:${minute}:${second ?? "00"}` : ""}` };
    }
  }
  const percent = trimmed.endsWith("%") ? trimmed.slice(0, -1).trim() : null;
  if (percent !== null && NUMBER_PATTERN.test(percent.replaceAll(",", ""))) return { kind: "percentage", value: Number(percent.replaceAll(",", "")) / 100 };
  const currency = /^(?:₩|\$)?\s*([-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:원)?$/.exec(trimmed);
  if (currency && (trimmed.includes("₩") || trimmed.includes("$") || trimmed.endsWith("원"))) return { kind: "currency", value: Number(currency[1].replaceAll(",", "")) };
  if (NUMBER_PATTERN.test(trimmed)) return { kind: "number", value: Number(trimmed.replaceAll(",", "")) };
  return { kind: "string", value };
}

export function normalizeCell(cell: RawCell | undefined, sourceRow: number, date1904 = false): NormalizedCell {
  const raw = cell?.value ?? null;
  if (raw === null || raw === undefined || (typeof raw === "string" && ERROR_VALUES.has(raw.trim()))) return { raw, value: null, kind: "empty", display: "", sourceRow };
  if (typeof raw === "boolean") return { raw, value: raw, kind: "boolean", display: cell?.display ?? String(raw), sourceRow };
  if (typeof raw === "number") {
    const format = cell?.numberFormat ?? "";
    if (/[ymdhis]/i.test(format.replace(/\[[^\]]+]/g, ""))) {
      const value = excelSerialToCalendar(raw, date1904);
      return { raw, value, kind: value.includes(" ") ? "datetime" : "date", display: cell?.display ?? value, numberFormat: format, sourceRow };
    }
    const kind: CellKind = format.includes("%") ? "percentage" : /[$₩¥€]|원/.test(format) ? "currency" : "number";
    return { raw, value: raw, kind, display: cell?.display ?? String(raw), numberFormat: format, sourceRow };
  }
  const parsed = parseString(String(raw));
  return { raw, value: parsed.value, kind: parsed.kind, display: cell?.display ?? String(raw), numberFormat: cell?.numberFormat, sourceRow };
}

function inferColumn(cells: NormalizedCell[]): CellKind {
  const kinds = cells.filter(cell => cell.kind !== "empty").slice(0, 1000).map(cell => cell.kind);
  if (!kinds.length) return "empty";
  const counts = new Map<CellKind, number>(); kinds.forEach(kind => counts.set(kind, (counts.get(kind) ?? 0) + 1));
  const [kind, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return count / kinds.length >= 0.9 ? kind : "string";
}

export function guessHeaderRow(rows: RawCell[][]): number | null {
  const limit = Math.min(20, rows.length);
  let best: { index: number; score: number } | null = null;
  for (let index = 0; index < limit; index++) {
    const row = rows[index] ?? [], next = rows.slice(index + 1, index + 4).flat();
    const filled = row.filter(cell => cell?.value !== null && String(cell.value).trim() !== "");
    if (!filled.length) continue;
    const stringRatio = filled.filter(cell => typeof cell.value === "string" && !NUMBER_PATTERN.test(String(cell.value))).length / filled.length;
    const nextNumeric = next.filter(cell => typeof cell?.value === "number" || (typeof cell?.value === "string" && NUMBER_PATTERN.test(cell.value))).length;
    const score = filled.length * 2 + stringRatio * 5 + Math.min(nextNumeric, 5) - index * 0.05;
    if (!best || score > best.score) best = { index, score };
  }
  return best?.index ?? null;
}

export function normalizeRows(rows: RawCell[][], source: SourceKind, sheetId: string, headerRow: number | null, encoding?: string, date1904 = false): NormalizedTable {
  const width = Math.max(0, ...rows.map(row => row.length));
  const dataStart = headerRow === null ? rows.findIndex(row => row.some(cell => cell?.value !== null && String(cell.value).trim() !== "")) : headerRow + 1;
  const labels = Array.from({ length: width }, (_, index) => {
    const raw = headerRow === null ? "" : rows[headerRow]?.[index]?.value;
    return raw === null || raw === undefined || String(raw).trim() === "" ? `열 ${columnName(index)}` : String(raw).trim();
  });
  const seen = new Map<string, number>();
  const uniqueLabels = labels.map(label => { const count = (seen.get(label) ?? 0) + 1; seen.set(label, count); return count === 1 ? label : `${label} (${count})`; });
  const normalizedRows = rows.slice(Math.max(0, dataStart)).filter(row => row.some(cell => cell?.value !== null && String(cell.value).trim() !== "")).map((row, offset) => Array.from({ length: width }, (_, index) => normalizeCell(row[index], Math.max(0, dataStart) + offset + 1, date1904)));
  const columns = uniqueLabels.map((label, index) => ({ id: `column-${index}`, label, sourceColumn: index, inferredKind: inferColumn(normalizedRows.map(row => row[index])) }));
  return { source, sheetId, columns, rows: normalizedRows, rowCount: normalizedRows.length, encoding, headerRow };
}

export function isNumericKind(kind: CellKind) { return kind === "number" || kind === "percentage" || kind === "currency"; }

