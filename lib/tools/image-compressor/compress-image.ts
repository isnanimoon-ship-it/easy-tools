import { resizedDimensions, validDimensions, type ImageMime } from "./file-validation";
import { searchTarget } from "./target-search";

export type CompressionOptions={mime:ImageMime;mode:"quality"|"target";quality:number;targetBytes:number;maxWidth:number|null;generationValid?:()=>boolean;onProgress?:(current:number,max:number)=>void};
export type CompressionResult={blob:Blob;width:number;height:number;quality:number|null;targetMet:boolean};

function toBlob(canvas:HTMLCanvasElement,mime:ImageMime,quality?:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("encode-failed")),mime,quality));}
export async function decodeImage(file:Blob){return createImageBitmap(file,{imageOrientation:"from-image"});}

export async function compressImage(file:Blob,options:CompressionOptions):Promise<CompressionResult>{
  const bitmap=await decodeImage(file);let canvas:HTMLCanvasElement|null=null;
  try{
    if(!validDimensions(bitmap.width,bitmap.height))throw new Error("invalid-dimensions");
    const size=resizedDimensions(bitmap.width,bitmap.height,options.maxWidth);canvas=document.createElement("canvas");canvas.width=size.width;canvas.height=size.height;
    const context=canvas.getContext("2d");if(!context)throw new Error("encode-failed");context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";
    if(options.mime==="image/jpeg"){context.fillStyle="#fff";context.fillRect(0,0,size.width,size.height);}context.drawImage(bitmap,0,0,size.width,size.height);
    const encode=async(quality:number)=>{if(options.generationValid&&!options.generationValid())throw new Error("stale");const blob=await toBlob(canvas!,options.mime,options.mime==="image/png"?undefined:quality);if(blob.type!==options.mime)throw new Error("encoder-unsupported");return blob;};
    let blob:Blob,quality:number|null,targetMet=true;
    if(options.mode==="target"&&options.mime!=="image/png"){const found=await searchTarget(encode,options.targetBytes,10,options.onProgress);if(!found.candidate){blob=await encode(.1);quality=.1;targetMet=false;}else{blob=found.candidate.blob;quality=found.candidate.quality;}}
    else{quality=options.mime==="image/png"?null:options.quality/100;blob=await encode(quality??1);targetMet=options.mode!=="target"||blob.size<=options.targetBytes;}
    const verification=await createImageBitmap(blob);try{if(verification.width!==size.width||verification.height!==size.height)throw new Error("encode-failed");}finally{verification.close();}
    return{blob,width:size.width,height:size.height,quality,targetMet};
  }finally{bitmap.close();if(canvas){canvas.width=0;canvas.height=0;}}
}
