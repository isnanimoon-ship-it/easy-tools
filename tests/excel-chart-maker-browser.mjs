import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import * as XLSX from "xlsx";
import { encode } from "iconv-lite";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3001";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const consoleErrors = [], pageErrors = [], leakedRequests = [];
function watch(page, label) {
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${label}: ${message.text()}`); });
  page.on("pageerror", error => pageErrors.push(`${label}: ${error.message}`));
  page.on("request", request => { if (`${request.url()} ${request.postData() ?? ""}`.includes("PRIVATE_MARKER")) leakedRequests.push(request.url()); });
}
function workbook(bookType) {
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["월", "매출", "주문"], ["1월", 100, 2], ["2월", 200, 4], ["3월", 0, null]]), "월별"); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["광고비", "매출"], [10, 30], [20, 60]]), "산점도"); return Buffer.from(XLSX.write(book, { type: "array", bookType }));
}
function pngSize(bytes) { return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]; }
function jpegSize(bytes) { let offset = 2; while (offset < bytes.length) { if (bytes[offset] !== 0xff) { offset++; continue; } const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2); if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)]; offset += 2 + length; } throw new Error("JPEG dimensions missing"); }

try {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 950 } });
  await context.addInitScript(() => { window.__privacyWrites = []; const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (`${key} ${value}`.includes("PRIVATE_MARKER")) window.__privacyWrites.push(`${key}:${value}`); return original.call(this, key, value); }; });
  const page = await context.newPage(); watch(page, "ko/1440");
  await page.goto(`${baseUrl}/ko/tools/excel-chart-maker`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.getByRole("heading", { name: "엑셀·CSV 그래프 만들기" }).isVisible(), true);
  await page.getByRole("button", { name: "예제 데이터" }).click(); await page.getByRole("heading", { name: "차트 미리보기" }).waitFor(); await page.locator('div[role="img"]').waitFor({ timeout: 15000 });
  assert.equal(await page.getByText(/전체 5행 × 3열/).isVisible(), true); assert.match(await page.locator('div[role="img"]').getAttribute("aria-label"), /데이터 5개/);
  await page.getByRole("checkbox", { name: "주문 수" }).check(); await page.waitForFunction(() => document.querySelector('div[role="img"]')?.getAttribute("aria-label")?.includes("시리즈 2개"));

  await page.locator("summary").filter({ hasText: "2. 차트 설정" }).click();
  for (const type of ["세로 막대", "가로 막대", "라인", "원형", "도넛", "영역"]) { await page.getByLabel(type, { exact: true }).check({ force: true }); await page.locator("canvas, svg").last().waitFor(); }
  await page.getByLabel("산점도", { exact: true }).check({ force: true }); await page.getByLabel("X 값 (숫자)").selectOption("column-1"); await page.locator("canvas, svg").last().waitFor();
  await page.getByLabel("세로 막대", { exact: true }).check({ force: true }); await page.locator("summary").filter({ hasText: "4. 이미지 크기와 저장" }).click(); await page.getByLabel("해상도").selectOption("2");
  const pngDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "PNG 다운로드" }).click(); const png = await pngDownload; const pngBytes = await readFile(await png.path()); assert.deepEqual(pngSize(pngBytes), [2400, 1260]);
  await page.getByLabel("해상도").selectOption("1"); for (const [presetWidth, presetHeight] of [[1080,1080],[1920,1080],[1080,1920]]) { await page.getByRole("button", { name: `${presetWidth}×${presetHeight}` }).click(); const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "PNG 다운로드" }).click(); const item = await pending; assert.deepEqual(pngSize(await readFile(await item.path())), [presetWidth, presetHeight]); }
  await page.getByLabel("파일 형식").selectOption("svg"); const svgDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "SVG 다운로드" }).click(); const svg = await svgDownload; const svgText = await readFile(await svg.path(), "utf8"); assert.match(svgText, /<svg/); assert.doesNotMatch(svgText, /<script/i);
  await page.getByLabel("파일 형식").selectOption("jpeg"); const jpgDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "JPG 다운로드" }).click(); const jpg = await jpgDownload; const jpgBytes = await readFile(await jpg.path()); assert.deepEqual([...jpgBytes.subarray(0, 3)], [0xff, 0xd8, 0xff]); assert.deepEqual(jpegSize(jpgBytes), [1080, 1920]);

  const xlsx = workbook("xlsx"); await page.locator("#chart-file").setInputFiles({ name: "PRIVATE_MARKER.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx }); await page.getByText("PRIVATE_MARKER.xlsx", { exact: true }).waitFor({ timeout: 20000 }); assert.equal(await page.getByLabel("시트").locator("option").count(), 2); await page.getByLabel("헤더 행").selectOption("none"); await page.getByText("열 A", { exact: true }).first().waitFor(); await page.getByLabel("헤더 행").selectOption("0"); await page.getByLabel("시트").selectOption("산점도"); await page.getByText("광고비", { exact: true }).first().waitFor({ timeout: 20000 }); assert.deepEqual(await page.evaluate(() => window.__privacyWrites), []);
  const dateBook = XLSX.utils.book_new(); dateBook.Workbook = { WBProps: { date1904: true } }; const dateSheet = XLSX.utils.aoa_to_sheet([["날짜", "값"], [1, 10]]); dateSheet.A2.z = "yyyy-mm-dd"; XLSX.utils.book_append_sheet(dateBook, dateSheet, "날짜"); const dateBytes = Buffer.from(XLSX.write(dateBook, { type: "array", bookType: "xlsx" })); await page.locator("#chart-file").setInputFiles({ name: "date1904.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: dateBytes }); await page.getByText("1904-01-02", { exact: true }).waitFor({ timeout: 20000 });
  const xls = workbook("xls"); await page.locator("#chart-file").setInputFiles({ name: "legacy.xls", mimeType: "application/vnd.ms-excel", buffer: xls }); await page.getByText("legacy.xls", { exact: true }).waitFor({ timeout: 20000 });
  const cp949 = Buffer.from(encode("도시,값\n서울,100\n부산,200", "cp949")); await page.locator("#chart-file").setInputFiles({ name: "korean.csv", mimeType: "text/csv", buffer: cp949 }); await page.getByText("CP949/EUC-KR", { exact: true }).waitFor(); await page.getByText("서울", { exact: true }).waitFor();
  const largeCsv = Buffer.from(`항목,값\n${Array.from({ length: 99_999 }, (_, index) => `A${index},${index}`).join("\n")}`); const largeStart = Date.now(); await page.locator("#chart-file").setInputFiles({ name: "large.csv", mimeType: "text/csv", buffer: largeCsv }); await page.getByText("large.csv", { exact: true }).waitFor({ timeout: 30000 }); assert.ok(Date.now() - largeStart < 10_000); await page.getByText(/전체 99999행/).waitFor();
  const overRows = Buffer.from(`항목\n${Array.from({ length: 100_001 }, (_, index) => `A${index}`).join("\n")}`); await page.locator("#chart-file").setInputFiles({ name: "over.csv", mimeType: "text/csv", buffer: overRows }); const limitAlert = page.locator('p[role="alert"]').filter({ hasText: "처리 한도" }); await limitAlert.waitFor({ timeout: 30000 });
  await page.locator("#chart-file").setInputFiles({ name: "bad.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("not-a-zip") }); const fileAlert = page.locator('p[role="alert"]'); await fileAlert.waitFor(); assert.match(await fileAlert.textContent(), /확장자와 실제 형식/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true); await context.close();

  for (const [locale, width, title, sample] of [["ko", 320, "엑셀·CSV 그래프 만들기", "예제 데이터"], ["en", 375, "Excel & CSV Chart Maker", "Example data"], ["ja", 768, "Excel・CSVグラフ作成", "サンプルデータ"]]) {
    const mobile = await browser.newContext({ viewport: { width, height: 900 } }); const current = await mobile.newPage(); watch(current, `${locale}/${width}`); await current.goto(`${baseUrl}/${locale}/tools/excel-chart-maker`, { waitUntil: "domcontentloaded" }); assert.equal(await current.getByRole("heading", { name: title }).isVisible(), true); const sampleButton = current.getByRole("button", { name: sample }); await sampleButton.focus(); await current.keyboard.press("Enter"); await current.locator('div[role="img"]').waitFor({ timeout: 15000 }); assert.equal(await current.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true); await current.keyboard.press("Tab"); assert.notEqual(await current.evaluate(() => document.activeElement?.tagName), "BODY"); await mobile.close();
  }
  const improvementContext = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const improvementPage = await improvementContext.newPage(); watch(improvementPage, "chart-ux-improvements");
  await improvementPage.goto(`${baseUrl}/ko/tools/excel-chart-maker`, { waitUntil: "domcontentloaded" });
  await improvementPage.getByTestId("load-chart-sample").click();
  await improvementPage.locator("details").nth(1).locator("summary").click();
  await improvementPage.locator('input[name="chart-type"][value="pie"]').locator("..").click();
  await improvementPage.locator('input[name="chart-type"][value="pie"]:checked').waitFor();
  assert.equal(await improvementPage.locator('[data-chart-labels="on"]').count(), 1);
  await improvementPage.locator('input[name="chart-type"][value="scatter"]').locator("..").click();
  await improvementPage.locator('input[name="chart-type"][value="scatter"]:checked').waitFor();
  await improvementPage.getByTestId("scatter-guide").waitFor();
  assert.equal(await improvementPage.getByTestId("chart-x-column").locator("option").count(), 2);
  assert.equal(await improvementPage.locator('input[name="scatter-y"]:disabled').count(), 1);
  assert.notEqual(await improvementPage.getByTestId("chart-x-column").inputValue(), await improvementPage.locator('input[name="scatter-y"]:checked').inputValue());
  assert.equal(await improvementPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await improvementContext.close();

  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); assert.deepEqual(leakedRequests, []);
  process.stdout.write(JSON.stringify({ files: ["xlsx", "xls", "utf8-csv", "cp949-csv", "100k-boundary-csv"], charts: 7, exports: { png: "2400x1260", jpg: "valid-signature", svg: "valid-no-script" }, viewports: [320, 375, 768, 1440], locales: ["ko", "en", "ja"], keyboard: "native-controls", consoleErrors: 0, pageErrors: 0, privateMarkerRequests: 0, privateMarkerStorageWrites: 0 }, null, 2));
} finally { await browser.close(); }
