import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, permissions: ["clipboard-read", "clipboard-write"] });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://localhost:3016/ko/tools/json-formatter");
  await page.evaluate(() => {
    window.open = url => { window.__lastShareUrl = url; return null; };
    navigator.share = async data => { window.__lastNativeShare = data; };
  });
  await page.getByRole("button", { name: "링크 복사" }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "http://localhost:3016/ko/tools/json-formatter");
  await page.getByRole("button", { name: "X" }).click();
  assert.equal(new URL(await page.evaluate(() => window.__lastShareUrl)).searchParams.get("url"), "http://localhost:3016/ko/tools/json-formatter");
  await page.getByRole("button", { name: "다른 앱" }).click();
  assert.equal((await page.evaluate(() => window.__lastNativeShare)).url, "http://localhost:3016/ko/tools/json-formatter");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator("section[aria-label='공유'] button").count(), 4);
  await page.goto("http://localhost:3016/en/tools/image-compressor");
  assert.equal(await page.locator("section[aria-label='Share']").count(), 1);
  await page.goto("http://localhost:3016/ko/tools/p2p-file-transfer");
  assert.equal(await page.locator("section[aria-label='공유']").count(), 0);
  assert.deepEqual(errors, []);
  console.log("Share bar browser checks passed (copy, i18n, 320px, private session exclusion, console).");
} finally {
  await browser.close();
}
