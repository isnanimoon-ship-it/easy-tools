import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { MarkdownViewer } from "@/components/tools/markdown-viewer/markdown-viewer";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.markdownViewer.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}/tools/markdown-viewer` });
}

export default async function MarkdownViewerPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.markdownViewer");
  const common = await getTranslations("Common");
  return <>
    <ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "text", label: common("toolsNav.categories.text") }} tool={{ path: "/tools/markdown-viewer", label: t("title") }} />
    <Container className="py-8 sm:py-12"><MarkdownViewer/><ToolDetailContent toolPath="/tools/markdown-viewer" locale={locale}/></Container>
  </>;
}
