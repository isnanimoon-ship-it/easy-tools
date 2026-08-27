import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3100";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [
  { width: 320, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];
const inputNames = {
  ko: "계산할 텍스트",
  en: "Text to count",
  ja: "カウントするテキスト",
};
const resetNames = { ko: "초기화", en: "Reset", ja: "リセット" };

function metricNumber(page, testId) {
  return page
    .getByTestId(testId)
    .textContent()
    .then((text) => Number(text?.replace(/[^0-9-]/g, "")));
}

async function expectCounts(page, expected) {
  assert.equal(await metricNumber(page, "characters"), expected.characters);
  assert.equal(
    await metricNumber(page, "characters-without-whitespace"),
    expected.charactersWithoutWhitespace,
  );
  assert.equal(await metricNumber(page, "words"), expected.words);
  assert.equal(await metricNumber(page, "lines"), expected.lines);
}

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const consoleErrors = [];
const pageErrors = [];
const leakedRequests = [];
let performanceMs = null;

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(`${locale}/${viewport.width}: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        pageErrors.push(`${locale}/${viewport.width}: ${error.message}`);
      });
      page.on("request", (request) => {
        const payload = `${request.url()} ${request.postData() ?? ""}`;
        if (payload.includes("QA_PRIVATE_TEXT_7f3c")) {
          leakedRequests.push(`${locale}/${viewport.width}: ${request.url()}`);
        }
      });

      const pathname = `/${locale}/tools/word-counter`;
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      assert.equal(page.url(), `${baseUrl}${pathname}`);
      assert.equal(await page.locator("h1").count(), 1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      assert.equal(new URL(canonical).pathname, pathname);
      for (const alternateLocale of locales) {
        const alternate = await page
          .locator(`link[rel="alternate"][hreflang="${alternateLocale}"]`)
          .getAttribute("href");
        assert.equal(
          new URL(alternate).pathname,
          `/${alternateLocale}/tools/word-counter`,
        );
      }

      const input = page.getByRole("textbox", { name: inputNames[locale] });
      const reset = page.getByRole("button", { name: resetNames[locale] });
      assert.equal(await input.count(), 1);
      assert.equal(await reset.isDisabled(), true);
      await expectCounts(page, {
        characters: 0,
        charactersWithoutWhitespace: 0,
        words: 0,
        lines: 0,
      });

      await input.fill("QA_PRIVATE_TEXT_7f3c Hello world");
      assert.equal(await reset.isEnabled(), true);
      await reset.press("Enter");
      await expectCounts(page, {
        characters: 0,
        charactersWithoutWhitespace: 0,
        words: 0,
        lines: 0,
      });
      assert.equal(await input.evaluate((element) => element === document.activeElement), true);

      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.scrollWidth <= dimensions.innerWidth,
        `horizontal overflow at ${locale}/${viewport.width}`,
      );

      if (locale === "ko" && viewport.width === 375) {
        const cases = [
          ["Hello world", { characters: 11, charactersWithoutWhitespace: 10, words: 2, lines: 1 }],
          ["안녕 세상", { characters: 5, charactersWithoutWhitespace: 4, words: 2, lines: 1 }],
          ["one\ntwo\n", { characters: 8, charactersWithoutWhitespace: 6, words: 2, lines: 3 }],
          ["a\r\nb", { characters: 3, charactersWithoutWhitespace: 2, words: 2, lines: 2 }],
          [" \t\n", { characters: 3, charactersWithoutWhitespace: 0, words: 0, lines: 2 }],
          ["e\u0301", { characters: 1, charactersWithoutWhitespace: 1, words: 1, lines: 1 }],
          ["👩🏽‍💻", { characters: 1, charactersWithoutWhitespace: 1, words: 0, lines: 1 }],
        ];
        for (const [text, expected] of cases) {
          await input.fill(text);
          await expectCounts(page, expected);
        }

        await input.fill("今日は晴れです");
        const expectedJapaneseWords = await page.evaluate((text) =>
          Array.from(
            new Intl.Segmenter("ko", { granularity: "word" }).segment(text),
          ).filter((part) => part.isWordLike).length,
        "今日は晴れです");
        assert.equal(await metricNumber(page, "words"), expectedJapaneseWords);

        performanceMs = await page.evaluate(async () => {
          const textarea = document.querySelector("#word-counter-input");
          const startedAt = performance.now();
          const valueSetter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value",
          ).set;
          valueSetter.call(textarea, "a".repeat(100_000));
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          while (
            document.querySelector('[data-testid="characters"]')?.textContent?.replace(/\D/g, "") !==
            "100000"
          ) {
            await new Promise(requestAnimationFrame);
          }
          return performance.now() - startedAt;
        });
        assert.ok(performanceMs < 200, `100k update took ${performanceMs.toFixed(1)}ms`);

        await context.setOffline(true);
        await input.fill("offline text");
        assert.equal(await metricNumber(page, "characters"), 12);
        await context.setOffline(false);
        await page.screenshot({ path: "artifacts/word-counter-375.png", fullPage: true });
      }

      if (locale === "ja" && viewport.width === 1280) {
        await input.fill("今日は晴れです");
        const expected = await page.evaluate((text) =>
          Array.from(
            new Intl.Segmenter("ja", { granularity: "word" }).segment(text),
          ).filter((part) => part.isWordLike).length,
        "今日は晴れです");
        assert.equal(await metricNumber(page, "words"), expected);
        await page.screenshot({ path: "artifacts/word-counter-1280-ja.png", fullPage: true });
      }

      await context.close();
    }
  }

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(leakedRequests, []);
  process.stdout.write(
    JSON.stringify(
      {
        locales,
        viewports: viewports.map(({ width, height }) => `${width}x${height}`),
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        leakedRequests: leakedRequests.length,
        performanceMs,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
