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
const dialogs = [];

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
function jwt(header, payload, signature = "sig") {
  return `${b64url(header)}.${b64url(payload)}.${signature}`;
}

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1200 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("request", (request) => {
    const url = request.url();
    const post = request.postData() ?? "";
    // Flag any request whose URL or body contains a JWT-shaped payload segment.
    if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(`${url} ${post}`)) {
      sensitiveRequests.push(url);
    }
  });

  await page.goto(`${baseUrl}/ko/tools/jwt-decoder`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "JWT 디코더", level: 1 }).waitFor();

  const input = page.locator("#jwt-input");

  // Next.js's own #__next-route-announcer__ also has role="alert" (always
  // present, always empty text) — exclude it so it doesn't shadow real checks.
  function alerts() {
    return page.getByRole("alert").filter({ hasText: /\S/ });
  }

  async function sectionText(headingId) {
    return page.locator(`#${headingId}`).locator("xpath=ancestor::section[1]").innerText();
  }
  async function waitForHeaderText(fragment) {
    await page.waitForFunction(
      ({ id, text }) => document.querySelector(`#${id}`)?.closest("section")?.innerText.includes(text),
      { id: "jwt-header-heading", text: fragment },
      { timeout: 3000 },
    );
  }

  // Empty input: idle state, no error banner, no result sections.
  assert.equal(await alerts().count(), 0, "empty input should not show an error banner");
  assert.equal(await page.locator("#jwt-header-heading").count(), 0, "empty input should not render Header section");

  // 1. Normal HS256 JWT with nested object/array payload, aud array, kid header.
  const normalToken = jwt(
    { alg: "HS256", typ: "JWT", kid: "key-1" },
    {
      sub: "1234567890",
      name: "Kim",
      iss: "https://issuer.example",
      aud: ["service-a", "service-b"],
      roles: ["admin", "user"],
      meta: { level: 2 },
      jti: "abc-123",
    },
  );
  await input.fill(normalToken);
  await waitForHeaderText("HS256");
  const headerText = await sectionText("jwt-header-heading");
  assert.match(headerText, /"alg": "HS256"/);
  assert.match(headerText, /HMAC \+ SHA-256/, "known algorithm gets a short description");
  assert.match(headerText, /key-1/, "kid is surfaced");
  const payloadText = await sectionText("jwt-payload-heading");
  assert.match(payloadText, /"roles": \[/, "arrays render");
  assert.match(payloadText, /"level": 2/, "nested objects render");
  assert.match(payloadText, /service-a, service-b/, "aud array joined for display");
  assert.match(payloadText, /abc-123/, "jti shown");
  const statusText = await sectionText("jwt-status-heading");
  assert.match(statusText, /정상적인 3-part JWT 형식/);
  assert.match(statusText, /JSON decode 성공/);
  assert.match(statusText, /exp 없음/, "no exp claim in this token");
  assert.match(statusText, /검증하지 않음/, "signature is never marked verified");
  assert.doesNotMatch(statusText, /Valid JWT/i, "must never claim the token is valid");

  // 2. RS256 header — decoding does not require verifying the signature.
  await input.fill(jwt({ alg: "RS256", typ: "JWT" }, { sub: "x" }));
  await waitForHeaderText("RS256");
  assert.match(await sectionText("jwt-header-heading"), /RSA \+ SHA-256/);

  // 24. alg: none notice.
  await input.fill(jwt({ alg: "none" }, { sub: "x" }));
  await waitForHeaderText("none으로 설정");

  // Korean / Japanese / Emoji payload — no replacement characters.
  await input.fill(jwt({ alg: "HS256" }, { name: "홍길동" }));
  await waitForHeaderText("HS256");
  let text = await sectionText("jwt-payload-heading");
  assert.match(text, /홍길동/);
  assert.doesNotMatch(text, /\uFFFD/);

  await input.fill(jwt({ alg: "HS256" }, { name: "田中太郎" }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("田中太郎"),
    { timeout: 3000 },
  );
  text = await sectionText("jwt-payload-heading");
  assert.doesNotMatch(text, /\uFFFD/);

  await input.fill(jwt({ alg: "HS256" }, { mood: "\u{1F600}" }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("\u{1F600}"),
    { timeout: 3000 },
  );

  // exp/nbf/iat scenarios.
  const nowSeconds = Math.floor(Date.now() / 1000);
  await input.fill(jwt({ alg: "HS256" }, { exp: nowSeconds - 3600 }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-status-heading")?.closest("section")?.innerText.includes("만료됨"),
    { timeout: 3000 },
  );

  await input.fill(jwt({ alg: "HS256" }, { exp: nowSeconds + 3600 }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-status-heading")?.closest("section")?.innerText.includes("아직 만료되지 않음"),
    { timeout: 3000 },
  );

  await input.fill(jwt({ alg: "HS256" }, { nbf: nowSeconds + 3600 }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("아직 사용 가능 시간이 아닙니다"),
    { timeout: 3000 },
  );

  await input.fill(jwt({ alg: "HS256" }, { iat: nowSeconds + 3600 }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("현재 시각보다 미래의 iat 값입니다"),
    { timeout: 3000 },
  );

  // aud as a plain string.
  await input.fill(jwt({ alg: "HS256" }, { aud: "my-api" }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("my-api"),
    { timeout: 3000 },
  );

  // Structural error cases: 1, 2, 4, 5 (JWE), 6 segments.
  await input.fill("onlyonepart");
  await alerts().getByText("JWT는 일반적으로 3개의 영역으로 구성됩니다.").waitFor();
  assert.equal(await page.locator("#jwt-header-heading").count(), 0);

  await input.fill("part1.part2");
  await alerts().getByText("JWT는 일반적으로 3개의 영역으로 구성됩니다.").waitFor();

  await input.fill("a.b.c.d");
  await alerts().getByText("지원하지 않는 토큰 형식입니다(4개 영역 감지됨).").waitFor();

  await input.fill("a.b.c.d.e");
  await page.getByText("암호화된 JWE 형식으로 보입니다.", { exact: false }).waitFor();
  assert.equal(await alerts().count(), 0, "JWE message must not use the error/alert tone");

  await input.fill("a.b.c.d.e.f");
  await alerts().getByText("지원하지 않는 토큰 형식입니다(6개 영역 감지됨).").waitFor();

  // Invalid Base64URL in the header, but a valid payload still decodes (independent decoding).
  await input.fill(`not-valid-base64!!!.${b64url({ sub: "still-works" })}.sig`);
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("still-works"),
    { timeout: 3000 },
  );
  assert.match(await sectionText("jwt-header-heading"), /디코딩할 수 없습니다/);

  // Invalid JSON payload (valid Base64URL, not JSON).
  const notJsonB64 = Buffer.from("not json at all").toString("base64url");
  await input.fill(`${b64url({ alg: "HS256" })}.${notJsonB64}.sig`);
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("올바른 JSON 형식이 아닙니다"),
    { timeout: 3000 },
  );

  // Very long token (> 1MB) is rejected as too large.
  await input.fill(`${"a".repeat(1_100_000)}.b.c`);
  await alerts().getByText("너무 긴 토큰입니다.").waitFor();

  // XSS: a payload value containing a script tag must render as inert text, never execute.
  await input.fill(jwt({ alg: "HS256" }, { evil: "<script>alert(1)</script>" }));
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes("script"),
    { timeout: 3000 },
  );
  const scriptTagCount = await page.evaluate(
    () => document.querySelectorAll("#jwt-payload-heading ~ * script, #jwt-payload-heading + * script").length,
  );
  assert.equal(scriptTagCount, 0, "no <script> element must be injected into the DOM");
  assert.deepEqual(dialogs, [], "the injected string must never actually execute as JS (no alert dialog)");

  // Copy JWT / Header / Payload.
  await input.fill(normalToken);
  await waitForHeaderText("key-1"); // unique to normalToken, unlike the generic "HS256" other cases share
  await page.getByRole("button", { name: "JWT 전체 복사" }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), normalToken);
  await page.getByRole("button", { name: "Header 복사" }).click();
  const copiedHeader = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copiedHeader, /"alg": "HS256"/);
  await page.getByRole("button", { name: "Payload 복사" }).click();
  const copiedPayload = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copiedPayload, /"sub": "1234567890"/);

  // Per-claim copy and fold/unfold on the payload tree view (IDEAS.md #10).
  const payloadSection = page.locator("#jwt-payload-heading").locator("xpath=ancestor::section[1]");
  const subRow = payloadSection.locator("div").filter({ hasText: '"sub": "1234567890"' }).last();
  await subRow.getByRole("button", { name: "값 복사" }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "1234567890",
    "per-claim copy of a string value strips the surrounding quotes",
  );

  const metaRow = payloadSection.locator("div").filter({ hasText: '"meta": {' }).last();
  await metaRow.getByRole("button", { name: "값 복사" }).click();
  const copiedMeta = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  assert.equal(copiedMeta, JSON.stringify({ level: 2 }, null, 2), "per-claim copy of an object claim pretty-prints just that subtree");

  await metaRow.getByRole("button", { name: "접기" }).click();
  await page.waitForFunction(
    () => !document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes('"level": 2'),
    { timeout: 3000 },
  );
  assert.match(await sectionText("jwt-payload-heading"), /"meta": \{ …1 \}/, "collapsed container shows a child count placeholder");
  await metaRow.getByRole("button", { name: "펼치기" }).click();
  await page.waitForFunction(
    () => document.querySelector("#jwt-payload-heading")?.closest("section")?.innerText.includes('"level": 2'),
    { timeout: 3000 },
  );

  // Reset clears everything.
  await page.getByRole("button", { name: "초기화" }).click();
  assert.equal(await input.inputValue(), "");
  assert.equal(await page.locator("#jwt-header-heading").count(), 0);

  // Sample JWT loads instantly (no debounce) and is always "not expired".
  await page.getByRole("button", { name: "예제 JWT 불러오기" }).click();
  await page.locator("#jwt-header-heading").waitFor({ timeout: 1000 });
  assert.match(await sectionText("jwt-status-heading"), /아직 만료되지 않음/);
  assert.notEqual(await input.inputValue(), "");

  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
  );

  // Security: no client-side storage of the JWT.
  const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  assert.equal(JSON.stringify(storage).match(/eyJ/), null, "no JWT-shaped value in localStorage/sessionStorage");

  await context.close();

  // Locale + viewport smoke test.
  for (const [locale, width, title] of [
    ["ko", 320, "JWT 디코더"],
    ["en", 375, "JWT Decoder"],
    ["ja", 768, "JWTデコーダー"],
  ]) {
    const mobileContext = await browser.newContext({ viewport: { width, height: 900 } });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${locale}: ${message.text()}`);
    });
    mobilePage.on("pageerror", (error) => pageErrors.push(`${locale}: ${error.message}`));
    await mobilePage.goto(`${baseUrl}/${locale}/tools/jwt-decoder`, { waitUntil: "domcontentloaded" });
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
        normalHs256: true,
        rs256Header: true,
        algNone: true,
        unicodePayloads: true,
        expExpiredAndFuture: true,
        nbfNotYetActive: true,
        iatFutureWarning: true,
        audStringAndArray: true,
        tooFewSegments: true,
        unsupportedSegmentCounts: true,
        jweDetection: true,
        partialDecodeFailureTolerance: true,
        invalidJsonPayload: true,
        tooLargeInput: true,
        xssInert: true,
        copyJwtHeaderPayload: true,
        claimTreeCopy: true,
        claimTreeFold: true,
        reset: true,
        sampleJwtAlwaysValid: true,
        noClientStorage: true,
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
