import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FILE_LIMIT_BYTES, MAX_COLUMNS, MAX_NON_EMPTY_CELLS, MAX_ROWS, type RawCell, type SourceKind, type WorkbookPayload } from "./model";
import { guessHeaderRow } from "./normalize";

export class ChartFileError extends Error { constructor(public code: "file-large" | "unsupported" | "signature" | "parse" | "empty" | "limits" | "encoding") { super(code); } }

function extension(name: string) { return name.toLowerCase().split(".").pop() ?? ""; }
function validateSize(size: number) { if (size > FILE_LIMIT_BYTES) throw new ChartFileError("file-large"); }
function signature(bytes: Uint8Array, expected: number[]) { return expected.every((value, index) => bytes[index] === value); }

export function decodeCsv(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2)), encoding: "UTF-16LE" };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2)), encoding: "UTF-16BE" };
  const clean = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(clean), encoding: "UTF-8" }; }
  catch { try { return { text: new TextDecoder("euc-kr", { fatal: true }).decode(bytes), encoding: "CP949/EUC-KR" }; } catch { throw new ChartFileError("encoding"); } }
}

function enforceLimits(rows: RawCell[][]) {
  if (rows.length > MAX_ROWS || rows.some(row => row.length > MAX_COLUMNS)) throw new ChartFileError("limits");
  let filled = 0; for (const row of rows) for (const cell of row) if (cell?.value !== null && cell?.value !== "") { filled++; if (filled > MAX_NON_EMPTY_CELLS) throw new ChartFileError("limits"); }
}

function parseCsv(bytes: Uint8Array): { rows: RawCell[][]; encoding: string } {
  let physicalRows = 1; for (const byte of bytes) if (byte === 0x0a) { physicalRows++; if (physicalRows > MAX_ROWS) throw new ChartFileError("limits"); }
  const decoded = decodeCsv(bytes);
  const parsed = Papa.parse<string[]>(decoded.text, { delimiter: "", delimitersToGuess: [",", ";", "\t"], skipEmptyLines: false });
  const fatal = parsed.errors.find(error => error.type === "Delimiter" || error.code === "InvalidQuotes" || error.code === "MissingQuotes");
  if (fatal) throw new ChartFileError("parse");
  const rows = parsed.data.map(row => row.map(value => ({ value })));
  enforceLimits(rows); return { rows, encoding: decoded.encoding };
}

function sheetRows(sheet: XLSX.WorkSheet): RawCell[][] {
  if (!sheet["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  if (range.e.r - range.s.r + 1 > MAX_ROWS || range.e.c - range.s.c + 1 > MAX_COLUMNS) throw new ChartFileError("limits");
  const rows: RawCell[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) { const row: RawCell[] = []; for (let c = range.s.c; c <= range.e.c; c++) { const cell = sheet[XLSX.utils.encode_cell({ r, c })]; row.push(cell ? { value: cell.v instanceof Date ? cell.w ?? cell.v.toISOString() : cell.v ?? null, display: cell.w, numberFormat: cell.z, type: cell.t } : { value: null }); } rows.push(row); }
  enforceLimits(rows); return rows;
}

export function parseWorkbookBuffer(buffer: ArrayBuffer, fileName: string, fileSize = buffer.byteLength, requestedSheet?: string): WorkbookPayload {
  validateSize(fileSize); const ext = extension(fileName); const bytes = new Uint8Array(buffer);
  if (ext === "csv") { const { rows, encoding } = parseCsv(bytes); if (!rows.some(row => row.some(cell => cell.value !== ""))) throw new ChartFileError("empty"); return { fileName, fileSize, source: "csv", sheets: ["CSV"], selectedSheet: "CSV", rawRows: rows, headerGuess: guessHeaderRow(rows), encoding }; }
  if (ext !== "xlsx" && ext !== "xls") throw new ChartFileError("unsupported");
  if (ext === "xlsx" && !signature(bytes, [0x50, 0x4b])) throw new ChartFileError("signature");
  if (ext === "xls" && !signature(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) throw new ChartFileError("signature");
  try {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false, cellNF: true, cellFormula: true });
    if (!workbook.SheetNames.length) throw new ChartFileError("empty");
    const selectedSheet = requestedSheet && workbook.SheetNames.includes(requestedSheet) ? requestedSheet : workbook.SheetNames[0];
    const rows = sheetRows(workbook.Sheets[selectedSheet]);
    if (!rows.some(row => row.some(cell => cell.value !== null))) throw new ChartFileError("empty");
    return { fileName, fileSize, source: ext as SourceKind, sheets: workbook.SheetNames, selectedSheet, rawRows: rows, headerGuess: guessHeaderRow(rows), date1904: Boolean(workbook.Workbook?.WBProps?.date1904) };
  } catch (error) { if (error instanceof ChartFileError) throw error; throw new ChartFileError("parse"); }
}
