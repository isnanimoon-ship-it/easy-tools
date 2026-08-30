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
    viewport: { width: 1280, height: 1100 },
    acceptDownloads: true,
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

  await page.goto(`${baseUrl}/ko/tools/text-cleaner`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "텍스트 정리기", level: 1 }).waitFor();

  const input = page.locator("#text-cleaner-input");
  const output = page.locator("#text-cleaner-output");

  // Mandatory combination scenario (SPEC section 24): collapse spaces + trim
  // (both on by default) + remove all blank lines + duplicate removal with
  // case-insensitive + ignore-surrounding-whitespace comparison.
  await input.fill("  Apple   \napple\n Banana \nbanana");
  await page.getByRole("radio", { name: "모든 빈 줄 제거" }).click();
  await page.getByLabel("중복된 줄 제거", { exact: true }).click();
  await page.getByLabel("대소문자 구분 안 함").click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "Apple\nBanana", "mandatory combination scenario mismatch");

  // Reset returns to a clean slate.
  await page.getByRole("button", { name: "초기화" }).click();
  assert.equal(await input.inputValue(), "");
  assert.equal(await output.inputValue(), "");
  assert.equal(await page.getByRole("radio", { name: "연속된 빈 줄을 1개로 줄이기" }).isChecked(), true);

  // Quick presets: clicking one applies its option combination, and any
  // manual option change afterward deselects the preset badge.
  await input.fill("a\n\n\nb\na");
  await page.getByRole("button", { name: "중복 제거" }).click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "a\n\nb", "removeDuplicate preset should dedupe while keeping blank lines");
  assert.equal(
    await page.getByRole("button", { name: "중복 제거" }).getAttribute("aria-pressed"),
    "true",
  );
  await page.getByLabel("탭을 공백으로 변환").click();
  assert.equal(
    await page.getByRole("button", { name: "중복 제거" }).getAttribute("aria-pressed"),
    "false",
    "manual option change should deselect the active preset",
  );
  await page.getByLabel("탭을 공백으로 변환").click();

  // one-line preset merges into a single line with no double spaces from blank lines.
  await page.getByRole("button", { name: "한 줄로 만들기" }).click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "a b a", "oneLine preset produced unexpected output");
  assert.equal(await page.getByTestId("result-lines").count(), 0, "line stats should be hidden while merged to one line");
  assert.equal(await page.getByTestId("original-chars").count(), 1, "char stats should still be visible while merged");

  // Merge-to-one-line disables duplicate removal even if it stays enabled.
  await page.getByRole("button", { name: "완전히 정리" }).click();
  await page.getByLabel("모든 줄을 한 줄로 합치기").click();
  await page.getByText("한 줄로 합치기가 켜져 있으면 중복 제거는 적용되지 않습니다.").waitFor();

  // Duplicate keep=last preserves original order but keeps the later occurrence.
  await page.getByRole("button", { name: "초기화" }).click();
  await input.fill("a\nb\na\nc");
  await page.getByLabel("중복된 줄 제거", { exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "a\nb\nc", "default keep=first mismatch");
  await page.getByLabel("마지막에 나온 줄").click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "b\na\nc", "keep=last mismatch");
  await page.getByLabel("처음 나온 줄").click();

  // resultType: duplicates-only / once-only
  await input.fill("a\nb\na\nc\nc");
  await page.waitForTimeout(400);
  await page.locator("select").filter({ hasText: "중복 제거된 전체" }).selectOption({ label: "중복이었던 줄만" });
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "a\nc");
  await page.locator("select").filter({ hasText: "중복이었던 줄만" }).selectOption({ label: "한 번만 나온 줄만" });
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "b");

  // Code-point-accurate char count (emoji are 2 UTF-16 units but 1 code point).
  await page.getByRole("button", { name: "초기화" }).click();
  await input.fill("a\u{1F600}b");
  await page.waitForTimeout(400);
  assert.equal(await page.getByTestId("original-chars").innerText(), "3");

  // Output is directly editable, and gets overwritten once input/options change again.
  await page.getByRole("button", { name: "초기화" }).click();
  await input.fill("hello");
  await page.waitForTimeout(400);
  await output.fill("manually edited");
  assert.equal(await output.inputValue(), "manually edited");
  await input.fill("hello world");
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "hello world", "output should be overwritten by the next recompute");

  // Copy to clipboard.
  await page.getByRole("button", { name: "결과 복사" }).click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clipboardText, "hello world");
  await page.getByRole("button", { name: "복사됨" }).waitFor();

  // Download as .txt, LF by default.
  const downloadPromiseLf = page.waitForEvent("download");
  await page.getByRole("button", { name: "TXT 다운로드" }).click();
  const downloadLf = await downloadPromiseLf;
  assert.equal(downloadLf.suggestedFilename(), "cleaned-text.txt");
  const lfStream = await downloadLf.createReadStream();
  const lfChunks = [];
  for await (const chunk of lfStream) lfChunks.push(chunk);
  assert.equal(Buffer.concat(lfChunks).toString("utf8"), "hello world");

  // Download as .txt with CRLF newline option.
  await input.fill("line1\nline2");
  await page.waitForTimeout(400);
  await page.locator("select").filter({ hasText: "LF" }).selectOption({ label: "CRLF" });
  const downloadPromiseCrlf = page.waitForEvent("download");
  await page.getByRole("button", { name: "TXT 다운로드" }).click();
  const downloadCrlf = await downloadPromiseCrlf;
  const crlfStream = await downloadCrlf.createReadStream();
  const crlfChunks = [];
  for await (const chunk of crlfStream) crlfChunks.push(chunk);
  assert.equal(Buffer.concat(crlfChunks).toString("utf8"), "line1\r\nline2");

  // Large-input perf warning (over the 2MB / 50,000-line threshold).
  await page.getByRole("button", { name: "초기화" }).click();
  await page.evaluate(() => {
    const el = document.querySelector("#text-cleaner-input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, "a\n".repeat(60_000));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(700);
  await page.getByText("입력이 커서 처리 속도가 느려질 수 있습니다.").waitFor();

  // Regex rule (idea #2): off by default, must not disturb the existing
  // flow when untouched; applies before other options when enabled; shows
  // an inline error (not a crash) for an invalid pattern; a preset click
  // must not silently discard a rule the user already set up.
  await page.getByRole("button", { name: "초기화" }).click();
  assert.equal(await page.getByLabel("정규식 치환(고급)", { exact: true }).isChecked(), false, "regex rule is off by default");
  assert.equal(await page.getByLabel("찾을 패턴").count(), 0, "advanced fields stay collapsed until enabled");

  await input.fill("#comment\nkeep me\n#also skip");
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "#comment\nkeep me\n#also skip", "disabled rule must not alter output");

  await page.getByLabel("정규식 치환(고급)", { exact: true }).click();
  await page.getByLabel("찾을 패턴").fill("^#.*$\\n?");
  await page.getByRole("radio", { name: "모든 빈 줄 제거" }).click();
  await page.waitForTimeout(400);
  assert.equal(await output.inputValue(), "keep me", "regex removes matching lines before the rest of the pipeline runs");

  await page.getByLabel("찾을 패턴").fill("(unterminated");
  await page.waitForTimeout(400);
  await page.getByRole("alert").getByText("정규식이 올바르지 않습니다", { exact: false }).waitFor();
  // Invalid pattern falls back to a no-op for the regex step (not a crash,
  // and not silently keeping a stale previous result) — the rest of the
  // pipeline still runs on the unfiltered text, so the comment lines reappear.
  assert.equal(await output.inputValue(), "#comment\nkeep me\n#also skip", "invalid pattern falls back to leaving text unfiltered, with a clear inline error");

  await page.getByLabel("찾을 패턴").fill("^#.*$\\n?");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "빈 줄 제거" }).click(); // a preset click
  await page.waitForTimeout(400);
  assert.equal(await page.getByLabel("정규식 치환(고급)", { exact: true }).isChecked(), true, "preset must not silently disable the user's regex rule");
  assert.equal(await page.getByLabel("찾을 패턴").inputValue(), "^#.*$\\n?", "preset must not clear the pattern the user typed");

  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await context.close();

  // Multi-locale + mobile viewport smoke test.
  for (const [locale, width, title] of [
    ["ko", 320, "텍스트 정리기"],
    ["en", 375, "Text Cleaner"],
    ["ja", 768, "テキストクリーナー"],
  ]) {
    const mobileContext = await browser.newContext({ viewport: { width, height: 900 } });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${locale}: ${message.text()}`);
    });
    mobilePage.on("pageerror", (error) => pageErrors.push(`${locale}: ${error.message}`));
    await mobilePage.goto(`${baseUrl}/${locale}/tools/text-cleaner`, { waitUntil: "domcontentloaded" });
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
        mandatoryCombination: true,
        presets: true,
        presetDeselect: true,
        mergeToOneLine: true,
        mergeDisablesDuplicate: true,
        keepFirst: true,
        keepLast: true,
        resultTypeFilters: true,
        emojiCharCount: true,
        editableOutputOverwritten: true,
        copyToClipboard: true,
        downloadLf: true,
        downloadCrlf: true,
        perfWarning: true,
        locales: 3,
        viewports: [320, 375, 768, 1280],
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
