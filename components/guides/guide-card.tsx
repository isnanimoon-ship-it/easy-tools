import { ArrowRight, BookOpenText } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Guide } from "@/lib/content/guides";

export function GuideCard({ guide }: { guide: Guide }) {
  return <article className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><BookOpenText aria-hidden className="text-[var(--primary)]" size={22}/><h2 className="mt-3 text-xl font-bold leading-8 text-[var(--foreground)]"><Link href={`/guides/${guide.slug}`} className="hover:underline">{guide.title}</Link></h2><p className="mt-2 flex-1 leading-7 text-[var(--text-muted)]">{guide.description}</p><div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--text-muted)]"><time dateTime={guide.updatedAt}>{formatDate(guide.updatedAt)}</time><span>{guide.readingTime}</span></div><Link href={`/guides/${guide.slug}`} className="mt-4 inline-flex items-center gap-2 font-bold text-[var(--primary)]">가이드 읽기<ArrowRight aria-hidden size={16}/></Link></article>;
}

function formatDate(date: string) { return date.replace(/-/g, "."); }
