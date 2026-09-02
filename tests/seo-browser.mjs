import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl=process.env.QA_BASE_URL??"http://127.0.0.1:3123";
const browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});
const consoleErrors=[];const pageErrors=[];
try{
  const context=await browser.newContext();const page=await context.newPage();page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text())});page.on("pageerror",error=>pageErrors.push(error.message));
  const robots=await (await context.request.get(`${baseUrl}/robots.txt`)).text();assert.match(robots,/User-Agent: \*/i);assert.match(robots,/Allow: \//i);assert.match(robots,/Sitemap: https:\/\/www\.konly\.co\.kr\/sitemap\.xml/i);
  const home=await (await context.request.get(`${baseUrl}/ko`)).text();const toolCount=(home.match(/href="\/ko\/tools\//g)??[]).length;const expectedUrlCount=(toolCount+3)*3;
  const sitemap=await (await context.request.get(`${baseUrl}/sitemap.xml`)).text();assert.equal((sitemap.match(/<url>/g)??[]).length,expectedUrlCount);assert.equal((sitemap.match(/hreflang="x-default"/g)??[]).length,expectedUrlCount);assert.match(sitemap,/https:\/\/www\.konly\.co\.kr\/ja\/tools\/cron-expression-generator/);
  for(const [locale,path] of [["ko","word-counter"],["en","json-formatter"],["ja","image-color-picker"],["ko","screenshot-stitcher"],["en","privacy-redactor"],["ko","excel-chart-maker"]]){
    const pathname=`/${locale}/tools/${path}`;await page.goto(`${baseUrl}${pathname}`,{waitUntil:"networkidle"});
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),`https://www.konly.co.kr${pathname}`);
    for(const alternate of ["ko","en","ja","x-default"])assert.equal(await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).count(),1);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"),`https://www.konly.co.kr${pathname}`);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"),"https://www.konly.co.kr/og");
    assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute("content"),"summary_large_image");
    assert.ok((await page.locator('meta[property="og:title"]').getAttribute("content"))?.length>3);
    const data=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.deepEqual(data["@graph"].map(item=>item["@type"]),["WebSite","WebApplication"]);assert.equal(data["@graph"][0].url,"https://www.konly.co.kr");
  }
  for(const slug of ["privacy","contact"]){
    for(const locale of ["ko","en","ja"]){
      const pathname=`/${locale}/${slug}`;await page.goto(`${baseUrl}${pathname}`,{waitUntil:"networkidle"});
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),`https://www.konly.co.kr${pathname}`);
      for(const alternate of ["ko","en","ja","x-default"])assert.equal(await page.locator(`link[rel="alternate"][hreflang="${alternate}"]`).count(),1);
      assert.equal((await page.getByRole("link",{name:/isnanik@daum\.net/}).getAttribute("href")),"mailto:isnanik@daum.net");
    }
  }
  const image=await context.request.get(`${baseUrl}/og`);assert.equal(image.status(),200);assert.match(image.headers()["content-type"],/image\/png/);assert.ok((await image.body()).length>10000);
  assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);process.stdout.write(JSON.stringify({sitemapUrls:expectedUrlCount,hreflangSets:expectedUrlCount,locales:3,canonical:true,openGraph:true,twitter:true,jsonLd:["WebSite","WebApplication"],ogImage:"PNG",consoleErrors:0,pageErrors:0},null,2));
}finally{await browser.close()}
