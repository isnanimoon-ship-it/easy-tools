import type{AnalysisImage,OverlapResult}from"./types";
type Candidate={height:number;error:number;bands:number[];spread:number};
const MAX_ERROR=.085;
function mean(values:number[]){return values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length);}
function candidate(a:AnalysisImage,b:AnalysisImage,height:number,aBottom:number,bTop:number):Candidate{
 const width=Math.min(a.width,b.width),left=Math.floor(width*.05),right=Math.ceil(width*.95),bandWidth=(right-left)/5;
 const stepY=Math.max(1,Math.floor(height/96)),bands=Array.from({length:5},()=>({pixel:0,gradient:0,count:0}));
 const aStart=a.height-aBottom-height;
 for(let y=0;y<height;y+=stepY){const ay=aStart+y,by=bTop+y;if(ay<0||by>=b.height)continue;for(let x=left;x<right;x+=2){const band=Math.min(4,Math.floor((x-left)/bandWidth)),entry=bands[band],ai=ay*a.width+x,bi=by*b.width+x;entry.pixel+=Math.abs(a.gray[ai]-b.gray[bi])/255;entry.gradient+=Math.abs(a.gradient[ai]-b.gradient[bi])/255;entry.count++;}}
 const scores=bands.map(v=>v.count?(.65*v.pixel+.35*v.gradient)/v.count:1),sorted=[...scores].sort((x,y)=>x-y),trimmed=sorted.slice(1,4),error=mean(trimmed),spread=Math.sqrt(mean(scores.map(value=>(value-error)**2)));
 return{height,error,bands:scores,spread};
}
export function scoreOverlapCandidate(a:AnalysisImage,b:AnalysisImage,height:number,excludeBottom=0,excludeTop=0){return candidate(a,b,height,excludeBottom,excludeTop);}
function texture(image:AnalysisImage,start:number,height:number){let sum=0,sum2=0,count=0;const step=Math.max(1,Math.floor(height/80));for(let y=start;y<start+height;y+=step)for(let x=Math.floor(image.width*.1);x<image.width*.9;x+=4){const v=image.gradient[y*image.width+x]/255;sum+=v;sum2+=v*v;count++;}const avg=sum/Math.max(1,count);return sum2/Math.max(1,count)-avg*avg;}
function quickError(a:AnalysisImage,b:AnalysisImage,height:number,aBottom:number,bTop:number){const width=Math.min(a.width,b.width),aStart=a.height-aBottom-height;let error=0,count=0;for(let sample=0;sample<16;sample++){const y=Math.min(height-1,Math.floor((sample+.5)*height/16)),ay=aStart+y,by=bTop+y;for(let x=Math.floor(width*.06);x<width*.94;x+=Math.max(1,Math.floor(width/24))){error+=Math.abs(a.gray[ay*a.width+x]-b.gray[by*b.width+x]);count++;}}return error/(Math.max(1,count)*255);}
export function detectOverlap(a:AnalysisImage,b:AnalysisImage,excludeBottom=0,excludeTop=0):OverlapResult{
 const usable=Math.min(a.height-excludeBottom,b.height-excludeTop),min=Math.min(24,Math.max(1,usable-1)),max=Math.floor(usable*.65);
 if(max<min)return{overlap:0,confidence:0,accepted:false,error:1,reason:"range"};
 const shortlist:Array<{height:number;error:number}>=[];for(let h=min;h<=max;h++)shortlist.push({height:h,error:quickError(a,b,h,excludeBottom,excludeTop)});shortlist.sort((x,y)=>x.error-y.error);
 const refined=shortlist.slice(0,12).map(item=>candidate(a,b,item.height,excludeBottom,excludeTop)).sort((x,y)=>x.error-y.error),best=refined[0];
 const independent=refined.filter(item=>Math.abs(item.height-best.height)>3).sort((x,y)=>x.error-y.error)[0],gap=(independent?.error??1)-best.error;
 const tex=Math.min(texture(a,a.height-excludeBottom-best.height,best.height),texture(b,excludeTop,best.height));
 const bandAgreement=best.bands.filter(score=>score<=MAX_ERROR*1.25).length;
 const boundary=best.height<=min+1||best.height>=max-1,accepted=best.error<=MAX_ERROR&&best.spread<=.035&&gap>=.012&&bandAgreement>=3&&tex>=.00002&&!boundary;
 const confidence=Math.round(100*Math.max(0,Math.min(1,.45*(1-best.error/MAX_ERROR)+.2*Math.min(1,gap/.03)+.15*(bandAgreement/5)+.1*Math.min(1,tex/.001)+.1*(boundary?0:1))));
 return{overlap:best.height,confidence,accepted:accepted&&confidence>=80,error:best.error,reason:accepted&&confidence>=80?undefined:tex<.00002?"low-texture":boundary?"boundary":gap<.012?"ambiguous":"low-confidence"};
}
export function createAnalysisImage(imageData:ImageData):AnalysisImage{const{width,height,data}=imageData,gray=new Uint8Array(width*height),gradient=new Uint8Array(width*height);for(let i=0;i<gray.length;i++){const p=i*4,a=data[p+3]/255;gray[i]=Math.round((.2126*data[p]+.7152*data[p+1]+.0722*data[p+2])*a+255*(1-a));}for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,left=gray[y*width+Math.max(0,x-1)],up=gray[Math.max(0,y-1)*width+x];gradient[i]=Math.min(255,Math.abs(gray[i]-left)+Math.abs(gray[i]-up));}return{width,height,gray,gradient};}
