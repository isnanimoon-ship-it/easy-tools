export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 24_000_000;
export const MAX_DIMENSION = 12_000;
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export type ValidationError = "unsupported-format" | "file-too-large" | "signature-mismatch";

const allowed = new Set<ImageMime>(["image/jpeg", "image/png", "image/webp"]);

export async function validateImageFile(file: Pick<File,"type"|"size"|"slice">): Promise<{ok:true;mime:ImageMime}|{ok:false;reason:ValidationError}> {
  if (!allowed.has(file.type as ImageMime)) return {ok:false,reason:"unsupported-format"};
  if (file.size > MAX_FILE_BYTES) return {ok:false,reason:"file-too-large"};
  const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v);
  const jpeg=bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const webp=bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  const valid=file.type==="image/png"?png:file.type==="image/jpeg"?jpeg:webp;
  return valid?{ok:true,mime:file.type as ImageMime}:{ok:false,reason:"signature-mismatch"};
}

export function validDimensions(width:number,height:number){return Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&width>0&&height>0&&width<=MAX_DIMENSION&&height<=MAX_DIMENSION&&width*height<=MAX_PIXELS;}
export function resizedDimensions(width:number,height:number,maxWidth:number|null){if(!maxWidth||width<=maxWidth)return{width,height};return{width:maxWidth,height:Math.max(1,Math.round(height*maxWidth/width))};}
