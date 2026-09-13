import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3012";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const consoleErrors = [], pageErrors = [], remoteImageRequests = [];

try {
  for (const [locale, width, title] of [["ko", 320, "Markdown 뷰어"], ["en", 375, "Markdown Viewer"], ["ja", 768, "Markdownビューア"], ["ko", 1024, "Markdown 뷰어"], ["en", 1440, "Markdown Viewer"]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${locale}: ${message.text()}`); });
    page.on("pageerror", error => pageErrors.push(`${locale}: ${error.message}`));
    await page.goto(`${baseUrl}/${locale}/tools/markdown-viewer`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("heading", { level: 1, name: title }).isVisible(), true);
    assert.equal(await page.getByRole("navigation", { name: /breadcrumb/i }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    if (width < 768) {
      const sourceButton = page.getByRole("button", { name: locale === "ko" ? "원문" : locale === "ja" ? "原文" : "Source" });
      await page.waitForFunction(element => element?.getAttribute("aria-pressed") === "true", await sourceButton.elementHandle());
    }
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`functional: ${message.text()}`); });
  page.on("pageerror", error => pageErrors.push(`functional: ${error.message}`));
  const privateMarker = "MARKDOWN_PRIVATE_9c33a1";
  page.on("request", request => { if (`${request.url()} ${request.postData() ?? ""}`.includes("markdown-private-marker.invalid") || `${request.url()} ${request.postData() ?? ""}`.includes(privateMarker)) remoteImageRequests.push(request.url()); });
  await page.goto(`${baseUrl}/ko/tools/markdown-viewer`, { waitUntil: "domcontentloaded" });

  const source = page.getByRole("textbox", { name: "Markdown 원문" });
  await source.fill(`# 안전 테스트 ${privateMarker}\n\n- [x] 완료\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<script>window.markdownEvil=true</script>\n\n[위험](javascript:alert(1)) [안전](https://example.com)\n\n![추적](https://markdown-private-marker.invalid/pixel.png)`);
  await page.waitForTimeout(350);
  const preview = page.locator('section[aria-labelledby="markdown-preview-heading"]');
  assert.equal(await preview.getByRole("heading", { name: "안전 테스트" }).isVisible(), true);
  assert.equal(await preview.getByRole("table").isVisible(), true);
  assert.equal(await preview.getByRole("checkbox").isDisabled(), true);
  assert.equal(await preview.locator("script,img").count(), 0);
  assert.equal(await preview.getByText("위험").evaluate(element => element.closest("a") === null), true);
  assert.equal(await preview.getByRole("link", { name: "안전" }).getAttribute("rel"), "noopener noreferrer nofollow");
  assert.equal(await preview.getByText(/외부 이미지는 자동으로/).isVisible(), true);
  assert.deepEqual(await page.evaluate(marker => ({
    url: location.href.includes(marker),
    local: Object.values(localStorage).some(value => value.includes(marker)),
    session: Object.values(sessionStorage).some(value => value.includes(marker)),
    evil: "markdownEvil" in window,
  }), privateMarker), { url: false, local: false, session: false, evil: false });

  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  assert.equal(await page.getByRole("textbox", { name: "Markdown 원문" }).count(), 0);
  await page.getByRole("button", { name: "원문", exact: true }).click();
  await page.getByRole("button", { name: "초기화" }).click();
  assert.equal(await page.getByRole("textbox", { name: "Markdown 원문" }).inputValue(), "");

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "page.html", mimeType: "text/html", buffer: Buffer.from("<b>x</b>") });
  await page.getByRole("alert").filter({ hasText: "MD, MARKDOWN 또는 TXT" }).waitFor();
  await input.setInputFiles({ name: "invalid.md", mimeType: "text/markdown", buffer: Buffer.from([0xc3, 0x28]) });
  await page.getByRole("alert").filter({ hasText: "UTF-8" }).waitFor();
  await input.setInputFiles({ name: "sample.md", mimeType: "text/markdown", buffer: Buffer.from("# 파일 열기\n\n안녕하세요 😀") });
  await page.waitForFunction(() => document.querySelector('textarea[aria-labelledby="markdown-source-heading"]')?.value.includes("파일 열기"));
  assert.equal(await page.getByRole("textbox", { name: "Markdown 원문" }).inputValue(), "# 파일 열기\n\n안녕하세요 😀");
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  assert.equal(await page.getByRole("heading", { name: "파일 열기" }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await context.close();

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(remoteImageRequests, []);
  process.stdout.write(JSON.stringify({ locales: ["ko", "en", "ja"], viewports: [320, 375, 768, 1024, 1280, 1440], markdown: "PASS", unsafeHtml: "blocked", unsafeLinks: "blocked", remoteImageRequests: 0, storageOrUrlLeaks: 0, consoleErrors: 0, pageErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
