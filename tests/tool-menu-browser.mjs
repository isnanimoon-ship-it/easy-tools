import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3114";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const cases = [
  ["ko", 320, "도구", "전체 도구"], ["en", 375, "Tools", "All tools"], ["ja", 768, "ツール", "すべてのツール"], ["ko", 1280, "도구", "전체 도구"],
];
const consoleErrors = []; const pageErrors = [];
try {
  for (const [locale, width, trigger, heading] of cases) {
    const context = await browser.newContext({ viewport: { width, height: 800 } }); const page = await context.newPage();
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${width}: ${message.text()}`); }); page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" }); assert.equal(await page.getByRole("link", { name: /home|홈|ホーム/i }).count(), 1);
    await page.getByText(trigger, { exact: true }).click(); const menu = page.getByRole("navigation", { name: /도구 메뉴|Tools menu|ツールメニュー/ }); await menu.waitFor(); assert.equal(await menu.getByRole("link").count(), 9); assert.equal(await page.getByText(heading, { exact: true }).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    if (width === 1280) await page.screenshot({ path: "artifacts/tool-menu-1280-ko.png" });
    await context.close();
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); process.stdout.write(JSON.stringify({ cases: cases.length, links: 9, consoleErrors: 0, pageErrors: 0, horizontalOverflow: 0 }, null, 2));
} finally { await browser.close(); }
