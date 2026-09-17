import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3018";
const guideSlugs = ["check-personal-information-before-selling-photos", "work-screenshot-sharing-checklist", "hwp-hwpx-web-viewer-limitations", "stitch-mobile-screenshots"];
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const path of ["/ko", "/ko/about", "/ko/guides", "/ko/updates", "/ko/contact?tool=/tools/hwp-hwpx-viewer", ...guideSlugs.map(slug => `/ko/guides/${slug}`)]) {
      const errors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", error => errors.push(error.message));
      const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      assert.equal(response?.ok(), true, `${path} did not load`);
      assert.equal(await page.locator("h1").count(), 1, `${path} H1 count`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} ${width}px overflow`);
      assert.equal(errors.length, 0, `${path} page errors: ${errors.join(", ")}`);
    }
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  await page.goto(`${baseUrl}/ko/contact?tool=/tools/hwp-hwpx-viewer`, { waitUntil: "networkidle" });
  assert.equal(await page.getByLabel("관련 도구").inputValue(), "/tools/hwp-hwpx-viewer");
  await page.getByLabel("문제 설명").fill("문서가 열리지 않습니다.");
  const mailto = await page.getByRole("link", { name: "이메일 작성 화면 열기" }).getAttribute("href");
  assert.match(mailto ?? "", /^mailto:isnanik@daum\.net/);
  assert.match(decodeURIComponent(mailto ?? ""), /문서가 열리지 않습니다/);

  await page.goto(`${baseUrl}/ko/tools/privacy-redactor`, { waitUntil: "networkidle" });
  assert.equal(await page.getByRole("heading", { name: "더 알아보기" }).count(), 1);
  assert.equal(await page.getByRole("link", { name: /중고거래 사진을 올리기 전에/ }).count(), 1);
  assert.match(await page.getByRole("link", { name: "오류 제보하기" }).getAttribute("href"), /contact\?tool=/);

  await page.goto(`${baseUrl}/ko/guides/${guideSlugs[0]}`, { waitUntil: "networkidle" });
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://www.konly.co.kr/ko/guides/${guideSlugs[0]}`);
  assert.equal(await page.locator('link[rel="alternate"]').count(), 0);

  const sitemap = await (await page.request.get(`${baseUrl}/sitemap.xml`)).text();
  for (const slug of guideSlugs) assert.match(sitemap, new RegExp(`/ko/guides/${slug}`));
  assert.doesNotMatch(sitemap, /\/en\/guides\//);
  assert.match(sitemap, /\/ko\/updates/);
  console.log("Phase 3 trust and content browser checks passed.");
} finally {
  await browser.close();
}
