import{describe,expect,it}from"vitest";
import{detectOverlap,scoreOverlapCandidate}from"./overlap";
import{isAnimatedWebp,outputGeometry,validateFiles,validDimensions}from"./validation";
import type{AnalysisImage}from"./types";
function source(width:number,height:number,seed=0){const gray=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)gray[y*width+x]=(x*17+y*29+((x*y+seed*31)%97)*3+seed*41)%256;return gray;}
function crop(data:Uint8Array,width:number,start:number,height:number):AnalysisImage{const gray=data.slice(start*width,(start+height)*width),gradient=new Uint8Array(gray.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;gradient[i]=Math.min(255,Math.abs(gray[i]-gray[y*width+Math.max(0,x-1)])+Math.abs(gray[i]-gray[Math.max(0,y-1)*width+x]));}return{width,height,gray,gradient};}
describe("screenshot overlap",()=>{
 it("detects an exact synthetic overlap",()=>{const data=source(80,260),a=crop(data,80,0,160),b=crop(data,80,110,150),result=detectOverlap(a,b);expect(scoreOverlapCandidate(a,b,50).error).toBeLessThan(scoreOverlapCandidate(a,b,43).error);expect(result.overlap).toBe(50);expect(result.accepted).toBe(true);expect(result.confidence).toBeGreaterThanOrEqual(80);});
 it("does not accept unrelated images",()=>{const a=source(80,160,1),b=source(80,160,7),result=detectOverlap(crop(a,80,0,160),crop(b,80,0,160));expect(result.accepted).toBe(false);});
 it("does not accept flat ambiguous images",()=>{const flat=new Uint8Array(80*160).fill(128),result=detectOverlap(crop(flat,80,0,160),crop(flat,80,0,160));expect(result.accepted).toBe(false);expect(result.reason).toBe("low-texture");});
});
describe("stitch limits",()=>{
 const file=(name:string,size=10,type="image/png")=>new File([new Uint8Array(size)],name,{type});
 it("validates count, type and total bytes",()=>{expect(validateFiles([],Array.from({length:21},(_,i)=>file(`${i}.png`)))).toEqual({ok:false,reason:"too-many-files"});expect(validateFiles([],[file("x.gif",1,"image/gif")])).toEqual({ok:false,reason:"unsupported-type"});expect(validateFiles([],[file("x.png")])).toEqual({ok:true});});
 it("validates dimensions and output geometry",()=>{expect(validDimensions(6000,5000)).toBe(true);expect(validDimensions(6001,5000)).toBe(false);expect(outputGeometry([{width:1000,height:2000},{width:500,height:1000}],[500])).toMatchObject({width:1000,height:3500,totalHeight:4000,removed:500});expect(()=>outputGeometry([{width:8192,height:8192},{width:8192,height:8192}],[0])).toThrow("output-limit");});
 it("detects the animated WebP flag",async()=>{const bytes=new Uint8Array(24);bytes.set([..."RIFF"].map(v=>v.charCodeAt(0)),0);bytes.set([..."WEBPVP8X"].map(v=>v.charCodeAt(0)),8);bytes[20]=2;expect(await isAnimatedWebp(new File([bytes],"animated.webp",{type:"image/webp"}))).toBe(true);expect(await isAnimatedWebp(file("still.png"))).toBe(false);});
});
