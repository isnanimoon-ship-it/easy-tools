import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { GuideCard } from "@/components/guides/guide-card";
import { Container } from "@/components/layout/container";
import { routing } from "@/i18n/routing";
import { GUIDES } from "@/lib/content/guides";
import { createKoreanPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "ko") return { robots: { index: false, follow: true } };
  return createKoreanPageMetadata({ title: "Konly 활용 가이드", description: "파일과 스크린샷을 공유하거나 문서를 확인할 때 놓치기 쉬운 부분을 실제 작업 상황 중심으로 정리합니다.", pathname: "/ko/guides" });
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale) || locale !== "ko") notFound();
  setRequestLocale(locale);
  return <><section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Konly 활용 가이드</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">도구 사용법만 나열하지 않고, 파일을 공유하거나 문서를 확인할 때 놓치기 쉬운 부분을 실제 작업 상황 중심으로 정리합니다.</p></div></Container></section><Container className="py-10 sm:py-14"><div className="grid gap-5 md:grid-cols-2">{GUIDES.map(guide => <GuideCard key={guide.slug} guide={guide}/>)}</div></Container></>;
}
