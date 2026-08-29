import {describe,expect,it,vi} from "vitest";
import {resizedDimensions,validDimensions,validateImageFile,MAX_FILE_BYTES} from "./file-validation";
import {formatBytes,outputFilename,outputMime,savingPercent} from "./format";
import {searchTarget} from "./target-search";

function fakeFile(type:string,size:number,bytes:number[]){return{type,size,slice:()=>({arrayBuffer:async()=>new Uint8Array(bytes).buffer})} as unknown as File;}
describe("image compressor domain",()=>{
 it("validates signatures and limits",async()=>{expect(await validateImageFile(fakeFile("image/jpeg",3,[0xff,0xd8,0xff]))).toEqual({ok:true,mime:"image/jpeg"});expect((await validateImageFile(fakeFile("image/png",3,[1,2,3]))).ok).toBe(false);expect((await validateImageFile(fakeFile("image/jpeg",MAX_FILE_BYTES+1,[0xff,0xd8,0xff]))).ok).toBe(false);});
 it("validates and resizes dimensions without enlargement",()=>{expect(validDimensions(4000,3000)).toBe(true);expect(validDimensions(12000,12000)).toBe(false);expect(resizedDimensions(4000,3000,1920)).toEqual({width:1920,height:1440});expect(resizedDimensions(800,600,1920)).toEqual({width:800,height:600});});
 it("formats results and safe names",()=>{expect(formatBytes(204800)).toBe("200 KB");expect(savingPercent(200,50)).toBe(75);expect(outputMime("original","image/png")).toBe("image/png");expect(outputFilename("bad:name.png","image/webp")).toBe("bad-name-compressed.webp");});
 it("finds the highest tested quality under target in at most ten iterations",async()=>{const encode=vi.fn(async(q:number)=>new Blob([new Uint8Array(Math.round(q*1000))],{type:"image/jpeg"}));const result=await searchTarget(encode,600);expect(result.candidate?.blob.size).toBeLessThanOrEqual(600);expect(result.candidate!.quality).toBeGreaterThan(.5);expect(result.iterations).toBeLessThanOrEqual(10);});
 it("returns null when even minimum quality misses",async()=>{const result=await searchTarget(async()=>new Blob([new Uint8Array(1000)]),100);expect(result.candidate).toBeNull();expect(result.iterations).toBeLessThanOrEqual(10);});
});
