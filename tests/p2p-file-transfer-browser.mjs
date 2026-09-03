import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3002";
const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
const watch = (page, name) => {
  page.on("console", message => { if (message.type() === "error") errors.push(`${name}: ${message.text()}`); });
  page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
};

try {
  const senderContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const receiverContext = await browser.newContext({ viewport: { width: 375, height: 812 }, acceptDownloads: true });
  await receiverContext.addInitScript(() => { try { delete window.showSaveFilePicker; } catch {} });
  const sender = await senderContext.newPage(), receiver = await receiverContext.newPage();
  watch(sender, "sender"); watch(receiver, "receiver");

  await sender.goto(`${baseUrl}/ko/tools/p2p-file-transfer`, { waitUntil: "networkidle" });
  assert.equal(await sender.locator('meta[name="description"]').count(), 1);
  const payload = Buffer.from("Konly P2P round trip\n안녕하세요\nこんにちは\n😀🚀\n".repeat(3000));
  await sender.locator('input[type="file"]').setInputFiles({ name: "qa-한글.txt", mimeType: "text/plain", buffer: payload });
  await sender.getByRole("button", { name: "공유 링크 만들기" }).click();
  const shareInput = sender.locator('input[readonly]');
  await shareInput.waitFor();
  const shareUrl = await shareInput.inputValue();
  assert.match(shareUrl, /\/ko\/t\/[A-Za-z0-9_-]{22,64}$/);

  await receiver.goto(shareUrl, { waitUntil: "domcontentloaded" });
  await sender.getByText(/연결되었습니다/).waitFor({ timeout: 15_000 });
  await sender.getByRole("button", { name: "전송 허용" }).click();
  await receiver.getByText("qa-한글.txt").waitFor({ timeout: 15_000 });
  const downloadPromise = receiver.waitForEvent("download", { timeout: 30_000 });
  await receiver.getByRole("button", { name: "파일 받기" }).click();
  const download = await downloadPromise;
  const downloaded = await readFile(await download.path());
  assert.equal(createHash("sha256").update(downloaded).digest("hex"), createHash("sha256").update(payload).digest("hex"));
  await receiver.getByText(/완료되었습니다/).waitFor({ timeout: 15_000 });
  await sender.getByText(/완료되었습니다/).waitFor({ timeout: 15_000 });
  assert.equal(await receiver.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

  for (const [locale, width] of [["en", 320], ["ja", 768]]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } }); watch(page, locale);
    await page.goto(`${baseUrl}/${locale}/tools/p2p-file-transfer`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator('input[type="file"]').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.close();
  }

  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ transferBytes: payload.length, sha256: true, senderComplete: true, receiverComplete: true, mobileWidths: [320, 375, 768], consoleErrors: 0, pageErrors: 0 }, null, 2));
  await senderContext.close(); await receiverContext.close();
} finally {
  await browser.close();
}
