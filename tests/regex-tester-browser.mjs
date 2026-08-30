import assert from"node:assert/strict";
import{chromium}from"playwright-core";
const baseUrl=process.env.QA_BASE_URL??"http://127.0.0.1:3127";const browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});const consoleErrors=[],pageErrors=[],externalRequests=[];
function watch(page,label){page.on("console",m=>{if(m.type()==="error")consoleErrors.push(`${label}: ${m.text()}`)});page.on("pageerror",e=>pageErrors.push(`${label}: ${e.message}`));page.on("request",r=>{const host=new URL(r.url()).hostname;if(!r.url().startsWith(baseUrl)&&!r.url().startsWith("blob:")&&!/(^|\.)(naver\.com|pstatic\.net|googlesyndication\.com|doubleclick\.net|adtrafficquality\.google|google\.com)$/.test(host))externalRequests.push(r.url())});}
async function setCase(page,pattern,text){await page.getByLabel("정규식 Pattern").fill(pattern);await page.getByLabel("테스트 문자열").fill(text);await page.getByText(/올바른 JavaScript 정규식/).waitFor({timeout:5000});}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();watch(page,"ko/1440");await page.goto(`${baseUrl}/ko/tools/regex-tester`,{waitUntil:"domcontentloaded"});
 await page.getByRole("button",{name:"지금 실행"}).click();await page.getByText("올바른 JavaScript 정규식").waitFor({timeout:5000});await page.getByRole("button",{name:"초기화"}).click();
 await setCase(page,"test","test test test");assert.equal(await page.getByText("Match #3",{exact:true}).isVisible(),true);assert.equal(await page.locator("mark").count(),3);
 await page.getByRole("checkbox",{name:/i 대소문자/}).check();await setCase(page,"hello","Hello HELLO hello");assert.equal(await page.locator("mark").count(),3);
 await setCase(page,"(?<year>\\d{4})-(\\d{2})-(\\d{2})","2026-08-29");assert.equal(await page.getByText("year",{exact:true}).isVisible(),true);assert.equal(await page.getByText("2026",{exact:true}).last().isVisible(),true);await page.getByLabel("치환 문자열").fill("$<year>/$2/$3");await page.getByText("2026/08/29",{exact:true}).waitFor();
 await page.getByRole("checkbox",{name:/i 대소문자/}).uncheck();await page.getByRole("checkbox",{name:/u Unicode/}).check();await setCase(page,"(?:)","😀");assert.equal(await page.getByText("Match #2",{exact:true}).isVisible(),true);assert.equal(await page.getByText("Match #3",{exact:true}).count(),0);
 await page.getByLabel("정규식 Pattern").fill("[abc");await page.locator('p[role="alert"]').filter({hasText:/Invalid regular expression/}).waitFor({timeout:5000});
 await page.evaluate(()=>{window.__heartbeats=0;window.__heartbeat=setInterval(()=>window.__heartbeats++,25)});await page.getByLabel("정규식 Pattern").fill("(a+)+$");await page.getByLabel("테스트 문자열").fill("a".repeat(50000)+"!");const before=await page.evaluate(()=>window.__heartbeats);await page.getByText(/실행 시간이 너무 깁니다/).waitFor({timeout:4000});const after=await page.evaluate(()=>window.__heartbeats);assert.ok(after-before>10);await page.evaluate(()=>clearInterval(window.__heartbeat));
 await setCase(page,"safe","safe again");assert.equal(await page.getByText("Match #1",{exact:true}).isVisible(),true);
 assert.equal(await page.getByText("g flag가 활성화되어 전체 Match를 찾았습니다.",{exact:true}).isVisible(),true);
 const marker="PRIVATE_REGEX_7f3a";await setCase(page,"PRIVATE_REGEX_\\w+",marker);assert.equal(await page.locator("mark").textContent(),marker);const storage=await page.evaluate(()=>({local:[...Object.keys(localStorage)],session:[...Object.keys(sessionStorage)],url:location.href}));assert.equal(JSON.stringify(storage).includes(marker),false);

 await page.getByLabel("정규식 Pattern").fill("(\\d{4})-(\\d{2})-(\\d{2})");
 await page.getByRole("button",{name:"케이스 추가"}).click();await page.getByRole("button",{name:"케이스 추가"}).click();await page.getByRole("button",{name:"케이스 추가"}).click();
 const batchRows=page.getByPlaceholder("테스트할 문자열");
 await batchRows.nth(0).fill("2024-01-02");await batchRows.nth(1).fill("not a date");await batchRows.nth(2).fill("2024-01-02 and 2025-06-07");
 await page.getByText("매치됨",{exact:true}).first().waitFor({timeout:5000});
 assert.equal(await page.getByText("매치 안 됨",{exact:true}).count(),1);
 assert.equal(await page.getByText("매치됨 · 2건",{exact:true}).count(),1);
 assert.equal(await page.getByText("Capture Groups",{exact:true}).count(),2);
 const removeButtons=page.getByRole("button",{name:"케이스 삭제"});await removeButtons.nth(1).click();
 assert.equal(await batchRows.count(),2);assert.equal(await page.getByText("매치 안 됨",{exact:true}).count(),0);
 await page.getByLabel("정규식 Pattern").fill("[abc");
 await page.getByText("Invalid regular expression",{exact:false}).first().waitFor({timeout:5000});
 await page.getByRole("button",{name:"초기화"}).click();
 assert.equal(await batchRows.count(),0);assert.equal(await page.getByText("아직 추가한 테스트 케이스가 없습니다.").isVisible(),true);
 await context.close();
 for(const[locale,width,title]of[["ko",320,"정규식 테스터"],["en",375,"Regex Tester"],["ja",768,"正規表現テスター"]]){const c=await browser.newContext({viewport:{width,height:850}});const p=await c.newPage();watch(p,`${locale}/${width}`);await p.goto(`${baseUrl}/${locale}/tools/regex-tester`,{waitUntil:"domcontentloaded"});assert.equal(await p.getByRole("heading",{name:title,exact:true}).isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);await c.close();}
 assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);assert.deepEqual(externalRequests,[]);process.stdout.write(JSON.stringify({worker:"PASS",globalMatches:3,caseInsensitive:3,captureGroups:"PASS",namedGroups:"PASS",replace:"PASS",unicodeZeroLength:2,invalidRegex:"PASS",redosTimeout:"PASS",mainThreadResponsive:true,recoveryAfterTimeout:"PASS",locales:["ko","en","ja"],viewports:[320,375,768,1440],externalInputRequests:0,consoleErrors:0,pageErrors:0,horizontalOverflow:0},null,2));
}finally{await browser.close()}
