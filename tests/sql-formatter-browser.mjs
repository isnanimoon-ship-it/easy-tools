import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3109";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const locales = ["ko", "en", "ja"];
const viewports = [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }];

const labels = {
  ko: {
    input: "SQL 입력", result: "정렬 결과", dbms: "DBMS", keywordCase: "키워드 대소문자", indent: "들여쓰기",
    logicalOperator: "AND/OR 줄바꿈", commaStyle: "쉼표 위치", format: "정렬", minify: "압축", clear: "초기화",
    copy: "결과 복사", copied: "복사되었습니다.", download: "SQL 파일 다운로드",
    retryGeneric: "Generic SQL로 다시 시도", nav: "SQL 포맷터",
  },
  en: {
    input: "SQL input", result: "Formatted result", dbms: "DBMS", keywordCase: "Keyword case", indent: "Indent",
    logicalOperator: "AND/OR line break", commaStyle: "Comma style", format: "Format", minify: "Minify", clear: "Clear",
    copy: "Copy result", copied: "Copied.", download: "Download SQL file",
    retryGeneric: "Retry as Generic SQL", nav: "SQL Formatter",
  },
  ja: {
    input: "SQL入力", result: "整形結果", dbms: "DBMS", keywordCase: "キーワードの大文字小文字", indent: "インデント",
    logicalOperator: "AND/ORの改行", commaStyle: "カンマの位置", format: "整形", minify: "圧縮", clear: "クリア",
    copy: "結果をコピー", copied: "コピーしました。", download: "SQLファイルをダウンロード",
    retryGeneric: "Generic SQLで再試行", nav: "SQLフォーマッター",
  },
};

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const consoleErrors = [];
const pageErrors = [];

// Clicks a button that triggers a worker-based (re)format and waits until the result textarea's
// value both becomes non-empty and differs from whatever it held before the click — guarding
// against a false-positive "done" read when the previous run already left a non-empty result.
async function runAndWait(page, button, resultBox) {
  const before = await resultBox.inputValue();
  await button.click();
  await page.waitForFunction(
    ({ el, before: previous }) => el.value !== "" && el.value !== previous,
    { el: await resultBox.elementHandle(), before },
    { timeout: 10000 },
  );
}

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, acceptDownloads: true });
      const page = await context.newPage();
      const label = labels[locale];
      const requests = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (text.includes("hydrat") && text.includes("konly-theme") && text.includes("googlesyndication")) return;
        if (text.includes("frame-ancestors") && text.includes("google.com")) return;
        consoleErrors.push(`${locale}/${viewport.width}: ${text}`);
      });
      page.on("pageerror", (error) => pageErrors.push(`${locale}/${viewport.width}: ${error.message}`));
      page.on("request", (request) => requests.push(`${request.url()} ${request.postData() ?? ""}`));

      const pathname = `/${locale}/tools/sql-formatter`;
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
      for (const alternate of locales) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).getAttribute("href");
        assert.equal(new URL(href).pathname, `/${alternate}/tools/sql-formatter`);
      }

      const input = page.getByRole("textbox", { name: label.input });
      const result = page.getByRole("textbox", { name: label.result });
      const formatButton = page.getByRole("button", { name: label.format });
      const minifyButton = page.getByRole("button", { name: label.minify });
      const copyButton = page.getByRole("button", { name: label.copy });
      const downloadButton = page.getByRole("button", { name: label.download });
      const clearButton = page.getByRole("button", { name: label.clear });

      assert.equal(await formatButton.isDisabled(), true);
      assert.equal(await minifyButton.isDisabled(), true);
      assert.equal(await copyButton.isDisabled(), true);
      assert.equal(await downloadButton.isDisabled(), true);
      assert.equal(await clearButton.isDisabled(), true);

      await input.fill("SELECT a,b,c FROM users WHERE a=1 AND b=2;");
      assert.equal(await formatButton.isEnabled(), true);
      await runAndWait(page, formatButton, result);
      const formatted = await result.inputValue();
      assert.ok(formatted.includes("SELECT"));
      assert.ok(formatted.includes("FROM"));
      assert.ok(formatted.includes("WHERE"));
      assert.ok(formatted.includes("AND b = 2"));
      assert.equal(await copyButton.isEnabled(), true);
      assert.equal(await downloadButton.isEnabled(), true);

      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.width, `horizontal overflow at ${locale}/${viewport.width}`);
      assert.ok(
        (await page.locator("button, select").evaluateAll((nodes) =>
          nodes.filter((node) => node.offsetParent !== null && !(node.getRootNode() instanceof ShadowRoot && node.getRootNode().host.tagName === "NEXTJS-PORTAL")).map((node) => node.getBoundingClientRect().height),
        )).every((height) => height >= 44),
      );

      if (locale === "ko" && viewport.width === 375) {
        // Dialect-specific syntax preservation
        const dialectCases = [
          ["mysql", "SELECT `col` FROM `tbl` LIMIT 10;", ["`col`", "`tbl`", "LIMIT"]],
          ["postgresql", "SELECT payload::jsonb FROM events;", ["payload::"]],
          ["postgresql", "SELECT DISTINCT ON (user_id) user_id,created_at FROM logs ORDER BY user_id,created_at DESC;", ["DISTINCT", "user_id"]],
          ["tsql", "SELECT TOP 10 id,name FROM users ORDER BY id DESC;", ["TOP 10"]],
          ["tsql", "SELECT * FROM users WITH (NOLOCK);", ["NOLOCK"]],
          ["plsql", "SELECT * FROM users WHERE ROWNUM <= 10;", ["ROWNUM"]],
          ["sqlite", "INSERT INTO users(name) VALUES('Kim') ON CONFLICT(name) DO NOTHING;", ["ON CONFLICT", "DO NOTHING"]],
        ];
        for (const [dialect, sql, mustContain] of dialectCases) {
          await page.getByRole("combobox", { name: label.dbms }).selectOption(dialect);
          await input.fill(sql);
          await runAndWait(page, formatButton, result);
          const value = await result.inputValue();
          for (const token of mustContain) assert.ok(value.includes(token), `expected "${token}" in formatted ${dialect} output: ${value}`);
        }
        await page.getByRole("combobox", { name: label.dbms }).selectOption("sql");

        // Keyword case
        await input.fill("select a from t");
        await page.getByRole("combobox", { name: label.keywordCase }).selectOption("lower");
        await runAndWait(page, formatButton, result);
        assert.ok((await result.inputValue()).includes("select"));
        await page.getByRole("combobox", { name: label.keywordCase }).selectOption("preserve");
        await input.fill("Select a From t");
        await runAndWait(page, formatButton, result);
        const preserved = await result.inputValue();
        assert.ok(preserved.includes("Select") && preserved.includes("From"));
        await page.getByRole("combobox", { name: label.keywordCase }).selectOption("upper");

        // Indent
        await input.fill("SELECT a,b FROM t");
        await page.getByRole("combobox", { name: label.indent }).selectOption("2-spaces");
        await runAndWait(page, formatButton, result);
        assert.match(await result.inputValue(), /\n {2}a,/);
        await page.getByRole("combobox", { name: label.indent }).selectOption("4-spaces");

        // Comment and string-literal safety
        await input.fill("SELECT a -- trailing comment\nFROM t; /* block comment */");
        await runAndWait(page, formatButton, result);
        const withComments = await result.inputValue();
        assert.ok(withComments.includes("trailing comment"));
        assert.ok(withComments.includes("block comment"));

        await input.fill("SELECT 'SELECT FROM WHERE' AS label FROM t;");
        await runAndWait(page, formatButton, result);
        assert.ok((await result.inputValue()).includes("'SELECT FROM WHERE'"));

        // Multi-statement
        await input.fill("SELECT * FROM users; UPDATE users SET active = true WHERE id = 1;");
        await runAndWait(page, formatButton, result);
        const multi = await result.inputValue();
        assert.ok(multi.includes("SELECT") && multi.includes("UPDATE users"));

        // Korean alias and emoji
        await input.fill("SELECT a AS 이름 FROM t WHERE b = '😀';");
        await runAndWait(page, formatButton, result);
        const unicodeResult = await result.inputValue();
        assert.ok(unicodeResult.includes("이름"));
        assert.ok(unicodeResult.includes("'😀'"));

        // Minify
        await input.fill("SELECT id, name\nFROM users\nWHERE id = 1;");
        await runAndWait(page, minifyButton, result);
        assert.equal(await result.inputValue(), "SELECT id,name FROM users WHERE id=1;");

        // Comma style
        await input.fill("SELECT id,name,email FROM users;");
        await page.getByRole("combobox", { name: label.commaStyle }).selectOption("leading");
        await runAndWait(page, formatButton, result);
        const leadingComma = await result.inputValue();
        assert.ok(leadingComma.includes("\n    , name"));
        assert.ok(leadingComma.includes("\n    , email"));
        await page.getByRole("combobox", { name: label.commaStyle }).selectOption("trailing");

        // Malformed SQL preserves input and shows a friendly, non-raw error
        const malformed = "SELECT * FROM users WHERE ((";
        await input.fill(malformed);
        await formatButton.click();
        await page.locator("#sql-formatter-error").waitFor({ timeout: 10000 });
        assert.equal(await input.inputValue(), malformed);
        const errorText = await page.locator("#sql-formatter-error").textContent();
        assert.ok(!errorText.includes("EBNF") && !errorText.includes("asteriskless"));
        assert.equal(await page.getByRole("button", { name: label.retryGeneric }).count(), 0);

        // Retry-as-Generic-SQL only appears (and only makes sense) when a non-generic dialect is active
        await page.getByRole("combobox", { name: label.dbms }).selectOption("mysql");
        await input.fill(malformed);
        await formatButton.click();
        await page.locator("#sql-formatter-error").waitFor({ timeout: 10000 });
        const retryButton = page.getByRole("button", { name: label.retryGeneric });
        assert.equal(await retryButton.count(), 1);
        await retryButton.click();
        await page.waitForTimeout(400);
        assert.equal(await page.getByRole("combobox", { name: label.dbms }).inputValue(), "sql");
        assert.equal(await input.inputValue(), malformed);

        // Empty SQL
        await input.fill("");
        assert.equal(await formatButton.isDisabled(), true);

        // 10,000+ character SQL
        const longColumns = Array.from({ length: 1500 }, (_, i) => `col_${i}`).join(",");
        await input.fill(`SELECT ${longColumns} FROM big_table;`);
        assert.ok((await input.inputValue()).length > 10000);
        await runAndWait(page, formatButton, result);
        assert.ok((await result.inputValue()).includes("col_0"));

        // Copy
        await input.fill("SELECT a FROM t;");
        await runAndWait(page, formatButton, result);
        await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
        await copyButton.click();
        await page.waitForTimeout(200);
        const clipboardText = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
        assert.equal(clipboardText, await result.inputValue());
        assert.equal(await page.getByText(label.copied).count(), 1);

        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
        await copyButton.click();
        assert.equal(await page.locator("#sql-formatter-error").count(), 1);
        assert.equal(await result.inputValue() !== "", true);

        // Download
        await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
        await input.fill("SELECT a FROM t;");
        await runAndWait(page, formatButton, result);
        const downloadPromise = page.waitForEvent("download");
        await downloadButton.click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), "formatted.sql");

        // Clear
        await clearButton.click();
        assert.equal(await input.inputValue(), "");
        assert.equal(await result.inputValue(), "");
        assert.equal(await input.evaluate((node) => node === document.activeElement), true);

        // Offline formatting still works, and no unique input string leaves the browser
        const marker = "SQL_PRIVATE_MARKER_9c31";
        await input.fill(`SELECT '${marker}' FROM t;`);
        await context.setOffline(true);
        await runAndWait(page, formatButton, result);
        assert.ok((await result.inputValue()).includes(marker));
        await context.setOffline(false);
        assert.equal(requests.some((request) => request.includes(marker)), false);
        const stored = await page.evaluate(() => JSON.stringify({ url: location.href, local: Object.values(localStorage), session: Object.values(sessionStorage), cookie: document.cookie }));
        assert.equal(stored.includes(marker), false);

        await page.screenshot({ path: "artifacts/sql-formatter-375.png", fullPage: true });
      }

      if (locale === "ja" && viewport.width === 1280) await page.screenshot({ path: "artifacts/sql-formatter-1280-ja.png", fullPage: true });

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
    locales, viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    consoleErrors: 0, pageErrors: 0,
  }, null, 2));
} finally {
  await browser.close();
}
