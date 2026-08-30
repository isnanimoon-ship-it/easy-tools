import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { unzipSync, strFromU8 } from "fflate";

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
    viewport: { width: 1400, height: 1200 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (/data:image|\/upload|\/api\//i.test(request.url()) && request.method() !== "GET") {
      sensitiveRequests.push(request.url());
    }
  });

  await page.goto(`${baseUrl}/ko/tools/favicon-generator`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "파비콘 생성기", level: 1 }).waitFor();

  // --- Text source -----------------------------------------------------
  const textInput = page.getByLabel("텍스트 (1~3자 권장)");
  await textInput.fill("AB");
  await page.waitForFunction(
    () => document.querySelectorAll("canvas").length >= 5,
    undefined,
    { timeout: 3000 },
  );
  assert.equal(await page.locator('canvas[width="16"]').count(), 1, "16px preview canvas renders");
  assert.equal(await page.locator('canvas[width="180"]').count() >= 1, true, "180px preview canvas renders");
  assert.equal(await page.locator('canvas[width="512"]').count(), 0, "512px is no longer shown in the preview grid");

  await textInput.fill("ABCD");
  await page.getByText("짧은 텍스트(1~3자)를 권장합니다.", { exact: false }).waitFor();
  await textInput.fill("AB");
  assert.equal(await page.getByText("짧은 텍스트(1~3자)를 권장합니다.", { exact: false }).count(), 0);

  // Korean / digit text also render without error.
  await textInput.fill("한글");
  await page.waitForTimeout(50);
  await textInput.fill("99");
  await page.waitForTimeout(50);

  // --- Contrast warning --------------------------------------------------
  const bgHex = page.locator('label:has-text("배경색") input[type="text"]');
  const fgHex = page.locator('label:has-text("글자색") input[type="text"]');
  await bgHex.fill("#ffffff");
  await fgHex.fill("#fefefe");
  await page.getByText("배경색과 글자색의 대비가 낮아", { exact: false }).waitFor();
  await bgHex.fill("#5B8DEF");
  await fgHex.fill("#FFFFFF");
  await page.waitForFunction(
    () => !document.body.innerText.includes("배경색과 글자색의 대비가 낮아"),
    undefined,
    { timeout: 3000 },
  );

  // --- Site name reflected in HTML + manifest ----------------------------
  await page.getByLabel("사이트 이름").fill("MySite");
  await page.waitForFunction(
    () => document.body.innerText.includes('content="MySite"'),
    undefined,
    { timeout: 3000 },
  );
  const manifestBlock = await page.getByText('"name": "MySite"', { exact: false }).innerText();
  assert.match(manifestBlock, /"short_name": "MySite"/);

  // --- Copy HTML code -----------------------------------------------------
  await page.getByRole("button", { name: "HTML 코드 복사" }).click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clipboardText, /<link rel="icon" href="\/favicon\.ico" sizes="any" \/>/);
  assert.match(clipboardText, /application-name" content="MySite"/);
  await page.getByRole("button", { name: "복사되었습니다" }).waitFor();

  // --- Emoji source ---------------------------------------------------
  await page.getByRole("tab", { name: "이모지" }).click();
  await page.getByRole("button", { name: "💡", exact: true }).click();
  assert.equal(await page.getByLabel("이모지", { exact: true }).inputValue(), "💡");
  await page.getByText("실제 표시 모양은 사용자의 운영체제", { exact: false }).waitFor();

  // --- Shape source -----------------------------------------------------
  await page.getByRole("tab", { name: "도형" }).click();
  await page.getByRole("button", { name: "원형", exact: true }).click();
  await page.getByLabel("테두리 사용").check();
  await page.getByRole("button", { name: "이모지", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("canvas").length >= 7, undefined, { timeout: 3000 });

  // Regression check: the in-context (iOS/Android) preview canvases must
  // render the *actual* selected shape, not be hard-clipped by decorative
  // CSS (a real bug: rounded-xl/rounded-full on the canvas element itself
  // masked every shape as rounded/circular regardless of the real selection).
  async function contextCanvasCornerAlpha(labelText) {
    return page.evaluate((label) => {
      const span = [...document.querySelectorAll("span")].find((s) => s.textContent === label);
      const canvas = span?.parentElement?.querySelector("canvas");
      return canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3];
    }, labelText);
  }
  const circleIosCorner = await contextCanvasCornerAlpha("iOS 홈 화면");
  assert.equal(circleIosCorner, 0, "circle shape must leave the iOS preview's corner transparent");
  const circleAndroidCorner = await contextCanvasCornerAlpha("Android 앱 아이콘");
  assert.equal(circleAndroidCorner, 0, "circle shape must leave the Android preview's corner transparent");

  await page.getByRole("button", { name: "사각형", exact: true }).click();
  await page.waitForTimeout(100);
  const squareIosCorner = await contextCanvasCornerAlpha("iOS 홈 화면");
  assert.equal(squareIosCorner, 255, "square shape must fill the iOS preview's corner (no CSS clipping the canvas)");
  const squareAndroidCorner = await contextCanvasCornerAlpha("Android 앱 아이콘");
  assert.equal(squareAndroidCorner, 255, "square shape must fill the Android preview's corner (no CSS clipping the canvas)");
  await page.getByRole("button", { name: "라운드 사각형", exact: true }).click();

  // --- Image source: upload + crop pan changes the rendered pixels -------
  await page.getByRole("tab", { name: "이미지" }).click();
  const splitImageDataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ff0000";
    c.fillRect(0, 0, 100, 100);
    c.fillStyle = "#0000ff";
    c.fillRect(100, 0, 100, 100);
    return canvas.toDataURL("image/png");
  });
  const splitImageBuffer = Buffer.from(splitImageDataUrl.split(",")[1], "base64");
  await page.locator("#favicon-image-file").setInputFiles({
    name: "split.png",
    mimeType: "image/png",
    buffer: splitImageBuffer,
  });
  await page.getByLabel("확대/축소").waitFor();

  const cropCanvasSelector = "canvas.cursor-move";
  await page.waitForFunction(
    (sel) => !!document.querySelector(sel),
    cropCanvasSelector,
    { timeout: 3000 },
  );

  // Pan hard left with keyboard-free slider math isn't exposed directly, so
  // drive the same drag interaction a real user would use, then sample the
  // live preview canvas pixels — this exercises the exact renderFavicon path
  // that also produces the final exported PNGs (SPEC decision 2 guarantee).
  async function samplePreviewAverageColor() {
    return page.evaluate((sel) => {
      const canvas = document.querySelector(sel);
      const ctx = canvas.getContext("2d");
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      return { r: r / n, g: g / n, b: b / n };
    }, cropCanvasSelector);
  }

  const cropBox = await page.locator(cropCanvasSelector).boundingBox();
  assert.ok(cropBox);
  // Drag from center to the far right — pans the crop window toward the
  // image's left (red) side, per the "drag the photo" convention.
  await page.mouse.move(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + cropBox.width - 2, cropBox.y + cropBox.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const redSide = await samplePreviewAverageColor();
  assert.ok(redSide.r > redSide.b, `expected red-dominant after panning right (drag-photo-left), got ${JSON.stringify(redSide)}`);

  // Re-upload the same image to reset crop pan back to its default (0,0)
  // baseline — dragging is relative to the *current* pan, so chaining a
  // second drag directly off the first would land near center, not the
  // opposite extreme.
  await page.locator("#favicon-image-file").setInputFiles({
    name: "split.png",
    mimeType: "image/png",
    buffer: splitImageBuffer,
  });
  await page.waitForTimeout(100);

  // Drag the other way — pans toward the blue side.
  await page.mouse.move(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + 2, cropBox.y + cropBox.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const blueSide = await samplePreviewAverageColor();
  assert.ok(blueSide.b > blueSide.r, `expected blue-dominant after panning left, got ${JSON.stringify(blueSide)}`);

  // Zoom slider + background toggle.
  await page.getByLabel("확대/축소").fill("2");
  await page.getByRole("button", { name: "단색", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("canvas").length >= 7, undefined, { timeout: 3000 });

  // --- ZIP download: verify exact file set + real ICO/manifest content ---
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP 다운로드" }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "mysite-favicon-package.zip");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const zipBytes = new Uint8Array(Buffer.concat(chunks));
  const files = unzipSync(zipBytes);
  const expectedNames = [
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon-48x48.png",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "site.webmanifest",
    "README.txt",
  ];
  assert.deepEqual(Object.keys(files).sort(), [...expectedNames].sort());

  // ICO structural validity (SPEC QA #35): ICONDIR + 3 entries, PNG signature at each declared offset.
  const ico = files["favicon.ico"];
  const icoView = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
  assert.equal(icoView.getUint16(0, true), 0, "ICO reserved field");
  assert.equal(icoView.getUint16(2, true), 1, "ICO type field (icon)");
  assert.equal(icoView.getUint16(4, true), 3, "ICO entry count (16/32/48)");
  const pngSignature = [0x89, 0x50, 0x4e, 0x47];
  for (let i = 0; i < 3; i++) {
    const entryOffset = 6 + i * 16;
    const dataOffset = icoView.getUint32(entryOffset + 12, true);
    assert.deepEqual(Array.from(ico.slice(dataOffset, dataOffset + 4)), pngSignature, `ICO entry ${i} points to a real PNG`);
  }

  // PNG file signatures.
  for (const name of ["favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "android-chrome-512x512.png"]) {
    assert.deepEqual(Array.from(files[name].slice(0, 4)), pngSignature, `${name} has a valid PNG signature`);
  }

  // site.webmanifest content.
  const manifest = JSON.parse(strFromU8(files["site.webmanifest"]));
  assert.equal(manifest.name, "MySite");
  assert.equal(manifest.short_name, "MySite");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(manifest.icons.map((i) => i.sizes), ["192x192", "512x512"]);

  // README.txt contains the same HTML snippet the user can copy.
  const readme = strFromU8(files["README.txt"]);
  assert.match(readme, /<link rel="icon" href="\/favicon\.ico" sizes="any" \/>/);

  // --- Preset gallery: applies style, carries over current text/emoji (IDEAS.md #16) -----
  // Scoped to #main-content: the site's own "도구 메뉴" nav dropdown has category buttons
  // (e.g. "텍스트") that share text with this tool's own controls and would otherwise collide.
  const main = page.locator("#main-content");
  await main.getByRole("tab", { name: "텍스트" }).click();
  await page.getByLabel("텍스트 (1~3자 권장)").fill("Hi");
  await main.getByRole("button", { name: "오션", exact: true }).click();
  assert.equal(await main.getByRole("tab", { name: "도형" }).getAttribute("aria-selected"), "true", "preset click switches to the Shape tab");
  assert.equal(await bgHex.inputValue(), "#2563EB");
  assert.equal(await fgHex.inputValue(), "#FFFFFF");
  assert.equal(await main.getByRole("button", { name: "라운드 사각형", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await main.getByRole("button", { name: "텍스트", exact: true }).getAttribute("aria-pressed"), "true", "content type carried over from the Text tab");
  assert.equal(await page.getByLabel("텍스트 (1~3자 권장)").inputValue(), "Hi", "text typed on the Text tab is carried into the shape's content, never discarded");
  assert.equal(await page.getByText("배경색과 글자색의 대비가 낮아", { exact: false }).count(), 0, "curated preset colors must not trigger the low-contrast warning");

  await main.getByRole("tab", { name: "이모지" }).click();
  await main.getByRole("button", { name: "🎯", exact: true }).click();
  await main.getByRole("button", { name: "로즈", exact: true }).click();
  assert.equal(await main.getByRole("tab", { name: "도형" }).getAttribute("aria-selected"), "true");
  assert.equal(await bgHex.inputValue(), "#E11D48");
  assert.equal(await main.getByRole("button", { name: "사각형", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await main.getByRole("button", { name: "이모지", exact: true }).getAttribute("aria-pressed"), "true", "content type carried over from the Emoji tab");
  assert.equal(await page.getByLabel("이모지", { exact: true }).inputValue(), "🎯", "emoji picked on the Emoji tab is carried into the shape's content");
  assert.equal(await page.getByLabel("테두리 사용").isChecked(), false, "the rose preset has no border");

  await main.getByRole("button", { name: "아웃라인", exact: true }).click();
  assert.equal(await page.getByLabel("테두리 사용").isChecked(), true, "the outline preset enables the border");
  assert.equal(await bgHex.inputValue(), "#FFFFFF");
  // Content type is still "emoji" here (carried over from the rose step, and clicking a
  // preset while already on the Shape tab intentionally never overrides it) — the foreground
  // color picker only renders for text content, so it isn't checked for this step.

  // --- Reset --------------------------------------------------------------
  await page.getByRole("button", { name: "초기화" }).click();
  assert.equal(await page.getByRole("tab", { name: "텍스트" }).getAttribute("aria-selected"), "true");
  await page.getByRole("tab", { name: "텍스트" }).click();
  assert.equal(await page.getByLabel("텍스트 (1~3자 권장)").inputValue(), "A");
  assert.equal(await page.getByLabel("사이트 이름").inputValue(), "");

  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
  );

  await context.close();

  // --- Locale + viewport smoke test ---------------------------------------
  for (const [locale, width, title] of [
    ["ko", 320, "파비콘 생성기"],
    ["en", 375, "Favicon Generator"],
    ["ja", 768, "ファビコンジェネレーター"],
    ["ko", 1440, "파비콘 생성기"],
  ]) {
    const viewportContext = await browser.newContext({ viewport: { width, height: 900 } });
    const viewportPage = await viewportContext.newPage();
    viewportPage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${locale}@${width}: ${message.text()}`);
    });
    viewportPage.on("pageerror", (error) => pageErrors.push(`${locale}@${width}: ${error.message}`));
    await viewportPage.goto(`${baseUrl}/${locale}/tools/favicon-generator`, { waitUntil: "domcontentloaded" });
    assert.equal(await viewportPage.getByRole("heading", { name: title, level: 1 }).isVisible(), true);
    assert.equal(
      await viewportPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      `${locale} viewport ${width}px has horizontal overflow`,
    );
    await viewportContext.close();
  }

  assert.deepEqual(sensitiveRequests, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(
    JSON.stringify(
      {
        textSource: true,
        textTooLongWarning: true,
        contrastWarning: true,
        siteNameReflectedInHtmlAndManifest: true,
        copyHtml: true,
        emojiSource: true,
        shapeSource: true,
        imageUploadAndCrop: true,
        cropPanChangesRenderedPixels: true,
        zoomAndBackgroundToggle: true,
        zipFileSet: expectedNames.length,
        icoStructureValid: true,
        pngSignaturesValid: true,
        manifestContentValid: true,
        readmeIncludesHtmlSnippet: true,
        presetGallery: true,
        reset: true,
        locales: 3,
        viewports: [320, 375, 768, 1440],
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
