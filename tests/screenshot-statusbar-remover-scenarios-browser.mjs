import assert from"node:assert/strict";
import{chromium}from"playwright-core";
const baseUrl=process.env.QA_BASE_URL??"http://127.0.0.1:3142",browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});
const consoleErrors=[],pageErrors=[],results={};
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
 page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text())});page.on("pageerror",error=>pageErrors.push(error.message));
 await page.goto(`${baseUrl}/ko/tools/screenshot-statusbar-remover`,{waitUntil:"networkidle"});

 async function upload(name,dataUrl){
  await page.locator("#statusbar-file").setInputFiles({name,mimeType:dataUrl.match(/data:([^;]+)/)[1],buffer:Buffer.from(dataUrl.split(",")[1],"base64")});
 }
 async function currentNotice(){
  const body=await page.locator("body").innerText();
  if(/상태바 감지:/.test(body)){const m=body.match(/상태바 감지: (\S+) · 제거 높이 (\d+)px/);return{state:"detected",confidence:m?.[1],px:Number(m?.[2])};}
  if(body.includes("상태바가 감지되지 않았습니다"))return{state:"not-detected"};
  if(body.includes("세로형 스마트폰 스크린샷에 최적화"))return{state:"landscape"};
  if(body.includes("이미지가 너무 작아"))return{state:"too-small"};
  return{state:"unknown"};
 }
 async function reset(){await page.getByRole("button",{name:"초기화",exact:true}).click();}

 // 1-2: iPhone-style bright/dark status bar with a Dynamic-Island-like pill.
 for(const[label,bg,fg,headerBg,headerFg]of[["iphoneLight","#ffffff","#111111","#f43f5e","#ffffff"],["iphoneDark","#000000","#ffffff","#7c3aed","#ffffff"]]){
  const dataUrl=await page.evaluate(([bg,fg,headerBg,headerFg])=>{
   const canvas=document.createElement("canvas");canvas.width=1170;canvas.height=2532;const c=canvas.getContext("2d");
   c.fillStyle=bg;c.fillRect(0,0,1170,2532);
   c.fillStyle=fg;c.font='bold 30px Arial';c.fillText("9:41",30,44);
   c.fillStyle="#000000";c.beginPath();c.roundRect(430,10,300,44,22);c.fill(); // Dynamic Island pill
   c.fillStyle=fg;c.fillRect(1030,14,80,26);
   c.fillStyle=headerBg;c.fillRect(0,59,1170,120);
   c.fillStyle=headerFg;c.font='bold 32px Arial';c.fillText("Messages",480,130);
   c.fillStyle=bg==="#000000"?"#111111":"#f5f5f5";c.fillRect(0,179,1170,2353);
   return canvas.toDataURL("image/png");
  },[bg,fg,headerBg,headerFg]);
  await upload(`${label}.png`,dataUrl);
  await page.getByText("1170 × 2532px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results[label]=await currentNotice();
  assert.notEqual(results[label].state,"unknown",`${label}: expected a recognizable state`);
  if(results[label].state==="detected")assert.ok(results[label].px<179,`${label}: crop (${results[label].px}px) must stay above the header at 59-179px`);
  await reset();
 }

 // 3-4: Android-style bright/dark status bar with a notch-like cutout.
 for(const[label,bg,fg,headerBg,headerFg]of[["androidLight","#fafafa","#212121","#1a73e8","#ffffff"],["androidDark","#0d0d0d","#e8eaed","#8ab4f8","#202124"]]){
  const dataUrl=await page.evaluate(([bg,fg,headerBg,headerFg])=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
   c.fillStyle=bg;c.fillRect(0,0,1080,2400);
   c.fillStyle=fg;c.font='bold 26px Roboto, Arial';c.fillText("9:41",26,32);
   c.fillStyle=fg;c.fillRect(960,10,90,22);
   c.fillStyle="#000000";c.beginPath();c.arc(540,-10,26,0,Math.PI*2);c.fill(); // punch-hole notch
   c.fillStyle=headerBg;c.fillRect(0,48,1080,110);
   c.fillStyle=headerFg;c.font='bold 30px Roboto, Arial';c.fillText("Settings",380,110);
   c.fillStyle=bg==="#0d0d0d"?"#1b1b1b":"#ffffff";c.fillRect(0,158,1080,2242);
   return canvas.toDataURL("image/png");
  },[bg,fg,headerBg,headerFg]);
  await upload(`${label}.png`,dataUrl);
  await page.getByText("1080 × 2400px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results[label]=await currentNotice();
  assert.notEqual(results[label].state,"unknown",`${label}: expected a recognizable state`);
  if(results[label].state==="detected")assert.ok(results[label].px<158,`${label}: crop (${results[label].px}px) must stay above the header at 48-158px`);
  await reset();
 }

 // 8: status bar and app header share the exact same background color (the hard case).
 {
  const dataUrl=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
   c.fillStyle="#f2f2f2";c.fillRect(0,0,1080,2400);
   c.fillStyle="#111111";c.font='bold 28px Arial';c.fillText("9:41",26,34);
   c.fillStyle="#111111";c.font='bold 22px Arial';c.fillText("5G  100%",900,32);
   c.fillStyle="#111111";c.font='bold 32px Arial';c.fillText("Home",480,120);
   c.strokeStyle="#cccccc";c.beginPath();c.moveTo(0,158);c.lineTo(1080,158);c.stroke();
   c.fillStyle="#ffffff";c.fillRect(0,159,1080,2241);
   return canvas.toDataURL("image/png");
  });
  await upload("same-bg.png",dataUrl);
  await page.getByText("1080 × 2400px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results.sameBackground=await currentNotice();
  // Whatever the outcome, it must never crop into or past the header (y>=158 would cut "Home").
  if(results.sameBackground.state==="detected")
   assert.ok(results.sameBackground.px<150,`same-bg: must not crop into the header, got ${results.sameBackground.px}px`);
  await reset();
 }

 // 9: status bar over a busy/gradient photo-like background.
 {
  const dataUrl=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
   const gradient=c.createLinearGradient(0,0,1080,300);gradient.addColorStop(0,"#f43f5e");gradient.addColorStop(.5,"#a855f7");gradient.addColorStop(1,"#0ea5e9");
   c.fillStyle=gradient;c.fillRect(0,0,1080,300);
   for(let i=0;i<40;i++){c.fillStyle=`rgba(255,255,255,${(i%5)/10})`;c.beginPath();c.arc(Math.random()*1080,Math.random()*300,20,0,Math.PI*2);c.fill();}
   c.fillStyle="#ffffff";c.font='bold 26px Arial';c.fillText("9:41",26,32);
   c.fillStyle="#ffffff";c.fillRect(1000,12,50,20);
   c.fillStyle="#ffffff";c.fillRect(0,300,1080,2100);
   return canvas.toDataURL("image/png");
  });
  await upload("photo-bg.png",dataUrl);
  await page.getByText("1080 × 2400px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results.photoBackground=await currentNotice();
  assert.notEqual(results.photoBackground.state,"unknown");
  await reset();
 }

 // 11: already-cropped image (content starts immediately, no status bar at all).
 {
  const dataUrl=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1800;const c=canvas.getContext("2d");
   c.fillStyle="#ffffff";c.fillRect(0,0,1080,1800);
   c.fillStyle="#111111";c.font='bold 32px Arial';c.fillText("Already cropped content",40,60);
   for(let y=120;y<1800;y+=80){c.fillStyle="#eeeeee";c.fillRect(20,y,1040,60);}
   return canvas.toDataURL("image/png");
  });
  await upload("already-cropped.png",dataUrl);
  await page.getByText("1080 × 1800px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results.alreadyCropped=await currentNotice();
  if(results.alreadyCropped.state==="detected")
   assert.ok(results.alreadyCropped.px<=90,`already-cropped: any false detection must stay shallow, got ${results.alreadyCropped.px}px`);
  await reset();
 }

 // 13-15: a range of realistic screenshot widths, same clear status bar pattern scaled proportionally.
 for(const width of[1170,1290,1440]){
  const height=Math.round(width*2400/1080),statusBarHeight=Math.round(width*48/1080);
  const dataUrl=await page.evaluate(([width,height,statusBarHeight])=>{
   const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const c=canvas.getContext("2d");
   c.fillStyle="#ffffff";c.fillRect(0,0,width,height);
   c.fillStyle="#111111";c.font='bold 28px Arial';c.fillText("9:41",24,32);
   c.fillStyle="#2563eb";c.fillRect(0,statusBarHeight,width,120);
   c.fillStyle="#ffffff";c.fillRect(0,statusBarHeight+120,width,height-statusBarHeight-120);
   return canvas.toDataURL("image/png");
  },[width,height,statusBarHeight]);
  await upload(`width-${width}.png`,dataUrl);
  await page.getByText(`${width} × ${height}px`,{exact:false}).waitFor();
  await page.waitForTimeout(300);
  const notice=await currentNotice();
  results[`width${width}`]=notice;
  assert.equal(notice.state,"detected",`width ${width}: expected a detection`);
  assert.ok(Math.abs(notice.px-statusBarHeight)<=Math.round(width*0.02),`width ${width}: expected close to ${statusBarHeight}px, got ${notice.px}`);
  await reset();
 }

 // 16: a very long, stitched-style screenshot — must still find the shallow status bar and finish quickly.
 {
  const start=Date.now();
  const dataUrl=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=9000;const c=canvas.getContext("2d");
   c.fillStyle="#ffffff";c.fillRect(0,0,1080,9000);
   c.fillStyle="#111111";c.font='bold 28px Arial';c.fillText("9:41",24,32);
   c.fillStyle="#2563eb";c.fillRect(0,48,1080,120);
   c.fillStyle="#ffffff";c.fillRect(0,168,1080,8832);
   for(let y=300;y<9000;y+=200){c.fillStyle="#f0f0f0";c.fillRect(20,y,1040,120);}
   return canvas.toDataURL("image/png");
  });
  await upload("very-long.png",dataUrl);
  await page.getByText("1080 × 9000px",{exact:false}).waitFor({timeout:20000});
  await page.getByText(/상태바 감지:|상태바가 감지되지 않았습니다/).waitFor({timeout:10000});
  const elapsed=Date.now()-start;
  results.veryLong={...await currentNotice(),elapsedMs:elapsed};
  assert.ok(elapsed<15000,`very-long: detection took too long (${elapsed}ms)`);
  if(results.veryLong.state==="detected")assert.ok(results.veryLong.px<168,`very-long: must stay above the header, got ${results.veryLong.px}px`);
  await reset();
 }

 // 18-19: JPEG and WebP formats.
 for(const[format,mime]of[["jpeg","image/jpeg"],["webp","image/webp"]]){
  const dataUrl=await page.evaluate(mime=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
   c.fillStyle="#ffffff";c.fillRect(0,0,1080,2400);
   c.fillStyle="#111111";c.font='bold 28px Arial';c.fillText("9:41",24,32);
   c.fillStyle="#2563eb";c.fillRect(0,48,1080,120);
   c.fillStyle="#ffffff";c.fillRect(0,168,1080,2232);
   return canvas.toDataURL(mime,.92);
  },mime);
  await upload(`fixture.${format==="jpeg"?"jpg":format}`,dataUrl);
  await page.getByText("1080 × 2400px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  const notice=await currentNotice();
  results[format]=notice;
  assert.equal(notice.state,"detected",`${format}: expected a detection`);
  await page.getByRole("button",{name:"결과 만들기"}).click();
  await page.getByText("다운로드 준비").waitFor();
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"PNG 다운로드"}).click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),new RegExp(`fixture-no-statusbar\\.${format==="jpeg"?"jpg":format}$`));
  await reset();
 }

 // 20: EXIF Orientation JPEG — displayed/detected geometry must follow the corrected orientation.
 {
  const plainJpeg=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=2400;const c=canvas.getContext("2d");
   c.fillStyle="#ffffff";c.fillRect(0,0,1080,2400);
   c.fillStyle="#111111";c.font='bold 28px Arial';c.fillText("9:41",24,32);
   c.fillStyle="#2563eb";c.fillRect(0,48,1080,120);
   c.fillStyle="#ffffff";c.fillRect(0,168,1080,2232);
   return canvas.toDataURL("image/jpeg",.95);
  });
  function withOrientation(jpeg,orientation){const tiff=Buffer.alloc(26);tiff.write("II",0,"ascii");tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);tiff.writeUInt16LE(1,8);tiff.writeUInt16LE(0x0112,10);tiff.writeUInt16LE(3,12);tiff.writeUInt32LE(1,14);tiff.writeUInt16LE(orientation,18);tiff.writeUInt32LE(0,22);const payload=Buffer.concat([Buffer.from("Exif\0\0","binary"),tiff]),header=Buffer.alloc(4);header[0]=0xff;header[1]=0xe1;header.writeUInt16BE(payload.length+2,2);return Buffer.concat([jpeg.subarray(0,2),header,payload,jpeg.subarray(2)]);}
  const oriented=withOrientation(Buffer.from(plainJpeg.split(",")[1],"base64"),6);
  await page.locator("#statusbar-file").setInputFiles({name:"oriented.jpg",mimeType:"image/jpeg",buffer:oriented});
  await page.getByText("2400 × 1080px",{exact:false}).waitFor();
  results.exifOrientation={displayed:"2400x1080 (rotated)"};
  await reset();
 }

 // 30: too-small image — automatic detection disabled, manual-only.
 {
  const dataUrl=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=200;canvas.height=350;const c=canvas.getContext("2d");c.fillStyle="#eeeeee";c.fillRect(0,0,200,350);return canvas.toDataURL("image/png")});
  await upload("tiny.png",dataUrl);
  await page.getByText("200 × 350px",{exact:false}).waitFor();
  await page.waitForTimeout(300);
  results.tooSmall=await currentNotice();
  assert.equal(results.tooSmall.state,"too-small");
  await reset();
 }

 assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);
 await context.close();

 // 34: Desktop 1440px viewport.
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),dp=await desktop.newPage();
 dp.on("console",message=>{if(message.type()==="error")consoleErrors.push(`1440: ${message.text()}`)});
 dp.on("pageerror",error=>pageErrors.push(`1440: ${error.message}`));
 await dp.goto(`${baseUrl}/ko/tools/screenshot-statusbar-remover`,{waitUntil:"domcontentloaded"});
 assert.equal(await dp.getByRole("heading",{name:"스크린샷 상태바 제거",level:1}).isVisible(),true);
 assert.equal(await dp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
 await desktop.close();

 assert.deepEqual(consoleErrors,[]);assert.deepEqual(pageErrors,[]);
 process.stdout.write(JSON.stringify({results,consoleErrors:0,pageErrors:0},null,2));
}finally{await browser.close()}
