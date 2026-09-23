import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3022";
const fixtures = ["tests/.tmp-gif-red.png", "tests/.tmp-gif-blue.png"];
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

function countFrames(bytes) {
  let offset = 6;
  const packed = bytes[offset + 4];
  offset += 7;
  if (packed & 0x80) offset += 3 * (2 ** ((packed & 0x07) + 1));
  let frames = 0;
  while (offset < bytes.length) {
    const marker = bytes[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      offset += 1;
      while (offset < bytes.length) { const size = bytes[offset++]; if (!size) break; offset += size; }
      continue;
    }
    if (marker !== 0x2c) throw new Error(`Unexpected GIF block: ${marker}`);
    frames += 1;
    const imagePacked = bytes[offset + 8];
    offset += 9;
    if (imagePacked & 0x80) offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
    offset += 1;
    while (offset < bytes.length) { const size = bytes[offset++]; if (!size) break; offset += size; }
  }
  return frames;
}

try {
  for (let index = 0; index < fixtures.length; index += 1) {
    const page = await browser.newPage({ viewport: { width: 160, height: 120 } });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:${index ? "#2563eb" : "#ef4444"}}</style>`);
    await page.screenshot({ path: fixtures[index] });
    await page.close();
  }

  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/ko/tools/animated-gif-maker`, { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles(fixtures);
    await page.getByRole("button", { name: "GIF 만들기" }).click();
    await page.getByRole("heading", { name: "완성된 GIF" }).waitFor({ timeout: 30_000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    assert.deepEqual(errors, [], `${width}px page errors`);
    if (width === 768) {
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "GIF 다운로드" }).click();
      const download = await downloadPromise;
      const path = await download.path();
      const bytes = await readFile(path);
      assert.equal(bytes.subarray(0, 6).toString("ascii"), "GIF89a");
      assert.equal(countFrames(bytes), 2);
      assert.equal(download.suggestedFilename(), "animated-images.gif");
    }
    await page.close();
  }
  console.log("Animated GIF browser checks passed.");
} finally {
  await browser.close();
  await Promise.all(fixtures.map(path => unlink(path).catch(() => {})));
}
