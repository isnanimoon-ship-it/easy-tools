"use client";
/* eslint-disable @next/next/no-img-element -- local Blob previews must not be sent through the Next.js image optimizer */

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileArchive, ImagePlus, Images, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, decodeImage, type CompressionResult } from "@/lib/tools/image-compressor/compress-image";
import { formatBytes, outputFilename, outputMime, savingPercent } from "@/lib/tools/image-compressor/format";
import { MAX_BATCH_FILES, validDimensions, validateImageFile, type ImageMime, type ValidationError } from "@/lib/tools/image-compressor/file-validation";
import { buildImageZip, uniqueFilename } from "@/lib/tools/image-compressor/zip";

type UiError=ValidationError|"multiple-files"|"decode-failed"|"invalid-dimensions"|"encoder-unsupported"|"encode-failed"|"target-invalid"|"target-unreachable"|"download-failed"|"too-many-files"|"zip-failed";
type BatchStatus="pending"|"processing"|"done"|"error";
type BatchItem={id:string;file:File;status:BatchStatus;mime?:ImageMime;result?:{blob:Blob;mime:ImageMime;width:number;height:number};errorReason?:UiError};
function makeId(){return crypto.randomUUID?.()??`${Date.now()}-${Math.random()}`;}
export type ImageCompressorLabels={
 uploadTitle:string;uploadHelp:string;drop:string;choose:string;change:string;clear:string;privacy:string;loading:string;compressing:string;progress:string;compress:string;download:string;
 infoTitle:string;fileName:string;format:string;dimensions:string;size:string;settings:string;mode:string;qualityMode:string;targetMode:string;quality:string;target:string;customTarget:string;output:string;original:string;maxWidth:string;keepSize:string;pngNotice:string;jpegNotice:string;metadataNotice:string;
 previewOriginal:string;previewResult:string;resultEmpty:string;resultTitle:string;resultSize:string;saved:string;saving:string;larger:string;same:string;targetMet:string;targetMissed:string;actualQuality:string;
 formats:{jpeg:string;png:string;webp:string};errors:Record<UiError,string>;
 batch:{
  tabSingle:string;tabBatch:string;title:string;help:string;choose:string;reselect:string;clear:string;
  columnFile:string;columnSize:string;columnStatus:string;columnResult:string;
  statusPending:string;statusProcessing:string;statusDone:string;statusError:string;
  run:string;running:string;downloadZip:string;zipping:string;summary:string;
 };
};
type Loaded={file:File;url:string;mime:ImageMime;width:number;height:number};
type Result=CompressionResult&{url:string;mime:ImageMime};
const presets=[100,200,500,1024];
const widths=[1920,1600,1280,1024,800];

export function ImageCompressor({labels}:{labels:ImageCompressorLabels}){
 const inputRef=useRef<HTMLInputElement>(null),generation=useRef(0),resultUrl=useRef<string|null>(null),dragDepth=useRef(0);
 const [loaded,setLoaded]=useState<Loaded|null>(null),[result,setResult]=useState<Result|null>(null),[error,setError]=useState<UiError|null>(null),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false),[progress,setProgress]=useState(0);
 const [mode,setMode]=useState<"quality"|"target">("quality"),[quality,setQuality]=useState(80),[target,setTarget]=useState("200"),[selectedOutput,setSelectedOutput]=useState<"original"|ImageMime>("original"),[maxWidth,setMaxWidth]=useState("original");
 const [view,setView]=useState<"single"|"batch">("single");
 const batchInputRef=useRef<HTMLInputElement>(null),batchGeneration=useRef(0),batchDragDepth=useRef(0);
 const [batchItems,setBatchItems]=useState<BatchItem[]>([]),[batchError,setBatchError]=useState<UiError|null>(null),[batchRunning,setBatchRunning]=useState(false),[zipBusy,setZipBusy]=useState(false),[batchDragging,setBatchDragging]=useState(false);
 const releaseResult=useCallback(()=>{if(resultUrl.current){URL.revokeObjectURL(resultUrl.current);resultUrl.current=null;}setResult(null);},[]);
 const clear=useCallback(()=>{generation.current++;releaseResult();setLoaded(current=>{if(current)URL.revokeObjectURL(current.url);return null;});setError(null);setBusy(false);setProgress(0);setMode("quality");setQuality(80);setTarget("200");setSelectedOutput("original");setMaxWidth("original");if(inputRef.current){inputRef.current.value="";inputRef.current.focus();}},[releaseResult]);
 useEffect(()=>()=>{generation.current++;if(resultUrl.current)URL.revokeObjectURL(resultUrl.current);},[]);

 async function accept(files:FileList|null){if(!files?.length)return;if(files.length!==1){setError("multiple-files");return;}const file=files[0];generation.current++;releaseResult();setBusy(true);setError(null);const valid=await validateImageFile(file);if(!valid.ok){setBusy(false);setError(valid.reason);return;}try{const bitmap=await decodeImage(file);const dimensions={width:bitmap.width,height:bitmap.height};bitmap.close();if(!validDimensions(dimensions.width,dimensions.height)){setError("invalid-dimensions");setBusy(false);return;}const url=URL.createObjectURL(file);setLoaded(current=>{if(current)URL.revokeObjectURL(current.url);return{file,url,mime:valid.mime,...dimensions};});setSelectedOutput("original");setBusy(false);}catch{setBusy(false);setError("decode-failed");}}

 const run=useCallback(async()=>{if(!loaded)return;const targetKb=Number(target);if(mode==="target"&&(!Number.isInteger(targetKb)||targetKb<10||targetKb>10240)){setError("target-invalid");releaseResult();return;}const id=++generation.current;setBusy(true);setProgress(0);setError(null);releaseResult();const mime=outputMime(selectedOutput,loaded.mime);try{const compressed=await compressImage(loaded.file,{mime,mode,quality,targetBytes:targetKb*1024,maxWidth:maxWidth==="original"?null:Number(maxWidth),generationValid:()=>generation.current===id,onProgress:current=>{if(generation.current===id)setProgress(current);}});if(generation.current!==id)return;const url=URL.createObjectURL(compressed.blob);resultUrl.current=url;setResult({...compressed,url,mime});if(mode==="target"&&!compressed.targetMet)setError("target-unreachable");}catch(reason){if(generation.current!==id)return;const message=reason instanceof Error?reason.message:"encode-failed";setError(message==="encoder-unsupported"?"encoder-unsupported":message==="invalid-dimensions"?"invalid-dimensions":"encode-failed");}finally{if(generation.current===id)setBusy(false);}},[loaded,maxWidth,mode,quality,releaseResult,selectedOutput,target]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(run,400);return()=>clearTimeout(timer);},[loaded,mode,quality,target,selectedOutput,maxWidth,run]);
 function invalidate(){generation.current++;releaseResult();}

 // Batch mode is a deliberately independent queue/state (never touches `loaded`/`result` above) so a
 // large multi-file run can't interact with the single-image live-preview flow's memory or effects.
 async function addBatchFiles(files:FileList|null){
  if(!files?.length)return;
  const incoming=Array.from(files);
  if(incoming.length>MAX_BATCH_FILES){setBatchError("too-many-files");return;}
  batchGeneration.current++;setBatchRunning(false);setBatchError(null);
  const items=await Promise.all(incoming.map(async(file):Promise<BatchItem>=>{const valid=await validateImageFile(file);return valid.ok?{id:makeId(),file,status:"pending",mime:valid.mime}:{id:makeId(),file,status:"error",errorReason:valid.reason};}));
  setBatchItems(items);
 }
 async function runBatch(){
  if(batchRunning||!batchItems.length)return;
  const targetKb=Number(target);
  if(mode==="target"&&(!Number.isInteger(targetKb)||targetKb<10||targetKb>10240)){setBatchError("target-invalid");return;}
  const id=++batchGeneration.current;setBatchRunning(true);setBatchError(null);
  const runnable=batchItems.filter(item=>item.status!=="error");
  setBatchItems(current=>current.map(item=>item.status==="error"?item:{...item,status:"pending",result:undefined}));
  for(const item of runnable){
   if(batchGeneration.current!==id)return;
   setBatchItems(current=>current.map(entry=>entry.id===item.id?{...entry,status:"processing"}:entry));
   const mime=outputMime(selectedOutput,item.mime!);
   try{
    const compressed=await compressImage(item.file,{mime,mode,quality,targetBytes:targetKb*1024,maxWidth:maxWidth==="original"?null:Number(maxWidth),generationValid:()=>batchGeneration.current===id});
    if(batchGeneration.current!==id)return;
    setBatchItems(current=>current.map(entry=>entry.id===item.id?{...entry,status:"done",result:{blob:compressed.blob,mime,width:compressed.width,height:compressed.height}}:entry));
   }catch(reason){
    if(batchGeneration.current!==id)return;
    const message=reason instanceof Error?reason.message:"encode-failed";
    const errorReason:UiError=message==="encoder-unsupported"?"encoder-unsupported":message==="invalid-dimensions"?"invalid-dimensions":"encode-failed";
    setBatchItems(current=>current.map(entry=>entry.id===item.id?{...entry,status:"error",errorReason}:entry));
   }
  }
  if(batchGeneration.current===id)setBatchRunning(false);
 }
 async function downloadZip(){
  const ready=batchItems.filter(item=>item.status==="done"&&item.result);
  if(!ready.length||zipBusy)return;
  setZipBusy(true);setBatchError(null);
  try{
   const used=new Set<string>();
   const entries=await Promise.all(ready.map(async item=>{const name=uniqueFilename(used,outputFilename(item.file.name,item.result!.mime));const data=new Uint8Array(await item.result!.blob.arrayBuffer());return{name,data};}));
   const zip=buildImageZip(entries);
   const blob=new Blob([new Uint8Array(zip)],{type:"application/zip"});
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement("a");anchor.href=url;anchor.download="compressed-images.zip";document.body.append(anchor);anchor.click();anchor.remove();
   URL.revokeObjectURL(url);
  }catch{setBatchError("zip-failed");}finally{setZipBusy(false);}
 }
 function clearBatch(){batchGeneration.current++;setBatchItems([]);setBatchError(null);setBatchRunning(false);if(batchInputRef.current){batchInputRef.current.value="";batchInputRef.current.focus();}}
 const batchDoneCount=batchItems.filter(item=>item.status==="done").length,batchErrorCount=batchItems.filter(item=>item.status==="error").length;
 const batchOriginalTotal=batchItems.filter(item=>item.status==="done").reduce((sum,item)=>sum+item.file.size,0);
 const batchResultTotal=batchItems.filter(item=>item.status==="done"&&item.result).reduce((sum,item)=>sum+(item.result?.blob.size??0),0);

 function download(){if(!result||busy)return;try{const anchor=document.createElement("a");anchor.href=result.url;anchor.download=outputFilename(loaded!.file.name,result.mime);document.body.append(anchor);anchor.click();anchor.remove();}catch{setError("download-failed");}}
 const reduction=result?savingPercent(loaded!.file.size,result.blob.size):0;
 const png=loaded&&outputMime(selectedOutput,loaded.mime)==="image/png";
 const jpeg=loaded&&outputMime(selectedOutput,loaded.mime)==="image/jpeg"&&loaded.mime!=="image/jpeg";
 return <section className="space-y-6">
  <div role="tablist" aria-label={labels.batch.title} className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-muted)] p-1">
   <button role="tab" aria-selected={view==="single"} onClick={()=>setView("single")} className={tabClass(view==="single")}><ImagePlus aria-hidden="true" size={16}/>{labels.batch.tabSingle}</button>
   <button role="tab" aria-selected={view==="batch"} onClick={()=>setView("batch")} className={tabClass(view==="batch")}><Images aria-hidden="true" size={16}/>{labels.batch.tabBatch}</button>
  </div>
  {view==="single"?<>
  <section className={`rounded-2xl border-2 border-dashed p-5 text-center transition sm:p-8 ${dragging?"border-[var(--primary)] bg-[var(--info-bg)]":"border-[var(--border)] bg-[var(--surface)]"}`} onDragEnter={e=>{e.preventDefault();dragDepth.current++;setDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();if(--dragDepth.current<=0){dragDepth.current=0;setDragging(false)}}} onDrop={e=>{e.preventDefault();dragDepth.current=0;setDragging(false);accept(e.dataTransfer.files)}} aria-busy={busy}>
   <ImagePlus aria-hidden="true" size={34} className="mx-auto text-[var(--primary)]"/><h2 className="mt-3 text-xl font-bold">{labels.uploadTitle}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{dragging?labels.drop:labels.uploadHelp}</p>
   <input ref={inputRef} id="compressor-file" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={e=>{accept(e.target.files);e.target.value=""}}/>
   <div className="mt-4 flex flex-wrap justify-center gap-3"><label htmlFor="compressor-file" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-fill)] px-4 py-2.5 font-semibold text-white focus-within:ring-4 focus-within:ring-[var(--focus-ring)]"><Upload aria-hidden="true" size={18}/>{loaded?labels.change:labels.choose}</label>{loaded?<Button variant="secondary" onClick={clear}><RotateCcw aria-hidden="true" size={17}/>{labels.clear}</Button>:null}</div>
   {busy?<p role="status" className="mt-4 font-semibold text-[var(--info-fg)]">{progress?labels.progress.replace("__CURRENT__",String(progress)).replace("__MAX__","10"):loaded?labels.compressing:labels.loading}</p>:null}{error&&error!=="target-unreachable"?<p role="alert" className="mt-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">{labels.errors[error]}</p>:null}
  </section>
  {loaded?<>
   <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="font-bold">{labels.infoTitle}</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info name={labels.fileName} value={loaded.file.name}/><Info name={labels.format} value={loaded.mime}/><Info name={labels.dimensions} value={`${loaded.width} × ${loaded.height}px`}/><Info name={labels.size} value={formatBytes(loaded.file.size)}/></dl></section>
   <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">{labels.settings}</h2><fieldset className="mt-4"><legend className="font-semibold">{labels.mode}</legend><div className="mt-2 flex flex-wrap gap-4"><Radio label={labels.qualityMode} checked={mode==="quality"} set={()=>{invalidate();setMode("quality")}}/><Radio label={labels.targetMode} checked={mode==="target"} set={()=>{invalidate();setMode("target")}}/></div></fieldset>
    {mode==="quality"&&!png?<label className="mt-5 block font-semibold">{labels.quality}: {quality}%<input aria-label={labels.quality} type="range" min={10} max={100} value={quality} onChange={e=>{invalidate();setQuality(Number(e.target.value))}} className="mt-3 w-full accent-blue-600"/></label>:null}
    {mode==="target"?<div className="mt-5"><span className="font-semibold">{labels.target}</span><div className="mt-2 flex flex-wrap gap-2">{presets.map(value=><button key={value} type="button" onClick={()=>{invalidate();setMode("target");setTarget(String(value))}} className={`min-h-11 rounded-xl border px-3 font-semibold ${target===String(value)?"border-[var(--primary)] bg-[var(--info-bg)] text-[var(--info-fg)]":"border-[var(--border)]"}`}>{value===1024?"1 MB":`${value} KB`}</button>)}</div><label className="mt-3 block max-w-xs font-semibold">{labels.customTarget}<div className="mt-2 flex items-center gap-2"><input type="number" min={10} max={10240} step={1} value={target} onChange={e=>{invalidate();setTarget(e.target.value)}} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3"/> KB</div></label></div>:null}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="font-semibold">{labels.output}<select value={selectedOutput} onChange={e=>{invalidate();setSelectedOutput(e.target.value as typeof selectedOutput)}} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"><option value="original">{labels.original}</option><option value="image/jpeg">{labels.formats.jpeg}</option><option value="image/png">{labels.formats.png}</option><option value="image/webp">{labels.formats.webp}</option></select></label><label className="font-semibold">{labels.maxWidth}<select value={maxWidth} onChange={e=>{invalidate();setMaxWidth(e.target.value)}} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"><option value="original">{labels.keepSize}</option>{widths.map(value=><option key={value} value={value}>{value}px</option>)}</select></label></div>
    {png?<p className="mt-4 rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">{labels.pngNotice}</p>:null}{jpeg?<p className="mt-4 rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">{labels.jpegNotice}</p>:null}<p className="mt-3 text-sm text-[var(--text-muted)]">{labels.metadataNotice}</p><Button className="mt-5" disabled={busy} onClick={run}>{busy?labels.compressing:labels.compress}</Button>
   </section>
   <section className="grid gap-5 lg:grid-cols-2"><Preview title={labels.previewOriginal} url={loaded.url}/><Preview title={labels.previewResult} url={result?.url??null} empty={labels.resultEmpty}/></section>
   {result?<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-xl font-bold">{labels.resultTitle}</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info name={labels.size} value={formatBytes(loaded.file.size)}/><Info name={labels.resultSize} value={formatBytes(result.blob.size)}/><Info name={labels.format} value={result.mime}/><Info name={labels.saved} value={reduction>0?`${formatBytes(loaded.file.size-result.blob.size)} (${reduction.toFixed(1)}%)`:reduction===0?labels.same:labels.larger.replace("__SIZE__",formatBytes(result.blob.size-loaded.file.size))}/><Info name={labels.dimensions} value={`${result.width} × ${result.height}px`}/>{result.quality!==null?<Info name={labels.actualQuality} value={`${Math.round(result.quality*100)}%`}/>:null}</dl><p role="status" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${mode==="target"&&!result.targetMet?"bg-[var(--warning-bg)] text-[var(--warning-fg)]":"bg-[var(--success-bg)] text-[var(--success-fg)]"}`}>{mode==="target"?(result.targetMet?labels.targetMet:labels.targetMissed):reduction>0?labels.saving:reduction===0?labels.same:labels.larger.replace("__SIZE__",formatBytes(result.blob.size-loaded.file.size))}</p><Button className="mt-4 w-full sm:w-auto" onClick={download} disabled={busy}><Download aria-hidden="true" size={18}/>{labels.download}</Button></section>:null}
  </>:null}
  </>:null}
  {view==="batch"?<>
  <section className={`rounded-2xl border-2 border-dashed p-5 text-center transition sm:p-8 ${batchDragging?"border-[var(--primary)] bg-[var(--info-bg)]":"border-[var(--border)] bg-[var(--surface)]"}`} onDragEnter={e=>{e.preventDefault();batchDragDepth.current++;setBatchDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();if(--batchDragDepth.current<=0){batchDragDepth.current=0;setBatchDragging(false)}}} onDrop={e=>{e.preventDefault();batchDragDepth.current=0;setBatchDragging(false);void addBatchFiles(e.dataTransfer.files)}} aria-busy={batchRunning}>
   <Images aria-hidden="true" size={34} className="mx-auto text-[var(--primary)]"/><h2 className="mt-3 text-xl font-bold">{labels.batch.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{batchDragging?labels.drop:labels.batch.help}</p>
   <input ref={batchInputRef} id="compressor-batch-files" type="file" multiple accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={e=>{void addBatchFiles(e.target.files);e.target.value=""}}/>
   <div className="mt-4 flex flex-wrap justify-center gap-3"><label htmlFor="compressor-batch-files" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-fill)] px-4 py-2.5 font-semibold text-white focus-within:ring-4 focus-within:ring-[var(--focus-ring)]"><Upload aria-hidden="true" size={18}/>{batchItems.length?labels.batch.reselect:labels.batch.choose}</label>{batchItems.length?<Button variant="secondary" onClick={clearBatch}><RotateCcw aria-hidden="true" size={17}/>{labels.batch.clear}</Button>:null}</div>
   {batchError?<p role="alert" className="mt-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">{labels.errors[batchError]}</p>:null}
  </section>
  {batchItems.length?<>
   <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">{labels.settings}</h2><fieldset className="mt-4"><legend className="font-semibold">{labels.mode}</legend><div className="mt-2 flex flex-wrap gap-4"><Radio label={labels.qualityMode} checked={mode==="quality"} set={()=>setMode("quality")}/><Radio label={labels.targetMode} checked={mode==="target"} set={()=>setMode("target")}/></div></fieldset>
    {mode==="quality"&&selectedOutput!=="image/png"?<label className="mt-5 block font-semibold">{labels.quality}: {quality}%<input aria-label={labels.quality} type="range" min={10} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value))} className="mt-3 w-full accent-blue-600"/></label>:null}
    {mode==="target"?<div className="mt-5"><span className="font-semibold">{labels.target}</span><div className="mt-2 flex flex-wrap gap-2">{presets.map(value=><button key={value} type="button" onClick={()=>{setMode("target");setTarget(String(value))}} className={`min-h-11 rounded-xl border px-3 font-semibold ${target===String(value)?"border-[var(--primary)] bg-[var(--info-bg)] text-[var(--info-fg)]":"border-[var(--border)]"}`}>{value===1024?"1 MB":`${value} KB`}</button>)}</div><label className="mt-3 block max-w-xs font-semibold">{labels.customTarget}<div className="mt-2 flex items-center gap-2"><input type="number" min={10} max={10240} step={1} value={target} onChange={e=>setTarget(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3"/> KB</div></label></div>:null}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="font-semibold">{labels.output}<select value={selectedOutput} onChange={e=>setSelectedOutput(e.target.value as typeof selectedOutput)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"><option value="original">{labels.original}</option><option value="image/jpeg">{labels.formats.jpeg}</option><option value="image/png">{labels.formats.png}</option><option value="image/webp">{labels.formats.webp}</option></select></label><label className="font-semibold">{labels.maxWidth}<select value={maxWidth} onChange={e=>setMaxWidth(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"><option value="original">{labels.keepSize}</option>{widths.map(value=><option key={value} value={value}>{value}px</option>)}</select></label></div>
    <p className="mt-3 text-sm text-[var(--text-muted)]">{labels.metadataNotice}</p>
    <Button className="mt-5" disabled={batchRunning} onClick={()=>void runBatch()}>{batchRunning?labels.batch.running.replace("__CURRENT__",String(batchDoneCount+batchErrorCount)).replace("__TOTAL__",String(batchItems.length)):labels.batch.run}</Button>
   </section>
   <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
    <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm">
     <thead><tr className="border-b border-[var(--border)] text-xs font-bold uppercase text-[var(--text-muted)]"><th className="py-2 pr-3">{labels.batch.columnFile}</th><th className="py-2 pr-3">{labels.batch.columnSize}</th><th className="py-2 pr-3">{labels.batch.columnStatus}</th><th className="py-2">{labels.batch.columnResult}</th></tr></thead>
     <tbody>{batchItems.map(item=><tr key={item.id} className="border-b border-[var(--border)] last:border-0"><td className="max-w-[16rem] truncate py-2 pr-3 font-medium" title={item.file.name}>{item.file.name}</td><td className="py-2 pr-3 text-[var(--text-muted)]">{formatBytes(item.file.size)}</td><td className="py-2 pr-3"><StatusBadge status={item.status} labels={labels.batch}/></td><td className="py-2">{item.status==="done"&&item.result?`${formatBytes(item.result.blob.size)} (${savingPercent(item.file.size,item.result.blob.size).toFixed(0)}%)`:item.status==="error"&&item.errorReason?labels.errors[item.errorReason]:"—"}</td></tr>)}</tbody>
    </table></div>
    <p className="mt-4 text-sm text-[var(--text-muted)]">{labels.batch.summary.replace("__DONE__",String(batchDoneCount)).replace("__TOTAL__",String(batchItems.length)).replace("__SAVED__",formatBytes(Math.max(0,batchOriginalTotal-batchResultTotal)))}</p>
    <Button className="mt-4 w-full sm:w-auto" disabled={!batchDoneCount||zipBusy} onClick={()=>void downloadZip()}><FileArchive aria-hidden="true" size={18}/>{zipBusy?labels.batch.zipping:labels.batch.downloadZip}</Button>
   </section>
  </>:null}
  </>:null}
  <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">{labels.privacy}</p>
 </section>;
}
function tabClass(active:boolean){return`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 font-bold ${active?"bg-[var(--surface)] text-[var(--primary)] shadow-sm":"text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
function StatusBadge({status,labels}:{status:BatchStatus;labels:ImageCompressorLabels["batch"]}){const text=status==="pending"?labels.statusPending:status==="processing"?labels.statusProcessing:status==="done"?labels.statusDone:labels.statusError;const cls=status==="done"?"bg-[var(--success-bg)] text-[var(--success-fg)]":status==="error"?"bg-[var(--error-bg)] text-[var(--error-fg)]":status==="processing"?"bg-[var(--info-bg)] text-[var(--info-fg)]":"bg-[var(--surface-muted)] text-[var(--text-muted)]";return <span className={`rounded-full px-2 py-1 text-xs font-bold ${cls}`}>{text}</span>}
function Info({name,value}:{name:string;value:string}){return <div className="min-w-0"><dt className="text-xs font-bold text-[var(--text-muted)]">{name}</dt><dd className="mt-1 break-words font-medium text-[var(--foreground)]">{value}</dd></div>}
function Radio({label,checked,set}:{label:string;checked:boolean;set:()=>void}){return <label className="inline-flex min-h-11 items-center gap-2 font-medium"><input type="radio" name="compression-mode" checked={checked} onChange={set} className="size-4 accent-blue-600"/>{label}</label>}
function Preview({title,url,empty}:{title:string;url:string|null;empty?:string}){return <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><h2 className="font-bold">{title}</h2><div className="mt-3 grid min-h-56 place-items-center overflow-hidden rounded-xl bg-[var(--surface-muted)] p-2">{url?<>{/* Blob URLs are local previews and cannot use the Next.js image optimizer. */}<img src={url} alt={title} className="max-h-[28rem] max-w-full object-contain"/></>:<p className="px-4 text-center text-sm text-[var(--text-muted)]">{empty}</p>}</div></div>}
