import {describe,expect,it} from "vitest";
import {unzipSync} from "fflate";
import {buildImageZip,uniqueFilename} from "./zip";

describe("buildImageZip",()=>{
 it("packs entries so they round-trip through unzip with identical bytes",()=>{const a=new Uint8Array([1,2,3]),b=new Uint8Array([4,5,6,7]);const zip=buildImageZip([{name:"a.jpg",data:a},{name:"b.png",data:b}]);const out=unzipSync(zip);expect(Array.from(out["a.jpg"])).toEqual([1,2,3]);expect(Array.from(out["b.png"])).toEqual([4,5,6,7]);});
 it("produces an empty archive for no entries",()=>{expect(Object.keys(unzipSync(buildImageZip([])))).toEqual([]);});
});
describe("uniqueFilename",()=>{
 it("returns the name unchanged the first time it is seen",()=>{const used=new Set<string>();expect(uniqueFilename(used,"photo.jpg")).toBe("photo.jpg");});
 it("appends a counter before the extension on collision",()=>{const used=new Set<string>();uniqueFilename(used,"photo.jpg");expect(uniqueFilename(used,"photo.jpg")).toBe("photo (2).jpg");expect(uniqueFilename(used,"photo.jpg")).toBe("photo (3).jpg");});
 it("keeps counting past an already-taken numbered name",()=>{const used=new Set<string>(["photo.jpg","photo (2).jpg"]);expect(uniqueFilename(used,"photo.jpg")).toBe("photo (3).jpg");});
 it("handles a name with no extension",()=>{const used=new Set<string>();uniqueFilename(used,"photo");expect(uniqueFilename(used,"photo")).toBe("photo (2)");});
});
