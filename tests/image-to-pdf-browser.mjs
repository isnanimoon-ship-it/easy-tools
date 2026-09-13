import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

const base = process.env.QA_BASE_URL ?? "http://127.0.0.1:3015";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const errors = [], leaks = [];

async function image(page, type, color, width, height) {
  return Buffer.from(await page.evaluate(async ({ type, color, width, height }) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type)); return [...new Uint8Array(await blob.arrayBuffer())];
  }, { type, color, width, height }));
}

async function quadrantJpeg(page) {
  return Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 300; canvas.height = 200;
    const ctx = canvas.getContext("2d");
    for (const [color, x, y] of [["#ff0000",0,0],["#00ff00",150,0],["#0000ff",0,100],["#ffff00",150,100]]) {
      ctx.fillStyle = color; ctx.fillRect(x,y,150,100);
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/jpeg",1)); return [...new Uint8Array(await blob.arrayBuffer())];
  }));
}

async function pdfPageCorners(page, doc, index) {
  const objects = doc.getPage(index).node.Resources().lookup(PDFName.of("XObject"), PDFDict);
  const stream = doc.context.lookup(objects.entries()[0][1], PDFRawStream);
  return page.evaluate(async bytes => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
    const colors = [[.2,.2],[.8,.2],[.2,.8],[.8,.8]].map(([x,y]) => {
      const [r,g,b] = ctx.getImageData(Math.floor(x*bitmap.width),Math.floor(y*bitmap.height),1,1).data;
      if (r>180 && g>180 && b<100) return "Y";
      if (r>180 && g<100 && b<100) return "R";
      if (g>180 && r<100 && b<100) return "G";
      if (b>180 && r<100 && g<100) return "B";
      if (r>230 && g>230 && b>230) return "W";
      return "?";
    });
    bitmap.close(); return colors.join("");
  }, [...stream.getContents()]);
}

function orientedJpeg(jpeg, orientation) {
  const payload = Buffer.from([0x45,0x78,0x69,0x66,0,0,0x49,0x49,0x2a,0,8,0,0,0,1,0,0x12,0x01,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]);
  const segment = Buffer.concat([Buffer.from([0xff, 0xe1, 0, payload.length + 2]), payload]);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}

try {
  for (const [locale, width] of [["ko",320],["en",375],["ja",768],["ko",1280]]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on("console", event => { if (event.type() === "error") errors.push(event.text()); });
    page.on("pageerror", event => errors.push(event.message));
    page.on("request", request => { if (`${request.url()} ${request.postData() ?? ""}`.includes("PRIVATE_PDF_IMAGE")) leaks.push(request.url()); });
    await page.goto(`${base}/${locale}/tools/image-to-pdf`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    if (width <= 375) {
      const small = await image(page, "image/png", "#eeeeee", 160, 120);
      await page.locator("#pdf-images").setInputFiles({ name: "mobile.png", mimeType: "image/png", buffer: small });
      await page.getByRole("button", { name: locale === "ko" ? "mobile.png 삭제" : "Remove mobile.png" }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
      await page.getByRole("button", { name: locale === "ko" ? "전체 초기화" : "Clear all" }).click();
    }
    if (locale === "ko" && width === 1280) {
      const jpg = await image(page, "image/jpeg", "#ff0000", 300, 200);
      const png = await image(page, "image/png", "#00ff00", 200, 300);
      const webp = await image(page, "image/webp", "#0000ff", 240, 200);
      await page.locator("#pdf-images").setInputFiles([
        { name: "PRIVATE_PDF_IMAGE.jpg", mimeType: "image/jpeg", buffer: jpg },
        { name: "second.png", mimeType: "image/png", buffer: png },
        { name: "third.webp", mimeType: "image/webp", buffer: webp },
      ]);
      await page.getByText("페이지 순서 (3)").waitFor();
      await page.getByRole("button", { name: "second.png 위로 이동" }).click();
      const imageRows = page.getByRole("heading", { name: /페이지 순서/ }).locator("..").locator("..").locator("ol li");
      assert.match(await imageRows.first().innerText(), /second\.png/);
      await page.getByLabel("용지").selectOption("letter");
      await page.getByLabel("방향").selectOption("landscape");
      await page.getByRole("button", { name: "PDF 만들기" }).click();
      await page.getByRole("button", { name: "PDF 다운로드" }).waitFor();
      const download = page.waitForEvent("download"); await page.getByRole("button", { name: "PDF 다운로드" }).click();
      const file = await download; assert.equal(file.suggestedFilename(), "images-to-pdf.pdf");
      const doc = await PDFDocument.load(await readFile(await file.path()));
      assert.equal((await readFile(await file.path())).includes(Buffer.from("PRIVATE_PDF_IMAGE")), false);
      assert.equal(doc.getPageCount(), 3);
      assert.deepEqual(doc.getPage(0).getSize(), { width: 792, height: 612 });
      async function pageCenterColor(index) {
        const objects = doc.getPage(index).node.Resources().lookup(PDFName.of("XObject"), PDFDict);
        const stream = doc.context.lookup(objects.entries()[0][1], PDFRawStream);
        return page.evaluate(async bytes => {
          const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
          const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
          const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, bitmap.width / 2, bitmap.height / 2, 1, 1, 0, 0, 1, 1);
          const color = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); bitmap.close(); return color;
        }, [...stream.getContents()]);
      }
      const firstColor = await pageCenterColor(0), secondColor = await pageCenterColor(1), thirdColor = await pageCenterColor(2);
      assert.equal(firstColor[1] > firstColor[0] && firstColor[1] > firstColor[2], true); // moved PNG is first
      assert.equal(secondColor[0] > secondColor[1] && secondColor[0] > secondColor[2], true);
      assert.equal(thirdColor[2] > thirdColor[0] && thirdColor[2] > thirdColor[1], true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
      await page.getByLabel("여백").selectOption("none");
      assert.equal(await page.getByRole("button", { name: "PDF 다운로드" }).count(), 0);
      await page.getByRole("button", { name: "전체 초기화" }).click();
      assert.equal(await imageRows.count(), 0);
      await page.locator("#pdf-images").setInputFiles({ name: "bad.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not image") });
      await page.getByText("JPG, PNG, WebP 형식의 정상적인 이미지를 선택하세요.").waitFor();
      await page.locator("#pdf-images").setInputFiles(Array.from({ length: 21 }, (_, i) => ({ name: `many-${i}.jpg`, mimeType: "image/jpeg", buffer: jpg })));
      await page.getByText("한 번에 최대 20장까지 추가할 수 있습니다.").waitFor();
      const quadrants = await quadrantJpeg(page);
      await page.locator("#pdf-images").setInputFiles([1,2,3,4,5,6,7,8].map(value => ({ name: `orientation-${value}.jpg`, mimeType: "image/jpeg", buffer: orientedJpeg(quadrants, value) })));
      await page.getByText("페이지 순서 (8)").waitFor();
      const dimensions = await imageRows.locator("p.text-xs").allTextContents();
      assert.equal(dimensions.filter(value => value.startsWith("200 × 300px")).length, 4);
      assert.equal(dimensions.filter(value => value.startsWith("300 × 200px")).length, 4);
      await page.getByRole("button", { name: "PDF 만들기" }).click();
      await page.getByRole("button", { name: "PDF 다운로드" }).waitFor();
      const orientationDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "PDF 다운로드" }).click();
      const orientationPdf = await orientationDownload;
      const orientedDoc = await PDFDocument.load(await readFile(await orientationPdf.path()));
      assert.equal(orientedDoc.getPageCount(), 8);
      const expectedCorners = ["RGBY","GRYB","YBGR","BYRG","RBGY","BRYG","YGBR","GYRB"];
      for (let index = 0; index < 8; index++) assert.equal(await pdfPageCorners(page, orientedDoc, index), expectedCorners[index], `EXIF orientation ${index + 1}`);
      await page.getByRole("button", { name: "전체 초기화" }).click();
      const alpha = await image(page, "image/png", "rgba(0,0,0,0)", 200, 200);
      await page.locator("#pdf-images").setInputFiles({ name: "transparent.png", mimeType: "image/png", buffer: alpha });
      await page.getByRole("button", { name: "PDF 만들기" }).click();
      await page.getByRole("button", { name: "PDF 다운로드" }).waitFor();
      const alphaDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "PDF 다운로드" }).click();
      const alphaPdf = await alphaDownload;
      assert.equal(await pdfPageCorners(page, await PDFDocument.load(await readFile(await alphaPdf.path())), 0), "WWWW");
    }
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(leaks, []);
  process.stdout.write(JSON.stringify({ locales: ["ko","en","ja"], viewports: [320,375,768,1280], formats: ["JPEG","PNG","WebP"], pages: 3, order: "PASS", exifVisualOrientations: "1–8 PASS", transparentPngWhiteBackground: "PASS", letterLandscape: "PASS", download: "PASS", consoleErrors: 0, leaks: 0 }, null, 2));
} finally { await browser.close(); }
