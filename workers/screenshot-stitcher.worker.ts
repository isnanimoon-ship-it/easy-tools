/// <reference lib="webworker" />
import{createAnalysisImage,detectOverlap}from"@/lib/tools/screenshot-stitcher/overlap";
import{outputGeometry,validDimensions}from"@/lib/tools/screenshot-stitcher/validation";
import type{AnalysisImage,OverlapResult,WorkerRequest,WorkerResponse}from"@/lib/tools/screenshot-stitcher/types";
const scope=self as DedicatedWorkerGlobalScope;
function send(message:WorkerResponse){scope.postMessage(message);}
async function decodeAnalysis(file:File,targetWidth:number){
 const source=await createImageBitmap(file,{imageOrientation:"from-image"});
 try{if(!validDimensions(source.width,source.height))throw new Error("dimension-limit");const width=Math.min(targetWidth,source.width),height=Math.max(1,Math.round(source.height*width/source.width)),canvas=new OffscreenCanvas(width,height),context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("canvas-limit");context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);return{analysis:createAnalysisImage(context.getImageData(0,0,width,height)),dimension:{width:source.width,height:source.height}};}finally{source.close();}
}
async function analyze(request:Extract<WorkerRequest,{type:"analyze"}>){
 const low:Array<{analysis:AnalysisImage;dimension:{width:number;height:number}}>=[],high:AnalysisImage[]=[];
 for(let index=0;index<request.files.length;index++){const item=await decodeAnalysis(request.files[index],360),refined=await decodeAnalysis(request.files[index],720);low.push(item);high.push(refined.analysis);send({type:"progress",generation:request.generation,current:index+1,total:request.files.length+request.files.length-1});}
 const outputWidth=request.outputWidth??low[0].dimension.width,results:OverlapResult[]=[];
 for(let index=0;index<low.length-1;index++){const settings=request.connections[index],aScale=low[index].analysis.width/outputWidth,bScale=low[index+1].analysis.width/outputWidth,lowResult=detectOverlap(low[index].analysis,low[index+1].analysis,Math.round(settings.excludeBottom*aScale),Math.round(settings.excludeTop*bScale));const highAScale=high[index].width/outputWidth,highBScale=high[index+1].width/outputWidth,highResult=detectOverlap(high[index],high[index+1],Math.round(settings.excludeBottom*highAScale),Math.round(settings.excludeTop*highBScale));const overlap=Math.round(highResult.overlap/highAScale),difference=Math.abs(overlap-Math.round(lowResult.overlap/aScale)),widthDifference=Math.abs(low[index].dimension.width-low[index+1].dimension.width)/low[index].dimension.width,accepted=lowResult.accepted&&highResult.accepted&&difference<=5&&widthDifference<=.1;results.push({...highResult,overlap,accepted,confidence:Math.min(lowResult.confidence,highResult.confidence),reason:accepted?undefined:widthDifference>.1?"width-mismatch":difference>5?"unstable":highResult.reason});send({type:"progress",generation:request.generation,current:request.files.length+index+1,total:request.files.length+request.files.length-1});}
 send({type:"analysis",generation:request.generation,results,dimensions:low.map(item=>item.dimension),pairIndex:request.pairIndex});
}
async function compose(request:Extract<WorkerRequest,{type:"compose"}>){
 const dimensions:Array<{width:number;height:number}>=[];for(const file of request.files){const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});dimensions.push({width:bitmap.width,height:bitmap.height});bitmap.close();}
 const geometry=outputGeometry(dimensions,request.overlaps),canvas=new OffscreenCanvas(geometry.width,geometry.height),context=canvas.getContext("2d");if(!context)throw new Error("canvas-limit");let y=0;
 for(let index=0;index<request.files.length;index++){const bitmap=await createImageBitmap(request.files[index],{imageOrientation:"from-image"});try{const scale=geometry.width/bitmap.width,overlap=index===0?0:request.overlaps[index-1],sourceTop=overlap/scale,sourceHeight=bitmap.height-sourceTop,destinationHeight=Math.round(sourceHeight*scale);context.drawImage(bitmap,0,sourceTop,bitmap.width,sourceHeight,0,y,geometry.width,destinationHeight);y+=destinationHeight;}finally{bitmap.close();}send({type:"progress",generation:request.generation,current:index+1,total:request.files.length});}
 const blob=await canvas.convertToBlob({type:"image/png"});if(!blob.size)throw new Error("canvas-limit");send({type:"composed",generation:request.generation,blob,width:geometry.width,height:geometry.height,totalHeight:geometry.totalHeight,removed:geometry.removed});
}
scope.onmessage=(event:MessageEvent<WorkerRequest>)=>{const request=event.data;(request.type==="analyze"?analyze(request):compose(request)).catch(reason=>send({type:"error",generation:request.generation,code:reason instanceof Error?reason.message:"canvas-limit"}));};
export{};
