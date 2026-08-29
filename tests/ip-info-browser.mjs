import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3110";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 900 }];
const label = {
  ko: { input: "IPv4 또는 IPv6 주소", lookup: "조회", copy: "IP 주소 복사", nav: "IP 정보 확인", private: /사설 네트워크/ },
  en: { input: "IPv4 or IPv6 address", lookup: "Look up", copy: "Copy IP address", nav: "IP Address Lookup", private: /private network/ },
  ja: { input: "IPv4またはIPv6アドレス", lookup: "検索", copy: "IPアドレスをコピー", nav: "IPアドレス情報", private: /プライベートネットワーク/ },
};
const responseFor = (ip, type = "IPv4") => ({ success: true, ip, type, continent: "North America", continent_code: "NA", country: "United States", country_code: "US", region: "California", city: "Mountain View", postal: "94043", latitude: 37.4, longitude: -122.1, calling_code: "1", connection: { asn: 15169, org: "Example Organization with a deliberately long but wrapping name", isp: "Example ISP" }, timezone: { id: "America/Los_Angeles" } });
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true }); const consoleErrors = []; const pageErrors = [];
try {
  for (const locale of locales) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] }); const page = await context.newPage(); const calls = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${viewport.width}: ${message.text()}`); }); page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
    await page.route("https://ipwho.is/**", async (route) => { const url = route.request().url(); calls.push(url); const encoded = url.slice("https://ipwho.is/".length); const ip = encoded ? decodeURIComponent(encoded) : "8.8.8.8"; await route.fulfill({ contentType: "application/json", body: JSON.stringify(responseFor(ip, ip.includes(":") ? "IPv6" : "IPv4")) }); });
    const pathname = `/${locale}/tools/ip-info`; await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("h1").count(), 1); assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
    for (const alternate of locales) assert.equal(new URL(await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).getAttribute("href")).pathname, `/${alternate}/tools/ip-info`);
    await page.getByText("8.8.8.8", { exact: true }).waitFor(); assert.equal(calls.length, 1);
    const input = page.getByRole("textbox", { name: label[locale].input }); await input.fill("192.168.0.1"); await page.getByRole("button", { name: label[locale].lookup, exact: true }).click(); await page.getByRole("alert").filter({ hasText: label[locale].private }).waitFor(); assert.equal(calls.length, 1);
    await input.fill("2001:4860:4860::8888"); await input.press("Enter"); await page.getByText("2001:4860:4860:0:0:0:0:8888", { exact: true }).waitFor(); assert.equal(calls.length, 2);
    await page.getByRole("button", { name: label[locale].copy }).last().click(); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "2001:4860:4860:0:0:0:0:8888");
    const overflow = await page.evaluate(() => ({ ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth, document: [document.documentElement.clientWidth, document.documentElement.scrollWidth], elements: [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 5).map((element) => [element.tagName, element.className, element.getBoundingClientRect().right]) })); assert.equal(overflow.ok, true, `${locale}/${viewport.width}: ${JSON.stringify(overflow)}`);
    if (locale === "ko" && viewport.width === 320) await page.screenshot({ path: "artifacts/ip-info-320-ko.png", fullPage: true });
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" }); const card = page.getByRole("link", { name: new RegExp(label[locale].nav) }).last(); assert.equal(new URL(await card.getAttribute("href"), baseUrl).pathname, pathname);
    await context.close();
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []);
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } }); const page = await context.newPage(); const realErrors = [];
  page.on("console", (message) => { if (message.type() === "error") realErrors.push(message.text()); }); page.on("pageerror", (error) => realErrors.push(error.message));
  const realBaseUrl = baseUrl.replace("127.0.0.1", "localhost"); await page.goto(`${realBaseUrl}/en/tools/ip-info`, { waitUntil: "networkidle", timeout: 20000 }); const realResultVisible = await page.getByText("Public IP address", { exact: true }).first().isVisible().catch(() => false); const realAlert = await page.getByRole("alert").last().textContent().catch(() => "none"); assert.equal(realResultVisible, true, `real provider failed: ${realAlert}; console=${JSON.stringify(realErrors)}`); assert.deepEqual(realErrors, []); await context.close();
  process.stdout.write(JSON.stringify({ locales, viewports: viewports.map((item) => `${item.width}x${item.height}`), mockedProviderCases: 15, realProviderSmoke: 1, consoleErrors: 0, pageErrors: 0, horizontalOverflow: 0 }, null, 2));
} finally { await browser.close(); }
