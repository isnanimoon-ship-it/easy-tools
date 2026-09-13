import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { unzipSync } from "fflate";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3012";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const consoleErrors = [], pageErrors = [], leaks = [];

function watch(page, label, marker = "") {
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${label}: ${message.text()}`); });
  page.on("pageerror", error => pageErrors.push(`${label}: ${error.message}`));
  page.on("request", request => { if (marker && `${request.url()} ${request.postData() ?? ""}`.includes(marker)) leaks.push(request.url()); });
}

async function makeImage(page, type, width = 360, height = 240, alpha = false) {
  return Buffer.from(await page.evaluate(async ({ type, width, height, alpha }) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); const gradient = context.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, alpha ? "rgba(37,99,235,.35)" : "#2563eb"); gradient.addColorStop(1, alpha ? "rgba(244,63,94,.7)" : "#f43f5e"); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    context.fillStyle = "white"; context.font = "bold 28px sans-serif"; context.fillText("KONLY", 30, 70);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type, .94)); return [...new Uint8Array(await blob.arrayBuffer())];
  }, { type, width, height, alpha }));
}

function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function addPngText(png, keyword, value) {
  const data = Buffer.from(`${keyword}\0${value}`); const type = Buffer.from("tEXt"); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const chunk = Buffer.concat([length, type, data, crc]); const afterIhdr = 8 + 12 + png.readUInt32BE(8); return Buffer.concat([png.subarray(0, afterIhdr), chunk, png.subarray(afterIhdr)]);
}
function addExif(jpeg) {
  const payload = Buffer.from([0x45,0x78,0x69,0x66,0,0,0x49,0x49,0x2a,0,8,0,0,0,1,0,0x12,0x01,3,0,1,0,0,0,1,0,0,0,0,0,0,0]);
  const segment = Buffer.concat([Buffer.from([0xff, 0xe1, 0, payload.length + 2]), payload]); return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}
function addWebpXmp(webp, value) {
  const data = Buffer.from(value); const size = Buffer.alloc(4); size.writeUInt32LE(data.length); const chunk = Buffer.concat([Buffer.from("XMP "), size, data, ...(data.length % 2 ? [Buffer.from([0])] : [])]);
  const output = Buffer.concat([webp, chunk]); output.writeUInt32LE(output.length - 8, 4); return output;
}

try {
  for (const [locale, width, title] of [["ko",320,"사진 메타데이터 삭제"],["en",375,"Image Metadata Remover"],["ja",768,"写真メタデータ削除"],["ko",1024,"사진 메타데이터 삭제"],["en",1440,"Image Metadata Remover"]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage(); watch(page, `${locale}/${width}`);
    await page.goto(`${baseUrl}/${locale}/tools/image-metadata-remover`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("heading", { level: 1, name: title }).isVisible(), true);
    assert.equal(await page.getByRole("navigation", { name: /breadcrumb/i }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await context.close();
  }

  const marker = "PRIVATE_META_9f21";
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } }); const page = await context.newPage(); watch(page, "functional", marker);
  await page.goto(`${baseUrl}/ko/tools/image-metadata-remover`, { waitUntil: "domcontentloaded" });
  const cleanPng = await makeImage(page, "image/png", 360, 240, true); const png = addPngText(cleanPng, "Comment", marker);
  const jpeg = addExif(await makeImage(page, "image/jpeg"));
  const webp = addWebpXmp(await makeImage(page, "image/webp", 320, 200, true), marker);
  await page.locator("#metadata-image-files").setInputFiles([{ name: `${marker}.png`, mimeType: "image/png", buffer: png }, { name: "orientation.jpg", mimeType: "image/jpeg", buffer: jpeg }, { name: "sample.webp", mimeType: "image/webp", buffer: webp }]);
  await page.getByText("텍스트 정보", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText("EXIF", { exact: true }).waitFor();
  const exifCard = page.locator("article", { hasText: "orientation.jpg" });
  await exifCard.locator("details summary").click();
  assert.equal(await exifCard.locator("dt", { hasText: "Orientation" }).count(), 1);
  assert.equal(await exifCard.getByText("사진 표시·회전 방향", { exact: true }).count(), 1);
  await page.getByText("XMP", { exact: true }).waitFor();
  assert.equal(await page.getByRole("slider").inputValue(), "92"); await page.getByRole("slider").fill("80");
  await page.getByRole("button", { name: "메타데이터 삭제", exact: true }).click();
  await page.waitForTimeout(5000);
  const statuses = await page.locator('article p[role="status"], article p[role="alert"]').allTextContents(); assert.equal(statuses.filter(value => value.startsWith("삭제 확인됨")).length, 3, JSON.stringify(statuses));
  const oneDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "정리된 사진 다운로드" }).first().click(); const single = await oneDownload;
  assert.equal(single.suggestedFilename(), `${marker}-metadata-removed.png`);
  const singleBytes = await readFile(await single.path()); assert.equal(singleBytes.includes(Buffer.from("tEXt")), false); assert.equal(singleBytes.includes(Buffer.from(marker)), false);
  assert.ok(await page.evaluate(async bytes => { const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" })); const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1; const context = canvas.getContext("2d"); context.drawImage(bitmap, 0, 0, 1, 1); bitmap.close(); return context.getImageData(0, 0, 1, 1).data[3] < 255; }, [...singleBytes]), "PNG alpha should survive re-encoding");
  const zipButton = page.getByRole("button", { name: "전체 ZIP 다운로드" }); await page.waitForFunction(button => !button?.disabled, await zipButton.elementHandle());
  const zipDownload = page.waitForEvent("download"); await zipButton.click(); const zip = await zipDownload;
  assert.equal(zip.suggestedFilename(), "metadata-removed-images.zip"); const files = unzipSync(new Uint8Array(await readFile(await zip.path()))); assert.equal(Object.keys(files).length, 3); assert.equal(Object.values(files).every(bytes => !Buffer.from(bytes).includes(Buffer.from("Exif\0\0")) && !Buffer.from(bytes).includes(Buffer.from(marker))), true);
  assert.deepEqual(await page.evaluate(value => ({ url: location.href.includes(value), local: Object.values(localStorage).some(item => item.includes(value)), session: Object.values(sessionStorage).some(item => item.includes(value)) }), marker), { url: false, local: false, session: false });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await context.close();
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); assert.deepEqual(leaks, []);
  process.stdout.write(JSON.stringify({ formats: ["JPEG","PNG","WebP"], metadataDetection: ["EXIF","PNG text","WebP XMP"], alpha: "preserved", removalVerification: "PASS", downloads: ["single","ZIP"], locales: ["ko","en","ja"], viewports: [320,375,768,1024,1280,1440], privacyLeaks: 0, consoleErrors: 0, pageErrors: 0 }, null, 2));
} finally { await browser.close(); }
