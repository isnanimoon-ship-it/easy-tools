import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3021";
const fixture = "tests/.tmp-watermark-source.png";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  const maker = await browser.newPage({ viewport: { width: 640, height: 400 } });
  await maker.setContent("<style>html,body{margin:0;width:100%;height:100%;background:linear-gradient(135deg,#2563eb,#16a34a)}</style>");
  await maker.screenshot({ path: fixture });
  await maker.close();

  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/ko/tools/image-watermark`, { waitUntil: "networkidle" });
    await page.locator("#watermark-base").setInputFiles(fixture);
    await page.getByLabel("워터마크 텍스트").fill("Konly 테스트");
    await page.getByRole("button", { name: "워터마크 적용" }).click();
    await page.getByRole("heading", { name: "완성된 이미지" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    assert.equal(errors.length, 0, `${width}px page errors: ${errors.join(", ")}`);
    if (width === 768) {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "다운로드" }).click();
      assert.match((await download).suggestedFilename(), /-watermarked\.png$/);
      await page.getByRole("button", { name: "이미지", exact: true }).click();
      await page.locator("#watermark-logo").setInputFiles(fixture);
      await page.getByRole("button", { name: "워터마크 적용" }).click();
      await page.getByRole("heading", { name: "완성된 이미지" }).waitFor();
    }
    await page.close();
  }
  console.log("Image watermark browser checks passed.");
} finally {
  await browser.close();
  await unlink(fixture).catch(() => {});
}
