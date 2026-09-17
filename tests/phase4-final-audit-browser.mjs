import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3018";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const sitemapResponse = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemapResponse.ok(), true);
  const sitemap = await sitemapResponse.text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length > 90, true, "expected localized public URLs");
  assert.equal(new Set(urls).size, urls.length, "duplicate sitemap URLs");

  const titles = new Map();
  const errors = [];
  for (const productionUrl of urls) {
    const path = new URL(productionUrl).pathname;
    page.removeAllListeners("pageerror");
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.ok(), true, `${path} failed`);
    assert.equal(await page.locator("h1").count(), 1, `${path} must have one H1`);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    assert.equal(Boolean(title.trim()), true, `${path} title`);
    assert.equal(Boolean(description?.trim()), true, `${path} description`);
    assert.equal(new URL(canonical ?? "", "https://www.konly.co.kr").pathname, path, `${path} canonical`);
    const locale = path.split("/")[1];
    const titleKey = `${locale}:${title}`;
    assert.equal(titles.has(titleKey), false, `duplicate title: ${titleKey} (${titles.get(titleKey)} and ${path})`);
    titles.set(titleKey, path);
  }
  assert.equal(errors.length, 0, `page errors:\n${errors.join("\n")}`);

  for (const path of ["/ko", "/ko/about", "/ko/guides", "/ko/updates", "/ko/contact", "/ko/privacy", "/ko/terms"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    const internalHrefs = await page.locator('main a[href^="/"]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("href")).filter(Boolean))]);
    for (const href of internalHrefs) {
      const response = await page.request.get(new URL(href, baseUrl).toString());
      assert.equal(response.ok(), true, `broken link on ${path}: ${href}`);
    }
  }

  const mobile = await browser.newPage({ viewport: { width: 320, height: 800 } });
  for (const path of ["/ko", "/ko/about", "/ko/guides/check-personal-information-before-selling-photos", "/ko/tools/hwp-hwpx-viewer", "/ko/tools/privacy-redactor", "/ko/tools/screenshot-stitcher", "/ko/tools/image-metadata-remover", "/ko/tools/screenshot-statusbar-remover", "/ko/tools/excel-chart-maker"]) {
    await mobile.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} mobile overflow`);
  }

  const ads = (await (await page.request.get(`${baseUrl}/ads.txt`)).text()).trim();
  assert.equal(ads, "google.com, pub-7746620546474816, DIRECT, f08c47fec0942fa0");
  assert.doesNotMatch(await (await page.request.get(`${baseUrl}/sitemap.xml`)).text(), /p2p-file-transfer|\/t\//);
  console.log(`Phase 4 audit passed for ${urls.length} indexable URLs.`);
} finally {
  await browser.close();
}
