import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3017";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/ko`, { waitUntil: "networkidle" });
    assert.match(await page.title(), /브라우저에서 바로 쓰는 무료 업무 도구 \| Konly/);
    assert.equal(await page.getByRole("heading", { level: 1 }).innerText(), "업무 중 잠깐 필요한 작업을\n설치 없이, 브라우저에서 해결하세요");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    assert.equal(errors.length, 0, `${width}px console errors: ${errors.join(", ")}`);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  await page.goto(`${baseUrl}/ko`);
  assert.equal(await page.locator("#featured-tools article").count(), 0);
  assert.equal(await page.locator("#featured-tools a").count(), 6);
  await page.getByRole("searchbox", { name: "도구 검색" }).fill("HWP");
  assert.equal(await page.getByRole("link", { name: /HWP·HWPX 문서 뷰어/ }).count() > 0, true);
  const featuredHrefs = await page.locator("#featured-tools a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  for (const href of featuredHrefs) {
    const response = await page.request.get(new URL(href, baseUrl).toString());
    assert.equal(response.ok(), true, `broken featured link: ${href}`);
  }
  console.log("Korean home Phase 1 browser checks passed.");
} finally {
  await browser.close();
}
