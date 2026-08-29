export function formatBytes(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024**2)return`${(bytes/1024).toFixed(1)} KiB`;return`${(bytes/1024**2).toFixed(1)} MiB`;}
export function clampInteger(value:number,min:number,max:number){return Math.min(max,Math.max(min,Math.round(Number.isFinite(value)?value:min)));}
