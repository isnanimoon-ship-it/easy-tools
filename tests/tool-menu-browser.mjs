import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3114";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const mobileCases = [
  ["ko", 320, "도구", "전체 도구"], ["en", 375, "Tools", "All tools"], ["ja", 768, "ツール", "すべてのツール"], ["ko", 1024, "도구", "전체 도구"],
];
const consoleErrors = []; const pageErrors = [];

function watch(page, label) {
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${label}: ${message.text()}`); });
  page.on("pageerror", error => pageErrors.push(`${label}: ${error.message}`));
}
async function assertLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  const boxes = await page.locator("header a, header button, header select").evaluateAll(nodes => nodes.filter(node => node.offsetParent !== null).map(node => { const box=node.getBoundingClientRect(); return {left:box.left,right:box.right,top:box.top,bottom:box.bottom}; }));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));}
}

try {
  for (const [locale, width, trigger, all] of mobileCases) {
    const context = await browser.newContext({ viewport: { width, height: 800 } }); const page = await context.newPage(); watch(page, `${locale}/${width}`);
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "domcontentloaded" }); await assertLayout(page);
    const registeredToolCount = await page.locator('main a[href*="/tools/"]').count();
    assert.equal(await page.getByRole("button", { name: trigger, exact: true }).isVisible(), true);
    await page.getByRole("button", { name: trigger, exact: true }).click(); const panel = page.locator("#tool-panel"); await panel.waitFor();
    assert.equal(await panel.getByRole("link").count(), registeredToolCount); assert.equal(await page.getByRole("heading", { name: all }).count(), 0);
    assert.equal(await panel.getByRole("heading").count(), 4); await page.keyboard.press("Escape"); assert.equal(await panel.count(), 0);
    assert.equal(await page.getByRole("button", { name: trigger, exact: true }).evaluate(node => node === document.activeElement), true);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } }); const page = await context.newPage(); watch(page, "ko/1280");
  const homeHtml = await (await context.request.get(`${baseUrl}/ko`)).text(); const registeredToolCount = (homeHtml.match(/href="\/ko\/tools\//g) ?? []).length;
  await page.goto(`${baseUrl}/ko/tools/json-formatter`, { waitUntil: "domcontentloaded" }); await assertLayout(page);
  for (const label of ["텍스트", "개발자", "이미지·미디어", "기타 도구", "전체 도구"]) assert.equal(await page.getByRole("button", { name: new RegExp(label) }).isVisible(), true);
  const developer = page.getByRole("button", { name: /개발자/ }); assert.equal(await developer.getAttribute("aria-expanded"), "false"); assert.match(await developer.getAttribute("class"), /bg-\[var\(--info-bg\)\]/);
  await developer.click(); let panel = page.locator("#tool-panel"); assert.equal(await panel.getByRole("link").count(), 8); assert.equal(await panel.getByRole("heading", { name: "개발자" }).count(), 1);
  await page.keyboard.press("Escape"); assert.equal(await developer.evaluate(node => node === document.activeElement), true);
  await page.getByRole("button", { name: /기타 도구/ }).click(); panel = page.locator("#tool-panel"); assert.equal(await panel.getByRole("link").count(), 4); assert.equal(await panel.getByRole("heading", { name: "기타 도구" }).count(), 1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /전체 도구/ }).click(); panel = page.locator("#tool-panel"); assert.equal(await panel.getByRole("link").count(), registeredToolCount); assert.equal(await panel.getByRole("heading").count(), 4);
  await page.screenshot({ path: "artifacts/tool-menu-1280-ko.png" });
  await context.close();

  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({ mobileCases: mobileCases.length, desktopMenus: 5, desktopCategories: 4, otherLinks: 4, links: registeredToolCount, consoleErrors: 0, pageErrors: 0, horizontalOverflow: 0, overlap: 0 }, null, 2));
} finally { await browser.close(); }
