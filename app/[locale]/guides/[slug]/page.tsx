import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import { GUIDES, guideBySlug, type GuideSection } from "@/lib/content/guides";
import { createKoreanPageMetadata } from "@/lib/seo";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() { return GUIDES.map(guide => ({ locale: "ko", slug: guide.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = locale === "ko" ? guideBySlug(slug) : undefined;
  if (!guide) return { robots: { index: false, follow: true } };
  return createKoreanPageMetadata({ title: guide.title, description: guide.description, pathname: `/ko/guides/${guide.slug}`, type: "article" });
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  const guide = locale === "ko" ? guideBySlug(slug) : undefined;
  if (!guide) notFound();
  setRequestLocale(locale);
  return <><article><header className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="max-w-4xl py-10 sm:py-14"><Link href="/guides" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><ArrowLeft aria-hidden size={16}/>활용 가이드</Link><h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{guide.title}</h1><p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{guide.description}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-muted)]"><span>Konly 운영자</span><time dateTime={guide.updatedAt}>업데이트 {guide.updatedAt.replace(/-/g, ".")}</time><span>{guide.readingTime}</span></div></Container></header><Container className="max-w-4xl py-10 sm:py-14"><div className="grid gap-10">{guide.sections.map((section, index) => <GuideSectionView key={`${section.type}-${index}`} section={section}/>)}</div><RelatedTools paths={guide.relatedTools}/></Container></article></>;
}

function GuideSectionView({ section }: { section: GuideSection }) {
  if (section.type === "text") return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2><div className="mt-4 grid gap-3 leading-8 text-[var(--text-muted)]">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>;
  if (section.type === "notice") return <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-7"><h2 className="text-xl font-bold text-[var(--info-fg)]">{section.title}</h2><p className="mt-3 leading-7 text-[var(--info-fg)]">{section.text}</p></section>;
  if (section.type === "compare") return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{section.columns.map(column => <div key={column.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-bold text-[var(--foreground)]">{column.title}</h3><ul className="mt-3 grid gap-2">{column.items.map(item => <li key={item} className="flex gap-2 leading-7 text-[var(--text-muted)]"><CheckCircle2 aria-hidden className="mt-1.5 shrink-0 text-[var(--primary)]" size={17}/>{item}</li>)}</ul></div>)}</div></section>;
  if (section.type === "steps") return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2><ol className="mt-5 grid gap-4 sm:grid-cols-2">{section.items.map((item, index) => <li key={item.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="grid size-8 place-items-center rounded-full bg-[var(--primary-fill)] text-sm font-bold text-white">{index + 1}</span><h3 className="mt-3 font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-2 leading-7 text-[var(--text-muted)]">{item.text}</p></li>)}</ol></section>;
  return <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{section.title}</h2>{section.intro ? <p className="mt-3 leading-7 text-[var(--text-muted)]">{section.intro}</p> : null}<ul className="mt-5 grid gap-3 sm:grid-cols-2">{section.items.map(item => <li key={item} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 leading-7 text-[var(--text-muted)]"><CheckCircle2 aria-hidden className="mt-1.5 shrink-0 text-[var(--primary)]" size={17}/>{item}</li>)}</ul></section>;
}

function RelatedTools({ paths }: { paths: readonly string[] }) { return <section className="mt-12 border-t border-[var(--border)] pt-10"><h2 className="text-2xl font-bold text-[var(--foreground)]">이 가이드와 연결된 도구</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{paths.map(path => { const tool = PUBLIC_TOOLS.find(item => item.path === path); if (!tool) return null; const Icon = tool.icon; return <Link key={path} href={tool.path} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon aria-hidden className="text-[var(--primary)]" size={22}/><h3 className="mt-3 font-bold text-[var(--foreground)]">{toolTitle(tool.translationKey)}</h3><span className="mt-2 inline-block text-sm font-bold text-[var(--primary)]">도구 열기 →</span></Link>; })}</div></section>; }

const TITLES: Record<string, string> = { privacyRedactor: "이미지 개인정보 가리기", imageMetadataRemover: "사진 메타데이터 삭제", screenshotStatusbarRemover: "스크린샷 상태바 제거", screenshotStitcher: "스크린샷 이어붙이기", hwpHwpxViewer: "HWP·HWPX 문서 뷰어" };
function toolTitle(key: string) { return TITLES[key] ?? key; }
