import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { unzipSync } from "fflate";

const baseUrl=process.env.QA_BASE_URL??"http://127.0.0.1:3126";
const browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});
const consoleErrors=[],pageErrors=[],externalRequests=[];
function watch(page,label){page.on("console",m=>{if(m.type()==="error")consoleErrors.push(`${label}: ${m.text()}`)});page.on("pageerror",e=>pageErrors.push(`${label}: ${e.message}`));page.on("request",request=>{const host=new URL(request.url()).hostname;if(!request.url().startsWith(baseUrl)&&!request.url().startsWith("blob:")&&!/(^|\.)(naver\.com|pstatic\.net|googlesyndication\.com|doubleclick\.net|adtrafficquality\.google|google\.com)$/.test(host))externalRequests.push(request.url())});}
async function imageBytes(page,type,width=900,height=600,alpha=false){return Buffer.from(await page.evaluate(async({type,width,height,alpha})=>{const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const c=canvas.getContext("2d");const gradient=c.createLinearGradient(0,0,width,height);gradient.addColorStop(0,"#2563eb");gradient.addColorStop(1,alpha?"rgba(244,63,94,.25)":"#f43f5e");c.fillStyle=gradient;c.fillRect(0,0,width,height);c.fillStyle="#fff";c.font="bold 72px sans-serif";c.fillText("KONLY 압축 😀",40,150);const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.95));return [...new Uint8Array(await blob.arrayBuffer())];},{type,width,height,alpha}));}
function withExifOrientation(jpeg,orientation){const payload=Buffer.from([0x45,0x78,0x69,0x66,0,0,0x49,0x49,0x2a,0,8,0,0,0,1,0,0x12,0x01,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]);const segment=Buffer.concat([Buffer.from([0xff,0xe1,0,34]),payload]);return Buffer.concat([jpeg.subarray(0,2),segment,jpeg.subarray(2)]);}
async function upload(page,name,mime,buffer){await page.locator("#compressor-file").setInputFiles({name,mimeType:mime,buffer});await page.getByRole("heading",{name:/용량 비교|File size comparison|容量比較/}).waitFor({timeout:15000});}
async function resultAlpha(page){return page.evaluate(async()=>{const images=[...document.querySelectorAll("img")].filter(image=>image.alt.includes("결과"));const image=images.at(-1);const bitmap=await createImageBitmap(await (await fetch(image.src)).blob());const canvas=document.createElement("canvas");canvas.width=1;canvas.height=1;const context=canvas.getContext("2d");context.drawImage(bitmap,bitmap.width-1,bitmap.height-1,1,1,0,0,1,1);bitmap.close();return context.getImageData(0,0,1,1).data[3];});}

let largeDurationMs=0;
try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:900}});const page=await context.newPage();watch(page,"ko/1440");await page.goto(`${baseUrl}/ko/tools/image-compressor`,{waitUntil:"domcontentloaded"});
 const jpg=await imageBytes(page,"image/jpeg");await upload(page,"photo.jpg","image/jpeg",jpg);assert.equal(await page.getByText("image/jpeg",{exact:true}).first().isVisible(),true);assert.equal(await page.getByRole("slider",{name:"품질"}).inputValue(),"80");
 for(const value of [20,50,100]){const heading=page.getByRole("heading",{name:"용량 비교"});await page.getByRole("slider",{name:"품질"}).fill(String(value));await heading.waitFor({state:"detached"});await heading.waitFor({timeout:15000});assert.equal(await page.getByText(`${value}%`,{exact:true}).last().isVisible(),true);}
 await page.getByLabel("출력 형식").selectOption("image/webp");await page.getByRole("heading",{name:"용량 비교"}).waitFor();assert.equal(await page.getByText("image/webp",{exact:true}).last().isVisible(),true);
 await page.getByLabel("목표 용량").check();await page.getByRole("button",{name:"100 KB"}).click();await page.getByText("선택한 목표 용량 이하로 압축했습니다.").waitFor({timeout:15000});
 for(const name of ["200 KB","500 KB","1 MB"]){await page.getByRole("button",{name}).click();await page.getByText("선택한 목표 용량 이하로 압축했습니다.").waitFor({timeout:15000});}
 const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"압축 이미지 다운로드"}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/-compressed\.webp$/);
 const png=await imageBytes(page,"image/png",500,400,true);await page.locator("#compressor-file").setInputFiles({name:"transparent.png",mimeType:"image/png",buffer:png});await page.getByText(/PNG 출력은 품질 값/).waitFor({timeout:15000});await page.getByRole("heading",{name:"용량 비교"}).waitFor({timeout:15000});assert.ok(await resultAlpha(page)<255);await page.getByLabel("출력 형식").selectOption("image/jpeg");await page.getByText(/투명 영역에 흰색 배경/).waitFor();await page.getByRole("heading",{name:"용량 비교"}).waitFor({timeout:15000});assert.equal(await resultAlpha(page),255);
 await page.locator("#compressor-file").setInputFiles({name:"bad.gif",mimeType:"image/gif",buffer:Buffer.from("GIF89a")});assert.equal(await page.locator('p[role="alert"]').textContent(),"JPG, PNG 또는 WebP 이미지를 선택하세요.");
 const orientationSource=await imageBytes(page,"image/jpeg",40,20);for(const orientation of [1,2,3,4,5,6,7,8]){const name=`orientation-${orientation}.jpg`;await page.locator("#compressor-file").setInputFiles({name,mimeType:"image/jpeg",buffer:withExifOrientation(orientationSource,orientation)});await page.getByText(name,{exact:true}).waitFor();await page.getByText(orientation>=5?"20 × 40px":"40 × 20px",{exact:true}).first().waitFor({timeout:15000});}
 await page.getByLabel("품질 기준").check();const large=await imageBytes(page,"image/jpeg",6000,4000);const largeStart=Date.now();await upload(page,"large-24mp.jpg","image/jpeg",large);largeDurationMs=Date.now()-largeStart;assert.ok(largeDurationMs<10000);

 // Batch mode: multiple files compressed with shared settings, ZIP download (IDEAS.md #13).
 await page.getByRole("tab",{name:"여러 이미지 (ZIP)"}).click();
 const batchJpg1=await imageBytes(page,"image/jpeg",400,300),batchJpg2=await imageBytes(page,"image/jpeg",500,350),batchPng=await imageBytes(page,"image/png",300,200,true);
 await page.locator("#compressor-batch-files").setInputFiles([
  {name:"batch-1.jpg",mimeType:"image/jpeg",buffer:batchJpg1},
  {name:"batch-2.jpg",mimeType:"image/jpeg",buffer:batchJpg2},
  {name:"batch-3.png",mimeType:"image/png",buffer:batchPng},
  {name:"batch-bad.gif",mimeType:"image/gif",buffer:Buffer.from("GIF89a")},
 ]);
 await page.getByText("batch-bad.gif",{exact:true}).waitFor();
 assert.equal(await page.getByText("실패",{exact:true}).count(),1,"the unsupported GIF should be marked failed immediately at add-time, before Run is even clicked");
 await page.getByLabel("목표 용량").check();await page.getByRole("button",{name:"200 KB"}).click();
 await page.getByRole("button",{name:"일괄 압축 시작"}).click();
 await page.waitForFunction(()=>document.body.innerText.includes("총 4장 중 3장 압축 완료"),{timeout:20000});
 assert.equal(await page.getByText("완료",{exact:true}).count(),3,"three valid images finish while the invalid GIF stays failed, not silently dropped");
 const zipDownloadPromise=page.waitForEvent("download");
 await page.getByRole("button",{name:"ZIP으로 다운로드"}).click();
 const zipDownload=await zipDownloadPromise;
 assert.equal(zipDownload.suggestedFilename(),"compressed-images.zip");
 const zipEntries=unzipSync(new Uint8Array(await readFile(await zipDownload.path())));
 assert.equal(Object.keys(zipEntries).length,3,"the zip contains only the 3 successfully compressed images, never the failed GIF");
 assert.ok(Object.keys(zipEntries).every(name=>/\.(jpg|png|webp)$/.test(name)));

 // More files than the batch limit is rejected up front without touching the existing list.
 const tooMany=Array.from({length:51},(_,index)=>({name:`over-limit-${index}.jpg`,mimeType:"image/jpeg",buffer:Buffer.from([0xff,0xd8,0xff])}));
 await page.locator("#compressor-batch-files").setInputFiles(tooMany);
 assert.equal(await page.locator('p[role="alert"]').textContent(),"한 번에 최대 50장까지 선택할 수 있습니다.");
 assert.equal(await page.getByText("batch-1.jpg",{exact:true}).isVisible(),true,"a rejected over-limit selection must not clear the previous valid batch");

 // Clear resets the batch queue and its error state.
 await page.getByRole("button",{name:"초기화",exact:true}).click();
 assert.equal(await page.getByText("batch-1.jpg",{exact:true}).count(),0);
 assert.equal(await page.locator('p[role="alert"]').count(),0);

 await context.close();
 for(const [locale,width,title] of [["ko",320,"이미지 용량 줄이기"],["en",375,"Reduce image file size"],["ja",768,"画像ファイルサイズを小さくする"]]){const c=await browser.newContext({viewport:{width,height:850}});const p=await c.newPage();watch(p,`${locale}/${width}`);await p.goto(`${baseUrl}/${locale}/tools/image-compressor`,{waitUntil:"domcontentloaded"});assert.equal(await p.getByRole("heading",{name:title}).isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
  if(locale==="ko"&&width===320){await p.getByRole("tab",{name:"여러 이미지 (ZIP)"}).click();await p.locator("#compressor-batch-files").setInputFiles({name:"mobile.jpg",mimeType:"image/jpeg",buffer:await imageBytes(p,"image/jpeg",300,200)});await p.getByText("mobile.jpg",{exact:true}).waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,"batch tab must not cause horizontal overflow at 320px");}
  await c.close();}
 assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);assert.deepEqual(externalRequests,[]);
 process.stdout.write(JSON.stringify({formats:["JPEG","PNG","WebP"],qualities:[20,50,80,100],targetPresets:["100KB","200KB","500KB","1MB"],alpha:{png:"preserved",jpeg:"white-background"},orientations:[1,2,3,4,5,6,7,8],largeImage:"6000x4000",largeDurationMs,download:"PASS",batch:{partialFailure:"PASS",zipDownload:"PASS",tooManyFiles:"PASS",clear:"PASS",mobileOverflow:"PASS"},viewports:[320,375,768,1440],locales:["ko","en","ja"],externalImageRequests:0,consoleErrors:0,pageErrors:0,horizontalOverflow:0},null,2));
}finally{await browser.close()}
