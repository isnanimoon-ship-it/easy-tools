import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3012";
const hwpPath = process.env.HWP_FIXTURE;
const hwpxPath = process.env.HWPX_FIXTURE;
if (!hwpPath || !hwpxPath) throw new Error("HWP_FIXTURE and HWPX_FIXTURE are required");

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const consoleErrors = [], pageErrors = [], leakedRequests = [];
try {
  for (const [locale, width, title] of [["ko", 320, "HWP·HWPX 문서 뷰어"], ["en", 375, "HWP & HWPX Document Viewer"], ["ja", 768, "HWP・HWPX文書ビューア"]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${locale}: ${message.text()}`); });
    page.on("pageerror", error => pageErrors.push(`${locale}: ${error.message}`));
    page.on("request", request => { if (`${request.url()} ${request.postData() ?? ""}`.includes("konly-viewer-sample")) leakedRequests.push(request.url()); });
    await page.goto(`${baseUrl}/${locale}/tools/hwp-hwpx-viewer`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("heading", { level: 1, name: title }).isVisible(), true);
    assert.equal(await page.getByRole("navigation", { name: /breadcrumb/i }).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`functional: ${message.text()}`); });
  page.on("pageerror", error => pageErrors.push(`functional: ${error.message}`));
  page.on("request", request => { if (`${request.url()} ${request.postData() ?? ""}`.includes("konly-viewer-sample")) leakedRequests.push(request.url()); });
  await page.goto(`${baseUrl}/ko/tools/hwp-hwpx-viewer`, { waitUntil: "domcontentloaded" });
  const input = page.locator('input[type="file"]');

  await input.setInputFiles({ name: "wrong.hwp", mimeType: "application/octet-stream", buffer: Buffer.from("not hwp") });
  await page.getByRole("alert").filter({ hasText: "실제 문서 형식" }).waitFor();

  await input.setInputFiles({ name: "empty.hwpx", mimeType: "application/octet-stream", buffer: Buffer.alloc(0) });
  await page.getByRole("alert").filter({ hasText: "내용이 없는" }).waitFor();

  await input.setInputFiles({ name: "large.hwpx", mimeType: "application/octet-stream", buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await page.getByRole("alert").filter({ hasText: "25 MiB 이하" }).waitFor();

  await input.setInputFiles({ name: "konly-viewer-sample.hwpx", mimeType: "application/octet-stream", buffer: await readFile(hwpxPath) });
  await page.getByText("HWPX 지원", { exact: true }).waitFor();
  await page.getByRole("button", { name: "위 내용을 확인하고 문서 열기" }).click();
  await page.locator("canvas").waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => { const canvas = document.querySelector("canvas"); return canvas && canvas.width > 100 && canvas.height > 100; }, null, { timeout: 60_000 });
  assert.match(await page.getByText(/\d+ \/ \d+ 페이지/).textContent(), /1 \/ \d+ 페이지/);
  await page.getByRole("button", { name: "다른 파일 열기" }).click();

  await input.setInputFiles({ name: "konly-viewer-sample.hwp", mimeType: "application/octet-stream", buffer: await readFile(hwpPath) });
  await page.getByText("HWP 5.x 제한적 지원", { exact: true }).waitFor();
  await page.getByRole("button", { name: "위 내용을 확인하고 문서 열기" }).click();
  await page.locator("canvas").waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => { const canvas = document.querySelector("canvas"); return canvas && canvas.width > 100 && canvas.height > 100; }, null, { timeout: 60_000 });
  assert.equal(await page.getByText("일부 요소가 원본과 다르거나 표시되지 않을 수 있습니다.", { exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await context.close();

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(leakedRequests, []);
  process.stdout.write(JSON.stringify({ formats: ["hwp", "hwpx"], errors: ["disguised", "empty", "oversized"], viewports: [320, 375, 768, 1280], locales: ["ko", "en", "ja"], consoleErrors: 0, pageErrors: 0, documentDataRequests: 0 }, null, 2));
} finally {
  await browser.close();
}
