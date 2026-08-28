"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Code2, Grid2X2, Images, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const categories = [
  { key: "text", icon: Type, tools: [["/tools/word-counter", "wordCounter"]] },
  { key: "developer", icon: Code2, tools: [["/tools/json-formatter", "jsonFormatter"], ["/tools/base64-converter", "base64Converter"], ["/tools/url-encoder-decoder", "urlEncoderDecoder"], ["/tools/qr-code-generator", "qrCodeGenerator"]] },
  { key: "media", icon: Images, tools: [["/tools/image-color-picker", "imageColorPicker"], ["/tools/youtube-thumbnail-downloader", "youtubeThumbnailDownloader"]] },
  { key: "other", icon: Grid2X2, tools: [["/tools/password-generator", "passwordGenerator"], ["/tools/ip-info", "ipInfo"]] },
] as const;
type MenuKey = (typeof categories)[number]["key"] | "all";

export function ToolMenu() {
  const t = useTranslations("Common.toolsNav");
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<MenuKey | null>(null);
  const activeCategory = categories.find(category => category.tools.some(([href]) => pathname === href))?.key;

  useEffect(() => {
    function outside(event: PointerEvent) { if (open && !rootRef.current?.contains(event.target as Node)) setOpen(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && open) { const key = open; setOpen(null); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${key}"]`)?.focus()); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  function toggle(key: MenuKey) { setOpen(current => current === key ? null : key); }
  const shownCategories = open === "all" ? categories : categories.filter(category => category.key === open);

  return <div ref={rootRef} className="relative">
    <nav aria-label={t("label")} className="hidden items-center gap-1 xl:flex">
      {categories.map(category => <CategoryButton key={category.key} category={category} active={activeCategory === category.key} open={open === category.key} toggle={toggle} label={t(`categories.${category.key}`)}/>) }
      <button data-menu="all" type="button" aria-expanded={open === "all"} aria-controls="tool-panel" onClick={() => toggle("all")} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${open === "all" ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}><Grid2X2 aria-hidden="true" size={17}/>{t("all")}<ChevronDown aria-hidden="true" size={15} className={open === "all" ? "rotate-180 transition" : "transition"}/></button>
    </nav>
    <button data-menu="all" type="button" aria-expanded={open === "all"} aria-controls="tool-panel" onClick={() => toggle("all")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 xl:hidden"><Grid2X2 aria-hidden="true" size={18}/><span>{t("open")}</span><ChevronDown aria-hidden="true" size={16} className={open === "all" ? "rotate-180 transition" : "transition"}/></button>
    {open ? <div id="tool-panel" className="fixed left-4 right-4 top-[4.5rem] z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:absolute xl:left-0 xl:right-auto xl:top-14 xl:w-[42rem]"><div className={open === "all" ? "grid gap-5 sm:grid-cols-2" : "grid gap-1"}>{shownCategories.map(category => { const Icon = category.icon; return <section key={category.key} aria-labelledby={`tool-category-${category.key}`}><h2 id={`tool-category-${category.key}`} className="flex items-center gap-2 px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon aria-hidden="true" size={15}/>{t(`categories.${category.key}`)}</h2><div className="grid gap-1">{category.tools.map(([href, key]) => <Link key={href} href={href} onClick={() => setOpen(null)} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${pathname === href ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}>{t(key)}</Link>)}</div></section>;})}</div></div> : null}
  </div>;
}

function CategoryButton({category, active, open, toggle, label}:{category:(typeof categories)[number];active:boolean;open:boolean;toggle:(key:MenuKey)=>void;label:string}) { const Icon = category.icon; return <button data-menu={category.key} type="button" aria-expanded={open} aria-controls="tool-panel" onClick={() => toggle(category.key)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${active || open ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}><Icon aria-hidden="true" size={17}/>{label}<ChevronDown aria-hidden="true" size={15} className={open ? "rotate-180 transition" : "transition"}/></button>; }
