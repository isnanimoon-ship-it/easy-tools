import assert from"node:assert/strict";
import{chromium}from"playwright-core";
const baseUrl=process.env.QA_BASE_URL??"http://127.0.0.1:3141",browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});
const consoleErrors=[],pageErrors=[],sensitiveRequests=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text())});page.on("pageerror",error=>pageErrors.push(error.message));page.on("request",request=>{const post=request.postData()??"";if(/data:image/i.test(`${request.url()} ${post}`))sensitiveRequests.push(request.url())});
 await page.addInitScript(()=>{window.__urlCounts={created:0,revoked:0};const origCreate=URL.createObjectURL.bind(URL),origRevoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__urlCounts.created++;return origCreate(blob)};URL.revokeObjectURL=url=>{window.__urlCounts.revoked++;return origRevoke(url)}});
 await page.goto(`${baseUrl}/ko/tools/screenshot-statusbar-remover`,{waitUntil:"networkidle"});

 // Case 1: clear status bar (48px on a 2400px-tall image), distinct app header below it.
 const clearCase=await page.evaluate(()=>{
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
  c.fillStyle="#ffffff";c.fillRect(0,0,1080,2400);
  c.fillStyle="#111111";c.font='bold 26px Arial';c.fillText("09:41",24,32);
  c.fillStyle="#111111";c.font='bold 20px Arial';c.fillText("5G",930,30);
  c.fillStyle="#111111";c.fillRect(985,12,60,24);c.fillStyle="#ffffff";c.fillRect(989,16,44,16);c.fillStyle="#111111";c.fillRect(1045,17,4,14);
  c.fillStyle="#2563eb";c.fillRect(0,48,1080,92);
  c.fillStyle="#ffffff";c.font='bold 30px Arial';c.fillText("← Settings",380,105);
  c.fillStyle="#ffffff";c.fillRect(0,140,1080,2260);
  c.fillStyle="#333333";c.font='24px Arial';c.fillText("Body content line one",40,220);
  return canvas.toDataURL("image/png");
 });
 const clearBuffer=Buffer.from(clearCase.split(",")[1],"base64");
 await page.locator("#statusbar-file").setInputFiles({name:"clear-statusbar.png",mimeType:"image/png",buffer:clearBuffer});
 await page.getByText("1080 × 2400px",{exact:false}).waitFor();
 await page.getByText(/상태바 감지:/).waitFor();
 const detectedText=await page.getByText(/상태바 감지:/).innerText(),detectedPx=Number(detectedText.match(/제거 높이 (\d+)px/)?.[1]);
 assert.ok(detectedPx>=20 && detectedPx<=90,`expected a shallow detection near 48px, got ${detectedPx}`);
 // build the result and confirm the app header text survived (crop stayed shallow, above y=140)
 await page.getByRole("button",{name:"결과 만들기"}).click();
 await page.getByAltText("상태바가 제거된 결과 이미지").waitFor();
 const resultDims=await page.getByAltText("상태바가 제거된 결과 이미지").evaluate(img=>({w:img.naturalWidth,h:img.naturalHeight}));
 assert.equal(resultDims.w,1080);
 assert.ok(resultDims.h>2400-90 && resultDims.h<2400-20,`unexpected result height ${resultDims.h}`);
 const headerPixel=await page.getByAltText("상태바가 제거된 결과 이미지").evaluate(async(img,detectedPx)=>{await img.decode();const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext("2d");c.drawImage(img,0,0);const y=105-detectedPx;return Array.from(c.getImageData(50,Math.max(0,y),1,1).data)}, detectedPx);
 assert.deepEqual(headerPixel.slice(0,3),[37,99,235],"app header background should survive the crop (not cut into the header)");

 // manual adjustment: px input, +/-1, slider, drag, keyboard nudge
 const pxInput=page.locator('input[type="number"]');
 await pxInput.fill("60");await pxInput.blur();
 assert.equal(await pxInput.inputValue(),"60");
 await page.getByRole("button",{name:"1px 늘리기"}).click();assert.equal(await pxInput.inputValue(),"61");
 await page.getByRole("button",{name:"1px 줄이기"}).click();assert.equal(await pxInput.inputValue(),"60");
 const slider=page.locator('input[type="range"]');await slider.fill("80");assert.equal(await pxInput.inputValue(),"80");
 const svg=page.getByLabel("상태바 제거선 편집기");await svg.scrollIntoViewIfNeeded();
 const handle=svg.locator("rect.cursor-row-resize");await handle.scrollIntoViewIfNeeded();
 const handleBox=await handle.boundingBox();assert.ok(handleBox);
 await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2);await page.mouse.down();await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2+40);await page.mouse.up();
 const draggedValue=Number(await pxInput.inputValue());assert.ok(draggedValue>80,`expected drag to increase crop height, got ${draggedValue}`);
 await svg.focus();await page.keyboard.press("ArrowDown");assert.equal(Number(await pxInput.inputValue()),draggedValue+1);
 await page.keyboard.press("Shift+ArrowUp");assert.equal(Number(await pxInput.inputValue()),draggedValue+1-10);
 await page.keyboard.press("Shift+ArrowDown");assert.equal(Number(await pxInput.inputValue()),draggedValue+1);
 await page.getByRole("button",{name:"감지값으로 초기화"}).click();assert.equal(Number(await pxInput.inputValue()),detectedPx);

 // download + PNG signature + no EXIF/GPS
 await page.getByRole("button",{name:"결과 만들기"}).click();await page.getByText("다운로드 준비").waitFor();
 const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"PNG 다운로드"}).click();const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),"clear-statusbar-no-statusbar.png");
 const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const png=Buffer.concat(chunks);
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const binary=png.toString("latin1");for(const forbidden of ["Exif","GPS"])assert.equal(binary.includes(forbidden),false);

 // Case 2: no status bar (flat full-screen app) — must not force a crop.
 await page.getByRole("button",{name:"초기화",exact:true}).click();
 const flatCase=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");c.fillStyle="#dddddd";c.fillRect(0,0,1080,2400);return canvas.toDataURL("image/png")});
 await page.locator("#statusbar-file").setInputFiles({name:"flat-fullscreen.png",mimeType:"image/png",buffer:Buffer.from(flatCase.split(",")[1],"base64")});
 await page.getByText("1080 × 2400px",{exact:false}).waitFor();
 await page.getByText("상태바가 감지되지 않았습니다. 직접 제거 높이를 조정하세요.").waitFor();
 assert.equal(await page.locator('input[type="number"]').inputValue(),"0");

 // Case 3: landscape image — auto-detection disabled, manual still available.
 await page.getByRole("button",{name:"초기화",exact:true}).click();
 const landscapeCase=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=2000;canvas.height=1000;const c=canvas.getContext("2d");c.fillStyle="#eeeeee";c.fillRect(0,0,2000,1000);return canvas.toDataURL("image/png")});
 await page.locator("#statusbar-file").setInputFiles({name:"landscape.png",mimeType:"image/png",buffer:Buffer.from(landscapeCase.split(",")[1],"base64")});
 await page.getByText("2000 × 1000px",{exact:false}).waitFor();
 await page.getByText("현재 버전은 세로형 스마트폰 스크린샷에 최적화되어 있습니다. 자동 감지 없이 직접 조정해 사용하세요.").waitFor();
 await page.locator('input[type="number"]').fill("30");
 await page.getByRole("button",{name:"결과 만들기"}).click();await page.getByText("다운로드 준비").waitFor();

 // Resource cleanup: repeated load/clear cycles must not leak Object URLs.
 await page.getByRole("button",{name:"초기화",exact:true}).click();
 for(let i=0;i<3;i++){
  await page.locator("#statusbar-file").setInputFiles({name:`cycle-${i}.png`,mimeType:"image/png",buffer:clearBuffer});
  await page.getByText("1080 × 2400px",{exact:false}).waitFor();
  await page.getByText(/상태바 감지:/).waitFor();
  await page.getByRole("button",{name:"초기화",exact:true}).click();
 }
 const urlCounts=await page.evaluate(()=>window.__urlCounts);
 assert.equal(urlCounts.created,urlCounts.revoked,`Object URL leak: created ${urlCounts.created} but only revoked ${urlCounts.revoked}`);

 // Keyboard-only: reach the editor via Tab, adjust with arrow keys, activate the primary action with Enter (not a click).
 await page.locator("#statusbar-file").setInputFiles({name:"keyboard-only.png",mimeType:"image/png",buffer:clearBuffer});
 await page.getByText("1080 × 2400px",{exact:false}).waitFor();
 await page.getByText(/상태바 감지:/).waitFor();
 let tabs=0,foundEditor=false;
 while(tabs<40){
  await page.keyboard.press("Tab");tabs++;
  const label=await page.evaluate(()=>document.activeElement?.getAttribute("aria-label"));
  if(label==="상태바 제거선 편집기"){foundEditor=true;break;}
 }
 assert.ok(foundEditor,`could not reach the editor via Tab within 40 presses (stopped at ${tabs})`);
 const pxInputKb=page.locator('input[type="number"]'),beforeKb=Number(await pxInputKb.inputValue());
 await page.keyboard.press("ArrowDown");
 assert.equal(Number(await pxInputKb.inputValue()),beforeKb+1);
 await page.getByRole("button",{name:"결과 만들기"}).focus();
 await page.keyboard.press("Enter");
 await page.getByText("다운로드 준비").waitFor();

 const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
 assert.equal(JSON.stringify(storage).match(/clear-statusbar|data:image/i),null);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
 await context.close();

 for(const[locale,width,title]of[["ko",320,"스크린샷 상태바 제거"],["en",375,"Screenshot Status Bar Remover"],["ja",768,"スクリーンショットのステータスバー削除"]]){const mobile=await browser.newContext({viewport:{width,height:900}}),p=await mobile.newPage();p.on("console",message=>{if(message.type()==="error")consoleErrors.push(`${locale}: ${message.text()}`)});p.on("pageerror",error=>pageErrors.push(`${locale}: ${error.message}`));await p.goto(`${baseUrl}/${locale}/tools/screenshot-statusbar-remover`,{waitUntil:"domcontentloaded"});assert.equal(await p.getByRole("heading",{name:title,level:1}).isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);await mobile.close();}

 assert.deepEqual(sensitiveRequests,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);
 process.stdout.write(JSON.stringify({clearDetection:detectedPx,headerProtected:true,pxInput:true,slider:true,drag:true,keyboardNudge:true,reset:true,pngDownload:true,pngSignature:true,metadataLeak:0,notDetected:true,landscapeManual:true,objectUrlLeak:urlCounts.created-urlCounts.revoked,keyboardOnlyTabsToEditor:tabs,keyboardOnlyActivation:true,clientStorageLeak:0,locales:3,viewports:[320,375,768,1280],sensitiveRequests:0,consoleErrors:0,pageErrors:0},null,2));
}finally{await browser.close()}
