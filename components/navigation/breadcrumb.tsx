import { ChevronRight, Home } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { ToolCategoryKey, ToolPath } from "@/lib/tools/registry";

type BreadcrumbProps = {
  locale: string;
  homeLabel: string;
  category: { key: ToolCategoryKey; label: string };
  tool: { path: ToolPath; label: string };
};

export function Breadcrumb({ locale, homeLabel, category, tool }: BreadcrumbProps) {
  const origin = "https://www.konly.co.kr";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: homeLabel, item: `${origin}/${locale}` },
      { "@type": "ListItem", position: 2, name: category.label, item: `${origin}/${locale}/#categories` },
      { "@type": "ListItem", position: 3, name: tool.label, item: `${origin}/${locale}${tool.path}` },
    ],
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <li><Link href="/" className="inline-flex items-center gap-1 rounded-md hover:text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Home aria-hidden="true" size={15} /><span>{homeLabel}</span></Link></li>
          <li aria-hidden="true"><ChevronRight size={15} /></li>
          <li><Link href={`/#categories`} className="rounded-md hover:text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">{category.label}</Link></li>
          <li aria-hidden="true"><ChevronRight size={15} /></li>
          <li className="min-w-0"><Link href={tool.path} aria-current="page" className="block truncate rounded-md font-semibold text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">{tool.label}</Link></li>
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
