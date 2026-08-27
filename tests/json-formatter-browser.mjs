import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3101";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }];
const names = {
  ko: { input: "JSON 편집기", format: "정리", minify: "압축", copy: "복사", clear: "초기화", invalid: "올바른 JSON이 아닙니다." },
  en: { input: "JSON editor", format: "Format", minify: "Minify", copy: "Copy", clear: "Clear", invalid: "This is not valid JSON." },
  ja: { input: "JSONエディター", format: "整形", minify: "圧縮", copy: "コピー", clear: "クリア", invalid: "有効なJSONではありません。" },
};

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = [];
const pageErrors = [];
const leakedRequests = [];
let formatPerformanceMs;
let minifyPerformanceMs;

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${viewport.width}: ${message.text()}`); });
      page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
      page.on("request", (request) => {
        if (`${request.url()} ${request.postData() ?? ""}`.includes("QA_PRIVATE_JSON_7f3c")) leakedRequests.push(request.url());
      });

      const pathname = `/${locale}/tools/json-formatter`;
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
      for (const alternateLocale of locales) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${alternateLocale}"]`).getAttribute("href");
        assert.equal(new URL(href).pathname, `/${alternateLocale}/tools/json-formatter`);
      }

      const input = page.getByRole("textbox", { name: names[locale].input });
      const format = page.getByRole("button", { name: names[locale].format });
      const minify = page.getByRole("button", { name: names[locale].minify });
      const copy = page.getByRole("button", { name: names[locale].copy });
      const clear = page.getByRole("button", { name: names[locale].clear });
      for (const action of [format, minify, copy, clear]) assert.equal(await action.isDisabled(), true);

      await input.fill(" \n\u3000");
      for (const action of [format, minify, copy]) assert.equal(await action.isDisabled(), true);
      assert.equal(await clear.isEnabled(), true);
      await clear.click();
      assert.equal(await input.evaluate((element) => element === document.activeElement), true);

      const source = '{"private":"QA_PRIVATE_JSON_7f3c","large":9007199254740993,"duplicate":1,"duplicate":1e+3,"escaped":"\\uAC00","nested":[true,null,{}]}';
      await input.fill(source);
      await format.click();
      const formatted = await input.inputValue();
      assert.ok(formatted.includes('"large": 9007199254740993'));
      assert.ok(formatted.includes('"duplicate": 1e+3'));
      assert.ok(formatted.includes('"escaped": "\\uAC00"'));
      assert.equal(formatted.endsWith("\n"), false);
      await minify.click();
      assert.equal(await input.inputValue(), source);

      const invalid = '{\n  "a": 1,\n  "b" 2\n}';
      await input.fill(invalid);
      await format.click();
      assert.equal(await input.inputValue(), invalid);
      assert.ok((await page.locator("#json-formatter-error").textContent()).includes(names[locale].invalid));
      await input.fill("{}");
      assert.equal(await page.locator("#json-formatter-error").count(), 0);

      const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `horizontal overflow at ${locale}/${viewport.width}`);

      if (locale === "ko" && viewport.width === 375) {
        await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
        await input.fill('{ "copy": "exact" }');
        await copy.click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '{ "copy": "exact" }');

        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
        await copy.click();
        assert.equal(await page.locator("#json-formatter-error").count(), 1);
        assert.equal(await input.inputValue(), '{ "copy": "exact" }');

        const megabyteJson = JSON.stringify({ data: "x".repeat(1024 * 1024) });
        await input.fill(megabyteJson);
        formatPerformanceMs = await page.evaluate(async (buttonName) => {
          const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent === buttonName);
          const textarea = document.querySelector("textarea");
          const before = textarea.value;
          const start = performance.now();
          button.click();
          while (textarea.value === before) await new Promise(requestAnimationFrame);
          return performance.now() - start;
        }, names.ko.format);
        minifyPerformanceMs = await page.evaluate(async (buttonName) => {
          const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent === buttonName);
          const textarea = document.querySelector("textarea");
          const before = textarea.value;
          const start = performance.now();
          button.click();
          while (textarea.value === before) await new Promise(requestAnimationFrame);
          return performance.now() - start;
        }, names.ko.minify);
        assert.ok(formatPerformanceMs < 250, `1MB format took ${formatPerformanceMs.toFixed(1)}ms`);
        assert.ok(minifyPerformanceMs < 250, `1MB minify took ${minifyPerformanceMs.toFixed(1)}ms`);

        await context.setOffline(true);
        await input.fill('{"offline":true}');
        await format.click();
        assert.ok((await input.inputValue()).includes("\n"));
        await minify.click();
        assert.equal(await input.inputValue(), '{"offline":true}');
        await clear.click();
        await context.setOffline(false);
        await page.screenshot({ path: "artifacts/json-formatter-375.png", fullPage: true });
      }

      if (locale === "ja" && viewport.width === 1280) await page.screenshot({ path: "artifacts/json-formatter-1280-ja.png", fullPage: true });

      await page.goto(`${baseUrl}/${locale}`);
      await page.goto(`${baseUrl}${pathname}`);
      await page.goBack({ waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, `/${locale}`);
      await page.goForward();
      assert.equal(new URL(page.url()).pathname, pathname);
      await context.close();
    }
  }

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(leakedRequests, []);
  process.stdout.write(JSON.stringify({ locales, viewports: viewports.map(({ width, height }) => `${width}x${height}`), consoleErrors: 0, pageErrors: 0, leakedRequests: 0, formatPerformanceMs, minifyPerformanceMs }, null, 2));
} finally {
  await browser.close();
}
