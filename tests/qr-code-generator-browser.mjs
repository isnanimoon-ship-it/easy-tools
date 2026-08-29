import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3108";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 900 }];
const labels = {
  ko: { input: "QR 코드에 넣을 내용", size: /출력 크기/, level: /오류 복원 수준/, margin: /Quiet Zone 여백/, download: "PNG 다운로드", copy: "입력값 복사", clear: "초기화", nav: "QR 코드 생성기", url: "URL", text: "텍스트" },
  en: { input: "Content to encode", size: /Output size/, level: /Error correction level/, margin: /Quiet Zone margin/, download: "Download PNG", copy: "Copy input", clear: "Clear", nav: "QR Code Generator", url: "URL", text: "Text" },
  ja: { input: "QRコードに入れる内容", size: /出力サイズ/, level: /誤り訂正レベル/, margin: /Quiet Zoneの余白/, download: "PNGをダウンロード", copy: "入力値をコピー", clear: "クリア", nav: "QRコード生成", url: "URL", text: "テキスト" },
};
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = []; const pageErrors = [];

async function waitForQr(page) { await page.locator("canvas.block").waitFor({ timeout: 10000 }); }
async function decode(page) {
  return page.locator("canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d", { willReadFrequently: true }); const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return globalThis.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  });
}
async function generate(page, label, input) { await page.getByRole("textbox", { name: label.input }).fill(input); await waitForQr(page); assert.equal(await decode(page), input); }

try {
  for (const locale of locales) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, acceptDownloads: true }); const page = await context.newPage(); const label = labels[locale]; const requests = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${viewport.width}: ${message.text()}`); });
    page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`)); page.on("request", (request) => requests.push(`${request.url()} ${request.postData() ?? ""}`));
    const pathname = `/${locale}/tools/qr-code-generator`; await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" }); await page.addScriptTag({ path: "node_modules/jsqr/dist/jsQR.js" });
    assert.equal(await page.locator("h1").count(), 1); assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
    for (const alternate of locales) assert.equal(new URL(await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).getAttribute("href")).pathname, `/${alternate}/tools/qr-code-generator`);
    const input = page.getByRole("textbox", { name: label.input }); const download = page.getByRole("button", { name: label.download });
    assert.equal(await download.isDisabled(), true); assert.equal(await page.getByRole("button", { name: label.copy }).isDisabled(), true);
    await generate(page, label, "Hello World"); assert.equal(await page.locator("canvas").getAttribute("width"), "256"); assert.equal(await page.locator("dd").getByText(label.text, { exact: true }).count(), 1);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert.ok(dimensions.scroll <= dimensions.width);
    assert.ok((await page.locator("button, textarea, select").evaluateAll((nodes) => nodes.filter((node) => node.offsetParent !== null).map((node) => node.getBoundingClientRect().height))).every((height) => height >= 44));
    const visibleHeaderItems = await page.locator("header a, header select").evaluateAll((nodes) => nodes.filter((node) => node.offsetParent !== null).map((node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));
    for (let i = 0; i < visibleHeaderItems.length; i++) for (let j = i + 1; j < visibleHeaderItems.length; j++) { const a = visibleHeaderItems[i], b = visibleHeaderItems[j]; assert.ok(!(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)); }

    if (locale === "ko" && viewport.width === 375) {
      for (const value of ["Hello World", "안녕하세요", "こんにちは", "Hello 😀🚀", "https://example.com", "https://example.com/search?q=hello&sort=new", "line 1\nline 2", "!@#$%^&*()", "  exact spaces\n"]) await generate(page, label, value);
      await generate(page, label, "https://example.com"); assert.equal(await page.locator("dd").getByText(label.url, { exact: true }).count(), 1); await generate(page, label, "example.com"); assert.equal(await page.locator("dd").getByText(label.text, { exact: true }).count(), 1);
      for (const level of ["L", "M", "Q", "H"]) { await page.getByRole("combobox", { name: label.level }).selectOption(level); await waitForQr(page); assert.equal(await decode(page), "example.com"); }
      for (const margin of ["4", "6", "8"]) { await page.getByRole("combobox", { name: label.margin }).selectOption(margin); await waitForQr(page); assert.equal(await decode(page), "example.com"); }
      for (const size of ["128", "256", "512", "1024"]) { await page.getByRole("combobox", { name: label.size }).selectOption(size); await waitForQr(page); assert.equal(await page.locator("canvas").getAttribute("width"), size); assert.equal(await decode(page), "example.com"); }
      const downloadPromise = page.waitForEvent("download"); await download.click(); const file = await downloadPromise; assert.equal(file.suggestedFilename(), "qr-code.png");
      await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl }); await page.getByRole("button", { name: label.copy }).click(); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "example.com");
      await page.getByRole("combobox", { name: label.size }).selectOption("128"); await input.fill("a".repeat(500)); await page.locator("#qr-code-error").waitFor(); assert.match(await page.locator("#qr-code-error").textContent(), /크기/);
      await page.getByRole("combobox", { name: label.size }).selectOption("1024"); await input.fill("a".repeat(850)); await waitForQr(page); assert.equal(await page.getByText(/스캔하기 어려울 수 있습니다/).count(), 1);
      await input.fill("😀".repeat(2000)); await page.locator("#qr-code-error").waitFor(); assert.match(await page.locator("#qr-code-error").textContent(), /너무 깁니다/);
      await input.fill(""); assert.equal(await page.locator("canvas.block").count(), 0); assert.equal(await page.locator("#qr-code-error").count(), 0);
      const marker = "QR_PRIVATE_MARKER_7e31"; await generate(page, label, marker); assert.equal(requests.some((request) => request.includes(marker)), false);
      const stored = await page.evaluate(() => JSON.stringify({ url: location.href, local: Object.values(localStorage), session: Object.values(sessionStorage), cookie: document.cookie })); assert.equal(stored.includes(marker), false);
      await page.getByRole("button", { name: label.clear }).click(); assert.equal(await input.inputValue(), ""); assert.equal(await input.evaluate((node) => node === document.activeElement), true); assert.equal(await page.getByRole("combobox", { name: label.size }).inputValue(), "256");
      await page.screenshot({ path: "artifacts/qr-code-generator-375.png", fullPage: true });
    }
    if (locale === "ja" && viewport.width === 1280) await page.screenshot({ path: "artifacts/qr-code-generator-1280-ja.png", fullPage: true });
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" }); const card = page.getByRole("link", { name: new RegExp(label.nav) }).last(); assert.equal(new URL(await card.getAttribute("href"), baseUrl).pathname, pathname); await Promise.all([page.waitForURL(`**${pathname}`), card.click()]);
    await context.close();
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); process.stdout.write(JSON.stringify({ locales, viewports: viewports.map(({ width, height }) => `${width}x${height}`), consoleErrors: 0, pageErrors: 0 }, null, 2));
} finally { await browser.close(); }
