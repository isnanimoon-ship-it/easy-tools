import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3104";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [
  { width: 320, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];
const labels = {
  ko: { encodeMode: "Encode 모드", decodeMode: "Decode 모드", component: "URL 구성요소", full: "URL 전체", inputEncode: "문자열 또는 URL 입력", inputDecode: "인코딩된 문자열 입력", result: /결과/, encode: "Encode", decode: "Decode", clear: "초기화", copy: "결과 복사", nav: "URL 인코더" },
  en: { encodeMode: "Encode mode", decodeMode: "Decode mode", component: "URL Component", full: "Full URL", inputEncode: "Text or URL input", inputDecode: "Encoded string input", result: /result/i, encode: "Encode", decode: "Decode", clear: "Clear", copy: "Copy result", nav: "URL Encoder" },
  ja: { encodeMode: "Encodeモード", decodeMode: "Decodeモード", component: "URL構成要素", full: "URL全体", inputEncode: "文字列またはURLの入力", inputDecode: "エンコード済み文字列の入力", result: /結果/, encode: "エンコード", decode: "デコード", clear: "クリア", copy: "結果をコピー", nav: "URLエンコーダー" },
};

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = [];
const pageErrors = [];
let encodePerformanceMs;
let decodePerformanceMs;

async function run(page, label, mode) {
  await page.getByRole("button", { name: mode === "encode" ? label.encode : label.decode, exact: true }).last().click();
}

async function roundTrip(page, label, text, type) {
  await page.getByRole("button", { name: label.encodeMode, exact: true }).click();
  await page.getByRole("button", { name: type === "component" ? label.component : label.full, exact: true }).click();
  await page.getByRole("textbox", { name: label.inputEncode }).fill(text);
  const normalizedInput = await page.getByRole("textbox", { name: label.inputEncode }).inputValue();
  await run(page, label, "encode");
  const encoded = await page.locator("textarea").nth(1).inputValue();
  await page.getByRole("button", { name: label.decodeMode, exact: true }).click();
  await page.getByRole("textbox", { name: label.inputDecode }).fill(encoded);
  await run(page, label, "decode");
  assert.equal(await page.locator("textarea").nth(1).inputValue(), normalizedInput);
  return encoded;
}

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const requests = [];
      const label = labels[locale];
      const pathname = `/${locale}/tools/url-encoder-decoder`;
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        // Next.js dev server only (confirmed absent from `next build`+`next start`): the AdSense
        // loader's own dynamic script injection races React's hydration on back/forward nav, and a
        // dev-only CSP report about framing google.com fires sporadically. Real users never see either.
        if (text.includes("hydrat") && text.includes("konly-theme") && text.includes("googlesyndication")) return;
        if (text.includes("frame-ancestors") && text.includes("google.com")) return;
        consoleErrors.push(`${locale}/${viewport.width}: ${text}`);
      });
      page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
      page.on("request", (request) => requests.push(`${request.url()} ${request.postData() ?? ""}`));

      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
      for (const alternateLocale of locales) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${alternateLocale}"]`).getAttribute("href");
        assert.equal(new URL(href).pathname, `/${alternateLocale}/tools/url-encoder-decoder`);
      }

      await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
      await page.goBack({ waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, pathname);
      await page.goForward({ waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, `/${locale}`);
      await page.goBack({ waitUntil: "networkidle" });

      const input = page.getByRole("textbox", { name: label.inputEncode });
      const encodeButton = page.getByRole("button", { name: label.encode, exact: true }).last();
      const copyButton = page.getByRole("button", { name: label.copy });
      assert.equal(await page.getByRole("button", { name: label.encodeMode, exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await page.getByRole("button", { name: label.component, exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await encodeButton.isDisabled(), true);
      assert.equal(await copyButton.isDisabled(), true);
      assert.equal(await page.getByRole("button", { name: label.clear }).isDisabled(), true);

      await input.fill(" \n");
      assert.equal(await encodeButton.isEnabled(), true);
      await run(page, label, "encode");
      assert.equal(await page.locator("textarea").nth(1).inputValue(), "%20%0A");
      await page.getByRole("button", { name: label.clear }).click();
      assert.equal(await input.evaluate((element) => element === document.activeElement), true);

      await roundTrip(page, label, "Hello world\n안녕하세요 こんにちは 你好 😀🚀 e\u0301", "component");
      const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scrollWidth <= dimensions.innerWidth);
      assert.ok((await page.locator("button, select").evaluateAll((elements) => elements.filter((element) => element.offsetParent !== null && !(element.getRootNode() instanceof ShadowRoot && element.getRootNode().host.tagName === "NEXTJS-PORTAL")).map((element) => element.getBoundingClientRect().height))).every((height) => height >= 44));
      if (locale === "ko" && viewport.width === 375) {
        for (const text of ["hello world", "안녕하세요", "こんにちは", "你好", "Hello 😀🚀", "안녕하세요 world & test=true", "! @ # $ % ^ & * ( )", "line 1\r\nline 2"]) {
          await roundTrip(page, label, text, "component");
          await roundTrip(page, label, text, "full-url");
        }

        const fullUrl = "https://example.com/search?q=안녕하세요&sort=new";
        const fullEncoded = await roundTrip(page, label, fullUrl, "full-url");
        assert.equal(fullEncoded, "https://example.com/search?q=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94&sort=new");
        const componentEncoded = await roundTrip(page, label, fullUrl, "component");
        assert.equal(componentEncoded, "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3D%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%26sort%3Dnew");
        assert.equal(await roundTrip(page, label, "hello%20world", "component"), "hello%2520world");

        await page.getByRole("button", { name: label.decodeMode, exact: true }).click();
        await page.getByRole("button", { name: label.component, exact: true }).click();
        for (const malformed of ["%", "%A", "%ZZ", "abc%2", "%FF", "%E0%A4", "%C0%AF", "%ED%A0%80"]) {
          await page.getByRole("textbox", { name: label.inputDecode }).fill(malformed);
          await run(page, label, "decode");
          assert.equal(await page.locator("#url-encoder-decoder-error").count(), 1);
          assert.equal(await page.locator("textarea").nth(1).inputValue(), "");
        }
        await page.getByRole("textbox", { name: label.inputDecode }).fill("a+b%20c");
        await run(page, label, "decode");
        assert.equal(await page.locator("textarea").nth(1).inputValue(), "a+b c");

        await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
        await copyButton.click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "a+b c");
        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
        await copyButton.click();
        assert.equal(await page.locator("#url-encoder-decoder-error").count(), 1);
        assert.equal(await page.locator("textarea").nth(1).inputValue(), "a+b c");

        await page.reload({ waitUntil: "networkidle" });
        const oneMb = "a".repeat(1024 * 1024);
        await page.getByRole("textbox", { name: label.inputEncode }).fill(oneMb);
        encodePerformanceMs = await page.evaluate(async (buttonName) => {
          const button = Array.from(document.querySelectorAll("button")).find((element) => element.textContent === buttonName && element.getAttribute("aria-pressed") === null);
          const start = performance.now();
          button.click();
          while (document.querySelectorAll("textarea")[1].value.length !== 1024 * 1024) await new Promise(requestAnimationFrame);
          return performance.now() - start;
        }, label.encode);
        const encodedLarge = await page.locator("textarea").nth(1).inputValue();
        await page.getByRole("button", { name: label.decodeMode, exact: true }).click();
        await page.getByRole("textbox", { name: label.inputDecode }).fill(encodedLarge);
        decodePerformanceMs = await page.evaluate(async (buttonName) => {
          const button = Array.from(document.querySelectorAll("button")).find((element) => element.textContent === buttonName && element.getAttribute("aria-pressed") === null);
          const start = performance.now();
          button.click();
          while (document.querySelectorAll("textarea")[1].value.length !== 1024 * 1024) await new Promise(requestAnimationFrame);
          return performance.now() - start;
        }, label.decode);
        assert.ok(encodePerformanceMs < 250);
        assert.ok(decodePerformanceMs < 250);

        const marker = "QA_URL_PRIVATE_4f91";
        await page.getByRole("button", { name: label.encodeMode, exact: true }).click();
        await page.getByRole("textbox", { name: label.inputEncode }).fill(marker);
        await context.setOffline(true);
        await run(page, label, "encode");
        await context.setOffline(false);
        assert.equal(requests.some((request) => request.includes(marker)), false);
        const stored = await page.evaluate(() => JSON.stringify({ url: location.href, local: Object.values(localStorage), session: Object.values(sessionStorage), cookie: document.cookie }));
        assert.equal(stored.includes(marker), false);
        await page.screenshot({ path: "artifacts/url-encoder-decoder-375.png", fullPage: true });
      }

      if (locale === "ja" && viewport.width === 1280) await page.screenshot({ path: "artifacts/url-encoder-decoder-1280-ja.png", fullPage: true });
      await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
      const card = page.getByRole("link", { name: new RegExp(label.nav) }).last();
      assert.equal(new URL(await card.getAttribute("href"), baseUrl).pathname, pathname);
      await Promise.all([page.waitForURL(`**${pathname}`), card.click()]);
      await context.close();
    }
  }

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({
    locales,
    viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    consoleErrors: 0,
    pageErrors: 0,
    encodePerformanceMs,
    decodePerformanceMs,
  }, null, 2));
} finally {
  await browser.close();
}
