import type { ImageMime } from "./file-validation";
export function formatBytes(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024**2)return`${Math.round(bytes/102.4)/10} KB`;return`${Math.round(bytes/1024**2*10)/10} MB`;}
export function savingPercent(original:number,result:number){return original>0?(original-result)/original*100:0;}
export function outputFilename(name:string,mime:ImageMime){const extension=mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp";const without=name.replace(/\.[^.]*$/,"").replace(/[<>:"/\\|?*\u0000-\u001f]/g,"-").replace(/[. ]+$/g,"").trim().slice(0,100);return`${without||"image"}-compressed.${extension}`;}
export function outputMime(selected:"original"|ImageMime,original:ImageMime):ImageMime{return selected==="original"?original:selected;}
