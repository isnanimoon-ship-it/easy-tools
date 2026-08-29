import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3116";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const viewports = [320, 375, 768, 1024, 1280];
const consoleErrors = []; const pageErrors = [];
await mkdir("artifacts", { recursive: true });

async function fixture(page, type = "image/png") {
  const base64 = await page.evaluate(async (mime) => {
    const canvas = document.createElement("canvas"); canvas.width = 2; canvas.height = 2;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ff0000"; context.fillRect(0, 0, 1, 1);
    context.fillStyle = "#00ff00"; context.fillRect(1, 0, 1, 1);
    context.fillStyle = "#0000ff"; context.fillRect(0, 1, 1, 1);
    context.fillStyle = "rgba(0,0,0,.5)"; context.fillRect(1, 1, 1, 1);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, .92));
    const data = new Uint8Array(await blob.arrayBuffer()); let binary = "";
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, type);
  return Buffer.from(base64, "base64");
}

try {
  for (const locale of ["ko", "en", "ja"]) for (const width of viewports) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage(); const requests = [];
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${locale}/${width}: ${message.text()}`); });
    page.on("pageerror", error => pageErrors.push(`${locale}/${width}: ${error.message}`));
    page.on("request", request => requests.push(request.url()));
    const pathname = `/${locale}/tools/image-color-picker`;
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    const storageBefore = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname, pathname);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

    if (locale === "en") {
      const input = page.locator('input[type="file"]'); const png = await fixture(page);
      await input.setInputFiles({ name: "four-colors.png", mimeType: "image/png", buffer: png });
      const preview = page.getByAltText("Uploaded image for pixel color selection"); await preview.waitFor();
      assert.equal(await page.getByText("2 × 2px", { exact: true }).count(), 1);
      const box = await preview.boundingBox(); assert.ok(box); await page.mouse.move(box.x + .5, box.y + .5);
      const magnifier = page.getByTestId("pixel-magnifier"); await magnifier.waitFor({ state: "visible" });
      assert.match(await magnifier.textContent(), /X 0 · Y 0/);
      const magnified = page.getByTestId("magnified-image");
      assert.deepEqual(await magnified.evaluate(image => ({ left:image.style.left, top:image.style.top, width:image.style.width, rendering:getComputedStyle(image).imageRendering })), { left:"100px", top:"100px", width:"40px", rendering:"pixelated" });
      await page.getByLabel("X coordinate").fill("1"); await page.getByLabel("Y coordinate").fill("0"); await page.getByRole("button", { name: "Select this pixel" }).click();
      assert.ok(await page.getByText("#00FF00", { exact: true }).count() >= 1);
      await page.getByRole("button", { name: "HEX / HEXA Copy" }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "#00FF00");
      await page.getByLabel("Zoom").selectOption("400");
      await preview.click({ position: { x: 2, y: 6 } });
      assert.ok(await page.getByText("#0000FF", { exact: true }).count() >= 1);
      await page.getByLabel("X coordinate").fill("2"); await page.getByRole("button", { name: "Select this pixel" }).click();
      assert.match(await page.locator('p[role="alert"]').textContent(), /inside the image bounds/);
      await input.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not png") });
      assert.match(await page.locator('p[role="alert"]').textContent(), /do not match/);
      assert.equal(await page.getByAltText("Uploaded image for pixel color selection").count(), 1);
      for (const [type, name] of [["image/jpeg", "sample.jpg"], ["image/webp", "sample.webp"]]) {
        await input.setInputFiles({ name, mimeType: type, buffer: await fixture(page, type) });
        await page.getByAltText("Uploaded image for pixel color selection").waitFor();
      }
      assert.equal(requests.some(url => url.startsWith("blob:") === false && /four-colors|sample\.(jpg|webp)/.test(url)), false);
      assert.equal(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })), storageBefore);
      await page.getByRole("button", { name: "Reset" }).click();
      assert.equal(await page.getByAltText("Uploaded image for pixel color selection").count(), 0);
    }
    if (locale === "ko" && width === 375) await page.screenshot({ path: "artifacts/image-color-picker-375-ko.png", fullPage: true });
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });
    assert.equal(await page.locator(`a[href="/${locale}/tools/image-color-picker"]`).count() > 0, true);
    await context.close();
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({ locales: 3, viewports, imageFormats: ["PNG", "JPEG", "WebP"], consoleErrors: 0, pageErrors: 0, horizontalOverflow: 0 }, null, 2));
} finally { await browser.close(); }
