import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3105";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 900 }];
const labels = {
  ko: { input: "YouTube 영상 주소 또는 ID", extract: "썸네일 추출", clear: "초기화", nav: "유튜브 썸네일", unavailable: "이 영상에서는 제공되지 않음", open: "이미지 열기", save: "저장" },
  en: { input: "YouTube video URL or ID", extract: "Extract thumbnails", clear: "Clear", nav: "YouTube Thumbnail Downloader", unavailable: "Not available for this video", open: "Open image", save: "Download" },
  ja: { input: "YouTube動画URLまたはID", extract: "サムネイルを抽出", clear: "クリア", nav: "YouTubeサムネイル", unavailable: "この動画では利用できません", open: "画像を開く", save: "保存" },
};

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = []; const pageErrors = [];

async function extract(page, label, value) {
  const input = page.getByRole("textbox", { name: label.input });
  await input.fill(value);
  await page.getByRole("button", { name: label.extract, exact: true }).click();
  await page.getByText("dQw4w9WgXcQ", { exact: true }).waitFor();
  await page.getByRole("link", { name: label.open }).first().waitFor({ timeout: 15000 });
}

try {
  for (const locale of locales) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage(); const label = labels[locale];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${viewport.width}: ${message.text()} [${message.location().url}]`); });
    page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
    const pathname = `/${locale}/tools/youtube-thumbnail-downloader`;
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
    for (const alternate of locales) assert.equal(new URL(await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).getAttribute("href")).pathname, `/${alternate}/tools/youtube-thumbnail-downloader`);
    const input = page.getByRole("textbox", { name: label.input });
    assert.equal(await page.getByRole("button", { name: label.extract, exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: label.clear, exact: true }).isDisabled(), true);
    await extract(page, label, "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5&list=PLtest#share");
    assert.ok((await page.getByRole("link", { name: label.open }).count()) >= 3);
    assert.equal(await page.locator("img").first().evaluate((img) => img.naturalWidth >= 1280 && img.naturalHeight >= 720), true);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width);
    assert.ok((await page.locator("button, input, a[target='_blank']").evaluateAll((nodes) => nodes.filter((node) => node.offsetParent !== null).map((node) => node.getBoundingClientRect().height))).every((height) => height >= 44));
    if (locale === "ko" && viewport.width === 375) {
      for (const value of [
        "https://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=mobile", "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
        "https://youtube.com/live/dQw4w9WgXcQ", "http://m.youtube.com/watch?v=dQw4w9WgXcQ", "youtube.com/embed/dQw4w9WgXcQ", "　https://youtu.be/dQw4w9WgXcQ\n",
      ]) await extract(page, label, value);
      for (const invalid of ["%", "https://youtube.com/channel/example", "https://youtube.com/playlist?list=PL1", "https://example.com/watch?v=dQw4w9WgXcQ"]) {
        await input.fill(invalid); await page.getByRole("button", { name: label.extract, exact: true }).click(); assert.equal(await page.locator("#youtube-thumbnail-error").count(), 1);
      }
      await input.fill("   "); assert.equal(await page.getByRole("button", { name: label.extract, exact: true }).isDisabled(), true); assert.equal(await page.locator("#youtube-thumbnail-error").count(), 0);
      await input.fill("https://youtu.be/jNQXAC9IVRw"); await page.getByRole("button", { name: label.extract, exact: true }).click(); await page.getByText("jNQXAC9IVRw", { exact: true }).waitFor(); await page.getByText(label.unavailable, { exact: true }).first().waitFor({ timeout: 15000 });
      assert.ok((await page.getByText(label.unavailable, { exact: true }).count()) >= 2);
      await extract(page, label, "https://youtu.be/dQw4w9WgXcQ");
      const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: label.save, exact: true }).first().click(); const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^youtube-dQw4w9WgXcQ-(max|sd|hq|mq|default)\.jpg$/);
      await page.getByRole("button", { name: label.clear, exact: true }).click(); assert.equal(await input.inputValue(), ""); assert.equal(await input.evaluate((node) => node === document.activeElement), true);
      await page.screenshot({ path: "artifacts/youtube-thumbnail-downloader-375.png", fullPage: true });
    }
    if (locale === "ja" && viewport.width === 1280) await page.screenshot({ path: "artifacts/youtube-thumbnail-downloader-1280-ja.png", fullPage: true });
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
    const card = page.getByRole("link", { name: new RegExp(label.nav) }).last(); assert.equal(new URL(await card.getAttribute("href"), baseUrl).pathname, pathname);
    await Promise.all([page.waitForURL(`**${pathname}`), card.click()]);
    await context.close();
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({ locales, viewports: viewports.map(({ width, height }) => `${width}x${height}`), consoleErrors: 0, pageErrors: 0 }, null, 2));
} finally { await browser.close(); }
