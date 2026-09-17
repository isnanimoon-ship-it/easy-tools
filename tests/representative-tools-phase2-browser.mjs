import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3018";
const tools = [
  ["hwp-hwpx-viewer", "HWP · HWPX 파일을", "HWP · HWPX 뷰어"],
  ["privacy-redactor", "개인정보를 한 번 더 확인하세요", "이미지 개인정보 가리기"],
  ["screenshot-stitcher", "스크린샷을", "스크린샷 이어붙이기"],
  ["image-metadata-remover", "남아 있는 정보를 확인하세요", "사진 메타데이터 삭제"],
  ["screenshot-statusbar-remover", "상태바", "스크린샷 상태바 제거"],
  ["excel-chart-maker", "Excel · CSV 데이터를", "Excel · CSV 그래프 만들기"],
];

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const [slug, h1Text, titleText] of tools) {
      const errors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", error => errors.push(error.message));
      const response = await page.goto(`${baseUrl}/ko/tools/${slug}`, { waitUntil: "networkidle" });
      assert.equal(response?.ok(), true, `${slug} did not load`);
      assert.match(await page.title(), new RegExp(titleText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(await page.getByRole("heading", { level: 1 }).innerText(), new RegExp(h1Text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.equal(await page.locator(`[data-representative-detail="/tools/${slug}"]`).count(), 1, `${slug} detail count`);
      assert.equal(await page.locator(`[data-representative-detail="/tools/${slug}"] details`).count() >= 3, true, `${slug} FAQ count`);
      assert.equal(await page.locator("main section[aria-label='공유']").count(), 1, `${slug} share count`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${slug} ${width}px overflow`);
      assert.equal(errors.length, 0, `${slug} ${width}px page errors: ${errors.join(", ")}`);
    }
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  await page.goto(`${baseUrl}/ko/tools/privacy-redactor`, { waitUntil: "networkidle" });
  assert.equal(await page.getByText("현재 버전은 개인정보를 자동으로 찾지 않습니다", { exact: true }).count(), 1);
  await page.goto(`${baseUrl}/ko/tools/screenshot-statusbar-remover`, { waitUntil: "networkidle" });
  assert.equal(await page.getByText("현재는 상단만 제거합니다", { exact: true }).count(), 1);
  console.log("Representative tool Phase 2 browser checks passed.");
} finally {
  await browser.close();
}
