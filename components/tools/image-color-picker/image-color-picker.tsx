"use client";
/* eslint-disable @next/next/no-img-element -- local object URLs must preserve exact source pixels */

import { useEffect, useRef, useState } from "react";
import { Copy, ImagePlus, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatColorValues, type ColorFormats, type Rgba } from "@/lib/tools/image-color-picker/color";
import { clientPointToPixel, isValidPixelCoordinate } from "@/lib/tools/image-color-picker/coordinates";
import { formatFileSize, validateImageDimensions, validateImageFile, type FileValidationError, type ImageFormat } from "@/lib/tools/image-color-picker/file-validation";
import { sampleImagePixel } from "@/lib/tools/image-color-picker/pixel-sampler";

type PickerError = FileValidationError | "multiple-files" | "image-too-large" | "decode-failed" | "pixel-read-failed" | "coordinate-invalid" | "clipboard-failed";
type LoadedImage = { url:string; name:string; size:number; format:ImageFormat; width:number; height:number };
type Selection = { x:number; y:number; rgba:Rgba; formats:ColorFormats };
type Magnifier = { x:number; y:number; left:number; top:number };
export type ImageColorPickerLabels = {
  uploadTitle:string; uploadHelp:string; choose:string; drop:string; change:string; reset:string; loading:string;
  imageInfo:string; fileName:string; format:string; dimensions:string; fileSize:string; zoom:string; fit:string;
  preview:string; previewAlt:string; selectHelp:string; coordinateTitle:string; x:string; y:string; selectCoordinate:string;
  selected:string; noSelection:string; history:string; historyEmpty:string; copy:string; copied:string;
  formats:Record<keyof ColorFormats,string>; errors:Record<PickerError,string>; privacy:string;
};
const zooms = ["fit","25","50","75","100","150","200","400"] as const;

export function ImageColorPicker({labels}:{labels:ImageColorPickerLabels}) {
  const [loaded,setLoaded]=useState<LoadedImage|null>(null); const [ready,setReady]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState<PickerError|null>(null);
  const [zoom,setZoom]=useState<(typeof zooms)[number]>("fit"); const [selection,setSelection]=useState<Selection|null>(null); const [history,setHistory]=useState<Selection[]>([]);
  const [xInput,setXInput]=useState("0"); const [yInput,setYInput]=useState("0"); const [copied,setCopied]=useState<keyof ColorFormats|null>(null); const [dragging,setDragging]=useState(false); const [magnifier,setMagnifier]=useState<Magnifier|null>(null);
  const fileRef=useRef<HTMLInputElement>(null); const imageRef=useRef<HTMLImageElement>(null); const canvasRef=useRef<HTMLCanvasElement>(null); const urlRef=useRef<string|null>(null); const generation=useRef(0); const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const dragDepth=useRef(0);

  useEffect(()=>()=>{generation.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);if(copyTimer.current)clearTimeout(copyTimer.current);},[]);

  async function loadFile(file:File) {
    const id=++generation.current; setBusy(true); setError(null);
    const validated=await validateImageFile(file); if(id!==generation.current)return;
    if(!validated.ok){setBusy(false);setError(validated.reason);return;}
    const url=URL.createObjectURL(file); const image=new Image(); image.decoding="async"; image.style.imageOrientation="from-image"; image.src=url;
    try { await image.decode(); } catch { URL.revokeObjectURL(url); if(id===generation.current){setBusy(false);setError("decode-failed");} return; }
    if(id!==generation.current){URL.revokeObjectURL(url);return;}
    if(!validateImageDimensions(image.naturalWidth,image.naturalHeight)){URL.revokeObjectURL(url);setBusy(false);setError("image-too-large");return;}
    if(urlRef.current)URL.revokeObjectURL(urlRef.current); urlRef.current=url;
    setLoaded({url,name:file.name,size:file.size,format:validated.format,width:image.naturalWidth,height:image.naturalHeight}); setReady(false); setSelection(null);setHistory([]);setZoom(image.naturalWidth>900?"fit":"100");setXInput("0");setYInput("0");setBusy(false);
  }
  function acceptFiles(files:FileList|File[]){if(files.length!==1){setError("multiple-files");return;}void loadFile(files[0]);}
  function choose(event:React.ChangeEvent<HTMLInputElement>){if(event.target.files)acceptFiles(event.target.files);event.target.value="";}
  function addSelection(next:Selection){setSelection(next);setXInput(String(next.x));setYInput(String(next.y));setError(null);setHistory(old=>old[0]&&Object.keys(next.rgba).every(k=>old[0].rgba[k as keyof Rgba]===next.rgba[k as keyof Rgba])?old:[next,...old].slice(0,12));}
  function sample(x:number,y:number){if(!loaded||!ready||!imageRef.current||!canvasRef.current)return;const rgba=sampleImagePixel(imageRef.current,canvasRef.current,x,y);if(!rgba){setError("pixel-read-failed");return;}addSelection({x,y,rgba,formats:formatColorValues(rgba)});}
  function pick(event:React.MouseEvent<HTMLImageElement>){if(!loaded)return;const point=clientPointToPixel(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect(),loaded.width,loaded.height);if(point)sample(point.x,point.y);}
  function moveMagnifier(event:React.PointerEvent<HTMLImageElement>){
    if(!loaded||!ready||(event.pointerType==="touch"&&event.buttons===0))return;
    const point=clientPointToPixel(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect(),loaded.width,loaded.height);if(!point)return;
    const lensSize=220,gap=20;const left=event.clientX+gap+lensSize>window.innerWidth?event.clientX-gap-lensSize:event.clientX+gap;const top=event.clientY+gap+lensSize>window.innerHeight?event.clientY-gap-lensSize:event.clientY+gap;
    setMagnifier({x:point.x,y:point.y,left:Math.max(8,left),top:Math.max(8,top)});
  }
  function selectCoordinate(){if(!loaded)return;const x=Number(xInput),y=Number(yInput);if(!isValidPixelCoordinate(x,y,loaded.width,loaded.height)){setError("coordinate-invalid");return;}sample(x,y);}
  async function copy(kind:keyof ColorFormats){if(!selection)return;if(copyTimer.current)clearTimeout(copyTimer.current);try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(selection.formats[kind]);setCopied(kind);copyTimer.current=setTimeout(()=>setCopied(null),1500);}catch{setError("clipboard-failed");}}
  function reset(){generation.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=null;setLoaded(null);setReady(false);setBusy(false);setError(null);setSelection(null);setHistory([]);setZoom("fit");setCopied(null);setMagnifier(null);fileRef.current?.focus();}
  const scale=zoom==="fit"?1:Number(zoom)/100; const imageStyle=loaded?{width:`${loaded.width*scale}px`,maxWidth:zoom==="fit"?"100%":"none",height:"auto"}:undefined;

  return <section className="grid gap-6">
    <section className={`rounded-2xl border-2 border-dashed p-5 text-center transition sm:p-8 ${dragging?"border-blue-500 bg-blue-50":"border-slate-300 bg-white"}`} onDragEnter={e=>{e.preventDefault();dragDepth.current++;setDragging(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();dragDepth.current--;if(dragDepth.current<=0){dragDepth.current=0;setDragging(false);}}} onDrop={e=>{e.preventDefault();dragDepth.current=0;setDragging(false);acceptFiles(e.dataTransfer.files);}} aria-busy={busy}>
      <ImagePlus aria-hidden="true" className="mx-auto text-blue-600" size={34}/><h2 className="mt-3 text-xl font-bold text-slate-950">{labels.uploadTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{dragging?labels.drop:labels.uploadHelp}</p>
      <input ref={fileRef} id="image-color-file" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={choose} className="sr-only"/>
      <div className="mt-4 flex flex-wrap justify-center gap-3"><label htmlFor="image-color-file" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus-within:ring-4 focus-within:ring-blue-100"><Upload aria-hidden="true" size={18}/>{loaded?labels.change:labels.choose}</label>{loaded?<Button variant="secondary" onClick={reset}><RotateCcw aria-hidden="true" size={18}/>{labels.reset}</Button>:null}</div>
      {busy?<p role="status" className="mt-4 font-semibold text-blue-800">{labels.loading}</p>:null}{error?<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{labels.errors[error]}</p>:null}
    </section>
    {loaded?<>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h2 className="font-bold text-slate-950">{labels.imageInfo}</h2><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Info name={labels.fileName} value={loaded.name}/><Info name={labels.format} value={loaded.format}/><Info name={labels.dimensions} value={`${loaded.width} × ${loaded.height}px`}/><Info name={labels.fileSize} value={formatFileSize(loaded.size)}/></dl></div><label className="font-bold text-slate-950">{labels.zoom}<select value={zoom} onChange={e=>setZoom(e.target.value as typeof zoom)} className="mt-2 block min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="fit">{labels.fit}</option>{zooms.slice(1).map(item=><option key={item} value={item}>{item}%</option>)}</select></label></div></section>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-bold text-slate-950">{labels.preview}</h2><p className="mt-1 text-sm text-slate-600">{labels.selectHelp}</p><div className="mt-4 max-h-[70vh] min-h-56 max-w-full overflow-auto rounded-xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-2"><div className="relative w-max max-w-full"><img ref={imageRef} src={loaded.url} alt={labels.previewAlt} draggable={false} onDragStart={e=>e.preventDefault()} onLoad={()=>setReady(true)} onClick={pick} onPointerMove={moveMagnifier} onPointerLeave={()=>setMagnifier(null)} style={imageStyle} className="block cursor-crosshair select-none"/>{selection?<span aria-hidden="true" className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_#0f172a]" style={{left:`${(selection.x+.5)/loaded.width*100}%`,top:`${(selection.y+.5)/loaded.height*100}%`}}/>:null}</div></div></section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-bold text-slate-950">{labels.coordinateTitle}</h2><div className="mt-3 grid grid-cols-2 gap-3"><NumberField label={labels.x} value={xInput} set={setXInput} max={loaded.width-1}/><NumberField label={labels.y} value={yInput} set={setYInput} max={loaded.height-1}/></div><Button className="mt-3 w-full" onClick={selectCoordinate}>{labels.selectCoordinate}</Button>
          <h2 className="mt-6 font-bold text-slate-950">{labels.selected}</h2>{selection?<Result selection={selection} labels={labels} copied={copied} copy={copy}/>:<p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{labels.noSelection}</p>}
        </section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-bold text-slate-950">{labels.history}</h2>{history.length?<div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12">{history.map((item,index)=><button key={`${item.formats.hex}-${item.x}-${item.y}-${index}`} type="button" onClick={()=>{setSelection(item);setXInput(String(item.x));setYInput(String(item.y));}} aria-label={`${item.formats.hex}, X ${item.x}, Y ${item.y}`} className="min-w-0 rounded-xl border border-slate-200 p-2 text-xs font-bold focus:ring-4 focus:ring-blue-100"><span className="block aspect-square rounded-lg border border-slate-300" style={{backgroundColor:`rgba(${item.rgba.r},${item.rgba.g},${item.rgba.b},${item.rgba.a/255})`}}/><span className="mt-1 block truncate">{item.formats.hex}</span></button>)}</div>:<p className="mt-2 text-sm text-slate-600">{labels.historyEmpty}</p>}</section>
      <canvas ref={canvasRef} width={1} height={1} className="hidden"/>
      <div data-testid="pixel-magnifier" aria-hidden="true" className={`pointer-events-none fixed z-50 overflow-hidden rounded-xl border-4 border-white bg-white shadow-2xl transition-opacity ${magnifier?"opacity-100":"opacity-0"}`} style={{left:magnifier?.left??0,top:magnifier?.top??0}}><div className="relative size-[220px] overflow-hidden bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px]"><img data-testid="magnified-image" src={loaded.url} alt="" className="absolute max-w-none [image-rendering:pixelated]" style={{left:`${(5-(magnifier?.x??0))*20}px`,top:`${(5-(magnifier?.y??0))*20}px`,width:`${loaded.width*20}px`,height:`${loaded.height*20}px`}}/><span className="absolute left-[100px] top-[100px] size-5 border-2 border-red-500"/><span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.28)_1px,transparent_1px)] bg-[size:20px_20px]"/></div><div className="bg-slate-950 px-3 py-1.5 text-center font-mono text-xs font-bold text-white">X {magnifier?.x??0} · Y {magnifier?.y??0}</div></div>
    </>:null}
    <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">{labels.privacy}</p>
  </section>;
}

function Info({name,value}:{name:string;value:string}){return <div className="min-w-0"><dt className="text-xs font-bold text-slate-500">{name}</dt><dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd></div>}
function NumberField({label,value,set,max}:{label:string;value:string;set:(value:string)=>void;max:number}){return <label className="font-bold text-slate-950">{label}<input type="number" min={0} max={max} step={1} value={value} onChange={e=>set(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-mono focus:ring-4 focus:ring-blue-100"/></label>}
function Result({selection,labels,copied,copy}:{selection:Selection;labels:ImageColorPickerLabels;copied:keyof ColorFormats|null;copy:(kind:keyof ColorFormats)=>void}){return <div className="mt-3"><div className="overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px]"><div className="h-28" style={{backgroundColor:`rgba(${selection.rgba.r},${selection.rgba.g},${selection.rgba.b},${selection.rgba.a/255})`}}/></div><p role="status" className="mt-2 text-sm font-semibold text-slate-700">X {selection.x} · Y {selection.y} · Alpha {Math.round(selection.rgba.a/255*1000)/1000}</p><div className="mt-4 grid gap-3">{(Object.keys(selection.formats) as Array<keyof ColorFormats>).map(kind=><div key={kind} className="min-w-0 rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold uppercase text-slate-500">{labels.formats[kind]}</p><div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><code className="min-w-0 break-all text-sm font-semibold text-slate-950">{selection.formats[kind]}</code><Button variant="secondary" aria-label={`${labels.formats[kind]} ${labels.copy}`} onClick={()=>copy(kind)}><Copy aria-hidden="true" size={16}/>{copied===kind?labels.copied:labels.copy}</Button></div></div>)}</div></div>}
