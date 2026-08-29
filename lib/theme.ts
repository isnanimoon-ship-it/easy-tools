export const THEME_STORAGE_KEY="konly-theme";
export type ResolvedTheme="light"|"dark";
export function isTheme(value:unknown):value is ResolvedTheme{return value==="light"||value==="dark"}
export function applyTheme(theme:ResolvedTheme){const root=document.documentElement;root.classList.toggle("dark",theme==="dark");root.dataset.theme=theme;root.style.colorScheme=theme;}
export function resolveTheme(stored:unknown,darkPreference:boolean):ResolvedTheme{return isTheme(stored)?stored:darkPreference?"dark":"light"}
export const THEME_BOOTSTRAP=`(()=>{let v=null,d=false;try{v=localStorage.getItem("${THEME_STORAGE_KEY}")}catch{}try{d=v==="dark"||(v!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)}catch{d=v==="dark"}const e=document.documentElement;e.classList.toggle("dark",d);e.dataset.theme=d?"dark":"light";e.style.colorScheme=d?"dark":"light"})()`;
