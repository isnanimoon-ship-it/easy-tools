import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, formatFileSize, validateImageDimensions, validateImageFile } from "./file-validation";
const file = (type:string, bytes:number[]) => new File([new Uint8Array(bytes)], "x", {type});
describe("file validation", () => {
  it.each([["image/png",[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],"PNG"],["image/jpeg",[0xff,0xd8,0xff],"JPEG"],["image/webp",[82,73,70,70,0,0,0,0,87,69,66,80],"WebP"]] as const)("accepts %s signature", async(type,bytes,format)=>expect(await validateImageFile(file(type,[...bytes]))).toEqual({ok:true,format}));
  it("rejects unsupported and mismatched data", async()=>{expect(await validateImageFile(file("image/gif",[1]))).toMatchObject({reason:"unsupported-type"});expect(await validateImageFile(file("image/png",[1]))).toMatchObject({reason:"signature-mismatch"});});
  it("checks limits and formats sizes", async()=>{const oversized={type:"image/png",size:MAX_FILE_BYTES+1,slice:()=>new Blob()};expect(await validateImageFile(oversized)).toMatchObject({reason:"file-too-large"});expect(validateImageDimensions(6000,4000)).toBe(true);expect(validateImageDimensions(6001,4000)).toBe(false);expect(formatFileSize(1024)).toBe("1 KiB");});
});
