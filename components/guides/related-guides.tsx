import { ArrowRight, BookOpenText } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { GUIDES, TOOL_GUIDES } from "@/lib/content/guides";
import type { ToolPath } from "@/lib/tools/registry";

export function RelatedGuides({ toolPath }: { toolPath: ToolPath }) {
  const slugs = TOOL_GUIDES[toolPath] ?? [];
  const guides = slugs.map(slug => GUIDES.find(guide => guide.slug === slug)).filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  if (!guides.length) return null;
  return <section aria-labelledby={`${toolPath.slice(7)}-guides`}><h2 id={`${toolPath.slice(7)}-guides`} className="text-2xl font-bold text-[var(--foreground)]">더 알아보기</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{guides.map(guide => <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--info-border)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><BookOpenText aria-hidden className="text-[var(--primary)]" size={22}/><h3 className="mt-3 font-bold leading-7 text-[var(--foreground)]">{guide.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{guide.description}</p><span className="mt-3 inline-flex items-center gap-1 font-bold text-[var(--primary)]">가이드 읽기<ArrowRight aria-hidden size={16}/></span></Link>)}</div></section>;
}
