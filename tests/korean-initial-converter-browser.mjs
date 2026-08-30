import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3141";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const consoleErrors = [];
const pageErrors = [];
const sensitiveRequests = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (/\/tools\/|\/api\//i.test(new URL(request.url()).pathname) && request.method() !== "GET") {
      sensitiveRequests.push(request.url());
    }
  });

  await page.goto(`${baseUrl}/ko/tools/korean-initial-converter`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "한글 초성 변환기", level: 1 }).waitFor();

  const input = page.locator("#korean-initial-input");
  const result = page.locator("#korean-initial-result");

  async function expectConversion(text, expected, message) {
    await input.fill(text);
    await page.waitForFunction(
      ({ value }) => document.querySelector("#korean-initial-result")?.value === value,
      { value: expected },
      { timeout: 3000 },
    );
    assert.equal(await result.inputValue(), expected, message);
  }

  // SPEC section 14 QA scenarios
  await expectConversion("가나다", "ㄱㄴㄷ", "1. basic syllables");
  await expectConversion("안녕하세요", "ㅇㄴㅎㅅㅇ", "2. greeting");
  await expectConversion("까따빠", "ㄲㄸㅃ", "3. double consonants");
  await expectConversion("쌀", "ㅆ", "4. single syllable");
  await expectConversion("대한민국", "ㄷㅎㅁㄱ", "5. country name");
  await expectConversion("오늘 날씨 좋다", "ㅇㄴ ㄴㅆ ㅈㄷ", "6. whitespace kept by default");
  await expectConversion("ABC 가나다", "ABC ㄱㄴㄷ", "7. Latin preserved");
  await expectConversion("123 가나다", "123 ㄱㄴㄷ", "8. digits preserved");
  await expectConversion("안녕!", "ㅇㄴ!", "9. punctuation attached, no inserted spacing");
  await expectConversion("안녕\u{1F600}", "ㅇㄴ\u{1F600}", "10. emoji preserved");
  await expectConversion(
    "안녕하세요\n오늘 날씨가 좋네요",
    "ㅇㄴㅎㅅㅇ\nㅇㄴ ㄴㅆㄱ ㅈㄴㅇ",
    "11. multi-line input keeps line structure",
  );
  await expectConversion("ㄱ나다", "ㄱㄴㄷ", "12. standalone compatibility jamo passes through");
  await expectConversion("ㄱㄴㄷ", "ㄱㄴㄷ", "12b. already-initials input is unchanged");

  // 13. NFD combining jamo input, typed via the DOM (not through Playwright's
  // fill(), which is text-only) to guarantee the exact decomposed bytes reach
  // the textarea's value the same way a real NFD IME output would.
  await page.evaluate(() => {
    const el = document.querySelector("#korean-initial-input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, "\u1100\u1161\u1102\u1161\u1103\u1161"); // NFD: 가나다
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "ㄱㄴㄷ",
    { timeout: 3000 },
  );
  assert.equal(await result.inputValue(), "ㄱㄴㄷ", "13. NFD input normalizes before conversion");

  // 14. empty string
  await input.fill("");
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "",
    { timeout: 3000 },
  );
  assert.equal(await result.inputValue(), "", "14. empty input produces empty result");

  // 15. 100,000+ character string does not freeze the page or throw.
  const largeStart = Date.now();
  await page.evaluate(() => {
    const el = document.querySelector("#korean-initial-input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, "안녕하세요 ".repeat(20_000));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForFunction(
    () => (document.querySelector("#korean-initial-result")?.value.length ?? 0) > 100_000,
    { timeout: 5000 },
  );
  const largeElapsed = Date.now() - largeStart;
  assert.ok(largeElapsed < 5000, `15. large input took too long: ${largeElapsed}ms`);
  assert.deepEqual(pageErrors, [], "15. large input must not throw");

  // 16. whitespace removal option strips spaces but preserves newlines.
  await input.fill("오늘 날씨 좋다");
  await page.getByLabel("공백 제거").check();
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "ㅇㄴㄴㅆㅈㄷ",
    { timeout: 3000 },
  );
  assert.equal(await result.inputValue(), "ㅇㄴㄴㅆㅈㄷ", "16a. whitespace removed");
  await input.fill("안녕하세요\n오늘 날씨가 좋네요");
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "ㅇㄴㅎㅅㅇ\nㅇㄴㄴㅆㄱㅈㄴㅇ",
    { timeout: 3000 },
  );
  assert.equal(
    await result.inputValue(),
    "ㅇㄴㅎㅅㅇ\nㅇㄴㄴㅆㄱㅈㄴㅇ",
    "16b. newline preserved even with whitespace removal on",
  );
  await page.getByLabel("공백 제거").uncheck();

  // 17. Copy
  await input.fill("안녕하세요");
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "ㅇㄴㅎㅅㅇ",
    { timeout: 3000 },
  );
  await page.getByRole("button", { name: "결과 복사" }).click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clipboardText, "ㅇㄴㅎㅅㅇ", "17. clipboard matches displayed result");
  await page.getByRole("button", { name: "복사되었습니다" }).waitFor();

  // 18. Reset
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  assert.equal(await input.inputValue(), "", "18. input cleared");
  assert.equal(await result.inputValue(), "", "18. result cleared");
  assert.equal(await page.getByLabel("공백 제거").isChecked(), false, "18. option reset to default");

  // Char count line reflects code-point counts, not UTF-16 length.
  await input.fill("안녕\u{1F600}");
  await page.waitForFunction(
    () => document.querySelector("#korean-initial-result")?.value === "ㅇㄴ\u{1F600}",
    { timeout: 3000 },
  );
  await page.getByText(/입력 3자 · 결과 3자/).waitFor();

  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
  );
  await context.close();

  // 19/20/21: locale + viewport smoke test.
  for (const [locale, width, title] of [
    ["ko", 320, "한글 초성 변환기"],
    ["en", 375, "Korean Initial Consonant Converter"],
    ["ja", 1440, "ハングル初声変換ツール"],
  ]) {
    const mobileContext = await browser.newContext({ viewport: { width, height: 900 } });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${locale}: ${message.text()}`);
    });
    mobilePage.on("pageerror", (error) => pageErrors.push(`${locale}: ${error.message}`));
    await mobilePage.goto(`${baseUrl}/${locale}/tools/korean-initial-converter`, { waitUntil: "domcontentloaded" });
    assert.equal(await mobilePage.getByRole("heading", { name: title, level: 1 }).isVisible(), true);
    assert.equal(
      await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      `${locale} viewport ${width}px has horizontal overflow`,
    );
    await mobileContext.close();
  }

  assert.deepEqual(sensitiveRequests, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(
    JSON.stringify(
      {
        specScenarios: 22,
        doubleConsonants: true,
        latinDigitsPreserved: true,
        punctuationAttached: true,
        emojiPreserved: true,
        multiLine: true,
        compatibilityJamoPassthrough: true,
        nfdNormalization: true,
        emptyInput: true,
        largeInputMs: largeElapsed,
        whitespaceRemovalPreservesNewline: true,
        copyToClipboard: true,
        reset: true,
        charCountCodePointAccurate: true,
        locales: 3,
        viewports: [320, 375, 1280, 1440],
        sensitiveRequests: 0,
        consoleErrors: 0,
        pageErrors: 0,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
