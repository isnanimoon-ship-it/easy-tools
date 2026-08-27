import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3102";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }];
const labels = {
  ko: { range: "슬라이더로 길이 선택", number: "길이 직접 입력", types: ["대문자 (A–Z)", "소문자 (a–z)", "숫자 (0–9)", "특수문자"], generate: "비밀번호 생성", copy: "결과 복사", nav: "비밀번호 생성기", allDisabled: "문자 유형을 하나 이상 선택하세요.", random: "안전한 난수를 사용할 수 없습니다." },
  en: { range: "Choose length with slider", number: "Enter exact length", types: ["Uppercase (A–Z)", "Lowercase (a–z)", "Numbers (0–9)", "Special characters"], generate: "Generate password", copy: "Copy result", nav: "Password Generator", allDisabled: "Select at least one character type.", random: "Secure randomness is unavailable." },
  ja: { range: "スライダーで長さを選択", number: "長さを直接入力", types: ["大文字 (A–Z)", "小文字 (a–z)", "数字 (0–9)", "特殊文字"], generate: "パスワードを生成", copy: "結果をコピー", nav: "パスワード生成", allDisabled: "文字種を1つ以上選択してください。", random: "安全な乱数を利用できません。" },
};

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = [];
const pageErrors = [];
const leakedRequests = [];
const observedRequests = [];
let performanceMs;

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${locale}/${viewport.width}: ${message.text()}`); });
      page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
      page.on("request", (request) => observedRequests.push(`${request.url()} ${request.postData() ?? ""}`));

      const pathname = `/${locale}/tools/password-generator`;
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
      for (const alternateLocale of locales) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${alternateLocale}"]`).getAttribute("href");
        assert.equal(new URL(href).pathname, `/${alternateLocale}/tools/password-generator`);
      }
      const range = page.getByRole("slider", { name: labels[locale].range });
      const number = page.getByRole("spinbutton", { name: labels[locale].number });
      const generate = page.getByRole("button", { name: labels[locale].generate });
      const copy = page.getByRole("button", { name: labels[locale].copy });
      const checkboxes = labels[locale].types.map((name) => page.getByRole("checkbox", { name }));
      assert.equal(await range.inputValue(), "16");
      assert.equal(await number.inputValue(), "16");
      for (const checkbox of checkboxes) assert.equal(await checkbox.isChecked(), true);
      assert.equal(await generate.isEnabled(), true);
      assert.equal(await copy.isDisabled(), true);
      assert.equal(await page.locator("output").count(), 0);

      await range.fill("24");
      assert.equal(await number.inputValue(), "24");
      await number.fill("200");
      await number.blur();
      assert.equal(await number.inputValue(), "128");
      assert.equal(await range.inputValue(), "128");

      await number.fill("16");
      assert.equal(await range.inputValue(), "16");
      await number.blur();
      await generate.click();
      const first = await page.locator("output").textContent();
      assert.equal(first.length, 16);
      assert.match(first, /[A-Z]/);
      assert.match(first, /[a-z]/);
      assert.match(first, /[0-9]/);
      assert.match(first, /[!@#$%^&*()\-_=+\[\]{};:,.?]/);
      assert.equal(await page.getByRole("meter").count(), 1);
      await generate.click();
      assert.notEqual(await page.locator("output").textContent(), first);

      for (const checkbox of checkboxes) await checkbox.uncheck();
      assert.equal(await generate.isDisabled(), true);
      assert.equal(await copy.isDisabled(), true);
      assert.ok((await page.locator("#password-generator-error").textContent()).includes(labels[locale].allDisabled));
      await checkboxes[2].check();
      assert.equal(await page.locator("#password-generator-error").count(), 0);
      assert.equal(await generate.isEnabled(), true);
      await number.fill("8");
      await number.blur();
      await generate.click();
      assert.match(await page.locator("output").textContent(), /^[0-9]{8}$/);

      const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `horizontal overflow at ${locale}/${viewport.width}`);
      const touchTargets = await page.locator("button, label:has(input[type=checkbox])").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
      assert.ok(touchTargets.every((height) => height >= 44), `small touch target at ${locale}/${viewport.width}`);

      const headerLink = page.getByRole("link", { name: labels[locale].nav }).first();
      assert.equal(new URL(await headerLink.getAttribute("href"), baseUrl).pathname, pathname);

      if (locale === "ko" && viewport.width === 375) {
        await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
        await number.fill("128");
        await number.blur();
        for (const checkbox of checkboxes) if (!(await checkbox.isChecked())) await checkbox.check();
        performanceMs = await page.evaluate(async (buttonName) => {
          const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent === buttonName);
          const start = performance.now();
          button.click();
          while (document.querySelector("output")?.textContent?.length !== 128) await new Promise(requestAnimationFrame);
          return performance.now() - start;
        }, labels.ko.generate);
        assert.ok(performanceMs < 50, `128 character generation took ${performanceMs.toFixed(1)}ms`);
        const password = await page.locator("output").textContent();
        const longResultDimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, outputWidth: document.querySelector("output").getBoundingClientRect().width }));
        assert.ok(longResultDimensions.scrollWidth <= longResultDimensions.innerWidth);
        assert.ok(longResultDimensions.outputWidth <= longResultDimensions.innerWidth);
        assert.equal(observedRequests.some((request) => request.includes(password)), false);
        await copy.click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), password);
        assert.equal(page.url().includes(password), false);
        const storage = await page.evaluate(() => ({ local: Object.values(localStorage), session: Object.values(sessionStorage), cookies: document.cookie }));
        assert.equal(JSON.stringify(storage).includes(password), false);

        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
        await copy.click();
        assert.equal(await page.locator("#password-generator-error").count(), 1);
        assert.equal(await page.locator("output").textContent(), password);

        await page.reload({ waitUntil: "networkidle" });
        await page.evaluate(() => Object.defineProperty(crypto, "getRandomValues", { configurable: true, value: () => { throw new Error("unavailable"); } }));
        await page.getByRole("button", { name: labels.ko.generate }).click();
        assert.ok((await page.locator("#password-generator-error").textContent()).includes(labels.ko.random));
        assert.equal(await page.locator("output").count(), 0);

        await page.reload({ waitUntil: "networkidle" });
        await context.setOffline(true);
        const offlineRange = page.getByRole("slider", { name: labels.ko.range });
        await offlineRange.focus();
        await offlineRange.press("ArrowRight");
        assert.equal(await page.getByRole("spinbutton", { name: labels.ko.number }).inputValue(), "17");
        const offlineUppercase = page.getByRole("checkbox", { name: labels.ko.types[0] });
        await offlineUppercase.focus();
        await offlineUppercase.press("Space");
        const offlineGenerate = page.getByRole("button", { name: labels.ko.generate });
        await offlineGenerate.focus();
        await offlineGenerate.press("Enter");
        assert.equal((await page.locator("output").textContent()).length, 17);
        const offlineCopy = page.getByRole("button", { name: labels.ko.copy });
        await offlineCopy.focus();
        await offlineCopy.press("Enter");
        await context.setOffline(false);
        await page.screenshot({ path: "artifacts/password-generator-375.png", fullPage: true });
      }

      if (locale === "ja" && viewport.width === 1280) {
        await generate.click();
        await page.screenshot({ path: "artifacts/password-generator-1280-ja.png", fullPage: true });
      }

      await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
      const homeLink = page.getByRole("link", { name: new RegExp(labels[locale].nav) }).last();
      assert.equal(new URL(await homeLink.getAttribute("href"), baseUrl).pathname, pathname);
      await Promise.all([page.waitForURL(`**${pathname}`), homeLink.click()]);
      assert.equal(new URL(page.url()).pathname, pathname);
      await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      await page.goBack({ waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, `/${locale}`);
      await page.goForward({ waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, pathname);
      await context.close();
    }
  }
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(leakedRequests, []);
  process.stdout.write(JSON.stringify({ locales, viewports: viewports.map(({ width, height }) => `${width}x${height}`), consoleErrors: 0, pageErrors: 0, leakedRequests: 0, performanceMs }, null, 2));
} finally { await browser.close(); }
