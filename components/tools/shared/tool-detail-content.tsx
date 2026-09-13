"use client";

import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { TOOL_DETAIL_CONFIG, type DetailToolPath } from "@/lib/tools/detail-content";
import { TOOL_DETAIL_DATA, type DetailSection } from "@/lib/tools/detail-content-data";
import { PUBLIC_TOOLS, type ToolPath } from "@/lib/tools/registry";

export function ToolDetailContent({ toolPath, locale }: { toolPath: DetailToolPath; locale: AppLocale }) {
  const config = TOOL_DETAIL_CONFIG[toolPath];
  const home = useTranslations("Home.tools");
  const content = TOOL_DETAIL_DATA[locale][toolPath];
  if (!content) return null;

  return (
    <div className="mt-12 border-t border-[var(--border)] pt-12 sm:mt-16 sm:pt-16">
      <div className="grid min-w-0 gap-12">
        {content.sections.map((section, index) => <ContentSection key={`${section.type}-${index}`} section={section} />)}

        {content.privacy ? <section aria-labelledby={`${config.namespace}-privacy-heading`} className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--primary)]" size={24} />
            <div>
              <h2 id={`${config.namespace}-privacy-heading`} className="text-xl font-bold text-[var(--info-fg)]">{content.privacy.title}</h2>
              <p className="mt-2 leading-7 text-[var(--info-fg)]">{content.privacy.description}</p>
            </div>
          </div>
        </section> : null}

        <section aria-labelledby={`${config.namespace}-faq-heading`}>
          <h2 id={`${config.namespace}-faq-heading`} className="text-2xl font-bold text-[var(--foreground)]">{content.faqs.title}</h2>
          <div className="mt-5 grid gap-3">
            {content.faqs.items.map((faq) => <details key={faq.question} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><summary className="cursor-pointer list-none pr-6 font-bold text-[var(--foreground)] marker:hidden">{faq.question}</summary><p className="mt-3 leading-7 text-[var(--text-muted)]">{faq.answer}</p></details>)}
          </div>
        </section>

        <ToolLinks title={content.relatedTitle} paths={config.related} home={home} />
        <ToolLinks title={content.popularTitle} paths={config.popular} home={home} />
      </div>
    </div>
  );
}

function ContentSection({ section }: { section: DetailSection }) {
  if (section.type === "text") {
    return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2><div className="mt-4 grid gap-3 text-base leading-7 text-[var(--text-muted)]">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>;
  }

  if (section.type === "example") {
    return <section className="min-w-0"><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2>{section.intro ? <p className="mt-3 leading-7 text-[var(--text-muted)]">{section.intro}</p> : null}<div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">{section.items.map((item) => <div key={item.label} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-bold text-[var(--foreground)]">{item.label}</h3><pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--code-bg)] p-4 text-sm leading-6 text-[var(--code-fg)]"><code>{item.value}</code></pre></div>)}</div></section>;
  }

  const ordered = section.type === "steps";
  const ListTag = ordered ? "ol" : "ul";
  return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2>{section.intro ? <p className="mt-3 leading-7 text-[var(--text-muted)]">{section.intro}</p> : null}<ListTag className="mt-5 grid gap-4 md:grid-cols-2">{section.items.map((item, index) => <li key={item.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">{ordered ? <span className="grid size-8 place-items-center rounded-full bg-[var(--primary-fill)] text-sm font-bold text-white">{index + 1}</span> : <CheckCircle2 aria-hidden="true" className="text-[var(--primary)]" size={22} />}<h3 className="mt-3 font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.text}</p></li>)}</ListTag></section>;
}

function ToolLinks({ title, paths, home }: { title: string; paths: readonly ToolPath[]; home: ReturnType<typeof useTranslations> }) {
  return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paths.map((path) => { const tool = PUBLIC_TOOLS.find((item) => item.path === path); if (!tool) return null; const Icon = tool.icon; return <Link key={path} href={path} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--info-border)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Icon aria-hidden="true" className="text-[var(--primary)]" size={22} /><h3 className="mt-3 font-bold text-[var(--foreground)]">{home(`${tool.translationKey}.title`)}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{home(`${tool.translationKey}.description`)}</p><span className="mt-3 inline-flex items-center gap-1 font-semibold text-[var(--primary)]">{home("open")}<ArrowRight aria-hidden="true" size={16} className="transition-transform group-hover:translate-x-1" /></span></Link>; })}</div></section>;
}
