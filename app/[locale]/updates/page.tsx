import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_UPDATES } from "@/lib/content/updates";
import { createKoreanPageMetadata } from "@/lib/seo";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

type Props = { params: Promise<{ locale: string }> };
const TYPE_LABEL = { new: "새 기능", improvement: "개선", fix: "오류 수정", policy: "운영 정책" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (locale !== "ko") return { robots: { index: false, follow: true } }; return createKoreanPageMetadata({ title: "Konly 업데이트", description: "새로운 기능, 오류 수정, 지원 범위 변경 등 Konly에 실제로 적용한 변경사항을 기록합니다.", pathname: "/ko/updates" }); }

export default async function UpdatesPage({ params }: Props) { const { locale } = await params; if (!hasLocale(routing.locales, locale) || locale !== "ko") notFound(); setRequestLocale(locale); return <><section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Konly 업데이트</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">새로운 기능, 오류 수정, 지원 범위 변경 등 실제 서비스 변경사항을 기록합니다.</p></div></Container></section><Container className="max-w-4xl py-10 sm:py-14"><ol className="grid gap-5">{SITE_UPDATES.map(update => <li key={`${update.date}-${update.title}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"><div className="flex flex-wrap items-center gap-3"><time dateTime={update.date} className="font-bold text-[var(--foreground)]">{update.date.replace(/-/g, ".")}</time><span className="rounded-full bg-[var(--info-bg)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">{TYPE_LABEL[update.type]}</span></div><h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">{update.title}</h2><p className="mt-2 leading-7 text-[var(--text-muted)]">{update.description}</p>{update.relatedTools?.length ? <div className="mt-4 flex flex-wrap gap-2">{update.relatedTools.map(path => { const tool = PUBLIC_TOOLS.find(item => item.path === path); return tool ? <Link key={path} href={path} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--primary)]">{tool.translationKey === "hwpHwpxViewer" ? "HWP 뷰어" : tool.translationKey === "privacyRedactor" ? "개인정보 가리기" : tool.translationKey === "screenshotStitcher" ? "스크린샷 이어붙이기" : tool.translationKey === "imageMetadataRemover" ? "메타데이터 삭제" : "상태바 제거"}</Link> : null; })}</div> : null}</li>)}</ol></Container></> }
