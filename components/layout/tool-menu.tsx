"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Code2, FileSpreadsheet, Grid2X2, ImageIcon, Network, Sparkles, Type } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { TOOL_CATEGORY_KEYS, toolsInCategory, type ToolCategoryKey } from "@/lib/tools/registry";
import type { AppLocale } from "@/i18n/routing";

const categoryIcons = { image: ImageIcon, text: Type, developer: Code2, generator: Sparkles, fileData: FileSpreadsheet, network: Network } as const;
type MenuKey = ToolCategoryKey | "all";

export function ToolMenu() {
  const t = useTranslations("Common.toolsNav");
  const locale = useLocale() as AppLocale;
  const categories = TOOL_CATEGORY_KEYS.map(key => ({ key, icon: categoryIcons[key], tools: toolsInCategory(key, locale) }));
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<MenuKey | null>(null);
  const activeCategory = categories.find(category => category.tools.some(tool => pathname === tool.path))?.key;

  useEffect(() => {
    function outside(event: PointerEvent) { if (open && !rootRef.current?.contains(event.target as Node)) setOpen(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && open) { const key = open; setOpen(null); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${key}"]`)?.focus()); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  function toggle(key: MenuKey) { setOpen(current => current === key ? null : key); }
  const shownCategories = open === "all" ? categories : categories.filter(category => category.key === open);

  return <div ref={rootRef} className="relative">
    <nav aria-label={t("label")} className="tool-menu-expanded shrink-0 items-center gap-1">
      {categories.map(category => <CategoryButton key={category.key} category={category} active={activeCategory === category.key} open={open === category.key} toggle={toggle} label={t(`categories.${category.key}`)}/>) }
      <button data-menu="all" type="button" aria-expanded={open === "all"} aria-controls="tool-panel" onClick={() => toggle("all")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${open === "all" ? "bg-[var(--info-bg)] text-[var(--info-fg)]" : "text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"}`}><Grid2X2 aria-hidden="true" size={17}/>{t("all")}<ChevronDown aria-hidden="true" size={15} className={open === "all" ? "rotate-180 transition" : "transition"}/></button>
    </nav>
    <button data-menu="all" type="button" aria-expanded={open === "all"} aria-controls="tool-panel" onClick={() => toggle("all")} className="tool-menu-compact min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Grid2X2 aria-hidden="true" size={18}/><span>{t("open")}</span><ChevronDown aria-hidden="true" size={16} className={open === "all" ? "rotate-180 transition" : "transition"}/></button>
            {open ? <div id="tool-panel" className="tool-menu-panel fixed left-4 right-4 top-[4.5rem] z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"><div className={open === "all" ? "grid gap-5 sm:grid-cols-2" : "grid gap-1"}>{shownCategories.map(category => { const Icon = category.icon; return <section key={category.key} aria-labelledby={`tool-category-${category.key}`}><h2 id={`tool-category-${category.key}`} className="flex items-center gap-2 px-2 pb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"><Icon aria-hidden="true" size={15}/>{t(`categories.${category.key}`)}</h2><div className="grid gap-1">{category.tools.map(tool => <Link key={tool.path} href={tool.path} onClick={() => setOpen(null)} aria-current={pathname === tool.path ? "page" : undefined} className={`flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${pathname === tool.path ? "bg-[var(--info-bg)] text-[var(--info-fg)]" : "text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"}`}>{t(tool.translationKey)}</Link>)}</div></section>;})}</div></div> : null}
  </div>;
}

function CategoryButton({category, active, open, toggle, label}:{category:{key:ToolCategoryKey;icon:typeof Type;tools:ReturnType<typeof toolsInCategory>};active:boolean;open:boolean;toggle:(key:MenuKey)=>void;label:string}) { const Icon = category.icon; return <button data-menu={category.key} type="button" aria-expanded={open} aria-controls="tool-panel" onClick={() => toggle(category.key)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${active || open ? "bg-[var(--info-bg)] text-[var(--info-fg)]" : "text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"}`}><Icon aria-hidden="true" size={17}/>{label}<ChevronDown aria-hidden="true" size={15} className={open ? "rotate-180 transition" : "transition"}/></button>; }
