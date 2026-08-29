import{STITCH_LIMITS,type StitchMime}from"./types";
const allowed=new Set<StitchMime>(["image/png","image/jpeg","image/webp"]);
export type FileError="too-many-files"|"unsupported-type"|"file-too-large"|"total-too-large";
export function validateFiles(existing:File[],incoming:File[]):{ok:true}|{ok:false;reason:FileError}{
 const all=[...existing,...incoming];
 if(all.length>STITCH_LIMITS.maxFiles)return{ok:false,reason:"too-many-files"};
 if(incoming.some(file=>!allowed.has(file.type as StitchMime)))return{ok:false,reason:"unsupported-type"};
 if(incoming.some(file=>file.size>STITCH_LIMITS.maxFileBytes))return{ok:false,reason:"file-too-large"};
 if(all.reduce((sum,file)=>sum+file.size,0)>STITCH_LIMITS.maxTotalBytes)return{ok:false,reason:"total-too-large"};
 return{ok:true};
}
export function validDimensions(width:number,height:number){return width>0&&height>0&&width<=STITCH_LIMITS.maxDimension&&height<=STITCH_LIMITS.maxDimension&&width*height<=STITCH_LIMITS.maxPixels;}
async function blobBuffer(blob:Blob){if(typeof blob.arrayBuffer==="function")return blob.arrayBuffer();return new Promise<ArrayBuffer>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(blob);});}
export async function isAnimatedWebp(file:File){if(file.type!=="image/webp")return false;const bytes=new Uint8Array(await blobBuffer(file.slice(0,Math.min(file.size,65_536))));if(bytes.length>20&&String.fromCharCode(...bytes.slice(12,16))==="VP8X"&&(bytes[20]&2)!==0)return true;for(let index=12;index+4<=bytes.length;index++)if(bytes[index]===65&&bytes[index+1]===78&&bytes[index+2]===73&&bytes[index+3]===77)return true;return false;}
export function outputGeometry(dimensions:Array<{width:number;height:number}>,overlaps:number[]){
 if(!dimensions.length)throw new Error("too-few-files");const width=dimensions[0].width;
 const heights=dimensions.map(item=>Math.round(item.height*width/item.width));
 const totalHeight=heights.reduce((sum,value)=>sum+value,0),removed=overlaps.reduce((sum,value)=>sum+value,0),height=totalHeight-removed;
 if(width>STITCH_LIMITS.maxOutputWidth||height>STITCH_LIMITS.maxOutputHeight||width*height>STITCH_LIMITS.maxOutputPixels)throw new Error("output-limit");
 return{width,height,heights,totalHeight,removed};
}
