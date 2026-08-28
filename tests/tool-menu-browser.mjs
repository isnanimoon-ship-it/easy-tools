import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3125";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(`${baseUrl}/ko`);
  const nav = page.getByRole("navigation", { name: "도구 메뉴" });

  for (const name of ["텍스트", "개발자", "이미지·미디어", "기타 도구", "전체 도구"]) {
    await nav.getByRole("button", { name }).waitFor();
  }

  await nav.getByRole("button", { name: "기타 도구" }).click();
  assert.equal(await page.locator("#tool-panel").getByRole("link", { name: "비밀번호 생성기", exact: true }).isVisible(), true);
  assert.equal(await page.locator("#tool-panel").getByRole("link", { name: "IP 정보 확인", exact: true }).isVisible(), true);

  await nav.getByRole("button", { name: "전체 도구" }).click();
  assert.equal(await page.locator("#tool-panel section").count(), 4);

  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "도구" }).isVisible(), true);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
  );
  assert.deepEqual(errors, []);

  console.log(JSON.stringify({
    desktopMenus: 5,
    otherTools: 2,
    allCategories: 4,
    mobileWidth: 320,
    horizontalOverflow: 0,
    consoleErrors: 0,
  }));
} finally {
  await browser.close();
}
