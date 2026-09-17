import { ArrowRight, CheckCircle2, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { RelatedGuides } from "@/components/guides/related-guides";
import type { AppLocale } from "@/i18n/routing";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import {
  REPRESENTATIVE_TOOL_DETAILS,
  type RepresentativeBlock,
  type RepresentativePath,
} from "@/lib/tools/representative-detail-data";
import { PUBLIC_TOOLS, type ToolPath } from "@/lib/tools/registry";

export async function RepresentativeToolDetail({ toolPath, locale }: { toolPath: RepresentativePath; locale: AppLocale }) {
  if (locale === "ja") return null;
  if (locale === "en") return <ToolDetailContent toolPath={toolPath} locale={locale} />;

  const content = REPRESENTATIVE_TOOL_DETAILS[toolPath];
  const home = await getTranslations({ locale, namespace: "Home.tools" });

  return (
    <div data-representative-detail={toolPath} className="mt-12 border-t border-[var(--border)] pt-12 sm:mt-16 sm:pt-16">
      <div className="grid min-w-0 gap-12">
        <section aria-label="처리 정보" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {content.facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--text-muted)]">{fact.label}</p>
              <p className="mt-1 font-bold leading-6 text-[var(--foreground)]">{fact.value}</p>
            </div>
          ))}
        </section>

        {content.blocks.map((block, index) => <ContentBlock key={`${block.type}-${index}`} block={block} />)}

        <section aria-labelledby={`${slugId(toolPath)}-faq`}>
          <h2 id={`${slugId(toolPath)}-faq`} className="text-2xl font-bold text-[var(--foreground)]">자주 묻는 질문</h2>
          <div className="mt-5 grid gap-3">
            {content.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <summary className="cursor-pointer list-none pr-6 font-bold text-[var(--foreground)] marker:hidden">{faq.question}</summary>
                <p className="mt-3 leading-7 text-[var(--text-muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <ToolLinks paths={content.related} home={home} />
        <RelatedGuides toolPath={toolPath} />
        <section className="rounded-2xl border border-dashed border-[var(--border)] p-5"><h2 className="text-lg font-bold text-[var(--foreground)]">이 도구에서 문제가 발생했나요?</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">도구 이름과 재현 과정을 알려주시면 확인하는 데 도움이 됩니다. 개인정보가 포함된 원본 파일은 보내지 마세요.</p><Link href={`/contact?tool=${encodeURIComponent(toolPath)}`} className="mt-3 inline-flex items-center gap-1 font-bold text-[var(--primary)]">오류 제보하기<ArrowRight aria-hidden size={16}/></Link></section>
      </div>
    </div>
  );
}

function ContentBlock({ block }: { block: RepresentativeBlock }) {
  if (block.type === "notice") {
    const Icon = block.tone === "warning" ? TriangleAlert : Info;
    const colors = block.tone === "warning"
      ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]"
      : "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
    return <section className={`rounded-2xl border p-5 sm:p-7 ${colors}`}><div className="flex items-start gap-3"><Icon aria-hidden className="mt-0.5 shrink-0" size={24}/><div><h2 className="text-xl font-bold">{block.title}</h2><p className="mt-2 leading-7">{block.text}</p></div></div></section>;
  }

  if (block.type === "link") {
    return <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-7"><div className="flex items-start gap-3"><ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-[var(--primary)]" size={24}/><div><h2 className="text-xl font-bold text-[var(--info-fg)]">{block.title}</h2><p className="mt-2 leading-7 text-[var(--info-fg)]">{block.text}</p><Link href={block.path} className="mt-3 inline-flex items-center gap-1 font-bold text-[var(--primary)] hover:underline">{block.label}<ArrowRight aria-hidden size={16}/></Link></div></div></section>;
  }

  if (block.type === "cards") {
    return <section><SectionHeading block={block}/><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{block.items.map((item) => <article key={item.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.text}</p></article>)}</div></section>;
  }

  if (block.type === "compare") {
    return <section><SectionHeading block={block}/><div className="mt-5 grid gap-4 md:grid-cols-2">{block.columns.map((column) => <article key={column.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-bold text-[var(--foreground)]">{column.title}</h3><ul className="mt-3 grid gap-2">{column.items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-muted)]"><CheckCircle2 aria-hidden className="mt-1 shrink-0 text-[var(--primary)]" size={16}/><span>{item}</span></li>)}</ul></article>)}</div></section>;
  }

  if (block.type === "workflow") {
    return <section><SectionHeading block={block}/><ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{block.items.map((item, index) => <li key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="grid size-8 place-items-center rounded-full bg-[var(--primary-fill)] text-sm font-bold text-white">{index + 1}</span><p className="mt-3 leading-7 text-[var(--text-muted)]">{item}</p></li>)}</ol></section>;
  }

  if (block.type === "list") {
    return <section><SectionHeading block={block}/><ul className="mt-5 grid gap-3 md:grid-cols-2">{block.items.map((item) => <li key={item} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 leading-7 text-[var(--text-muted)]"><CheckCircle2 aria-hidden className="mt-1 shrink-0 text-[var(--primary)]" size={20}/><span>{item}</span></li>)}</ul></section>;
  }

  return <section className="min-w-0"><SectionHeading block={block}/><div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><caption className="sr-only">{block.type === "table" ? block.caption : block.title}</caption><thead className="bg-[var(--surface-muted)]"><tr>{block.columns.map((column) => <th key={column} scope="col" className="border-b border-[var(--border)] px-4 py-3 font-bold text-[var(--foreground)]">{column}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={`${row.join("-")}-${rowIndex}`} className="border-b border-[var(--border)] last:border-0">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-4 py-3 align-top leading-6 text-[var(--text-muted)]">{cell}</td>)}</tr>)}</tbody></table></div>{block.type === "example" && block.note ? <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{block.note}</p> : null}</section>;
}

function SectionHeading({ block }: { block: Exclude<RepresentativeBlock, { type: "notice" } | { type: "link" }> }) {
  return <><h2 className="text-2xl font-bold text-[var(--foreground)]">{block.title}</h2>{"intro" in block && block.intro ? <p className="mt-3 leading-7 text-[var(--text-muted)]">{block.intro}</p> : null}</>;
}

function ToolLinks({ paths, home }: { paths: readonly ToolPath[]; home: Awaited<ReturnType<typeof getTranslations>> }) {
  return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">함께 사용하기 좋은 도구</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paths.map((path) => { const tool = PUBLIC_TOOLS.find((item) => item.path === path); if (!tool) return null; const Icon = tool.icon; return <Link key={path} href={path} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--info-border)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Icon aria-hidden className="text-[var(--primary)]" size={22}/><h3 className="mt-3 font-bold text-[var(--foreground)]">{home(`${tool.translationKey}.title`)}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{home(`${tool.translationKey}.description`)}</p><span className="mt-3 inline-flex items-center gap-1 font-semibold text-[var(--primary)]">{home("open")}<ArrowRight aria-hidden size={16}/></span></Link>; })}</div></section>;
}

function slugId(path: RepresentativePath) { return path.slice("/tools/".length); }
