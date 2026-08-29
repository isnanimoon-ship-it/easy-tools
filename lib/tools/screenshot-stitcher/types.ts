export const STITCH_LIMITS={maxFiles:20,maxFileBytes:20*1024*1024,maxTotalBytes:100*1024*1024,maxPixels:30_000_000,maxDimension:16_384,maxOutputPixels:48_000_000,maxOutputWidth:8_192,maxOutputHeight:32_767}as const;
export type StitchMime="image/png"|"image/jpeg"|"image/webp";
export type ImageItem={id:string;file:File;url:string;width:number;height:number;mime:StitchMime};
export type ConnectionStatus="auto"|"review"|"manual";
export type Connection={id:string;overlap:number;suggested:number;confidence:number;status:ConnectionStatus;resolved:boolean;excludeBottom:number;excludeTop:number;reason?:string};
export type AnalysisImage={width:number;height:number;gray:Uint8Array;gradient:Uint8Array};
export type OverlapResult={overlap:number;confidence:number;accepted:boolean;error:number;reason?:string};
export type WorkerRequest=
 |{type:"analyze";generation:number;files:File[];connections:Array<{excludeBottom:number;excludeTop:number}>;outputWidth?:number;pairIndex?:number}
 |{type:"compose";generation:number;files:File[];overlaps:number[]};
export type WorkerResponse=
 |{type:"progress";generation:number;current:number;total:number}
 |{type:"analysis";generation:number;results:OverlapResult[];dimensions:Array<{width:number;height:number}>;pairIndex?:number}
 |{type:"composed";generation:number;blob:Blob;width:number;height:number;totalHeight:number;removed:number}
 |{type:"error";generation:number;code:string};
