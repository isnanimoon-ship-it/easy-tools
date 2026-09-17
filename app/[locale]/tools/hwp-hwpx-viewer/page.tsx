import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { HwpHwpxViewer } from "@/components/tools/hwp-hwpx-viewer/hwp-hwpx-viewer";
import { InlineShareBar } from "@/components/layout/share-bar";
import { RepresentativeToolDetail } from "@/components/tools/shared/representative-tool-detail";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";
import { REPRESENTATIVE_TOOL_DETAILS } from "@/lib/tools/representative-detail-data";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.hwpHwpxViewer.metadata" });
  const content = REPRESENTATIVE_TOOL_DETAILS["/tools/hwp-hwpx-viewer"];
  return createPageMetadata({ locale, title: locale === "ko" ? content.metadata.title : t("title"), description: locale === "ko" ? content.metadata.description : t("description"), pathname: `/${locale}/tools/hwp-hwpx-viewer` });
}

export default async function HwpHwpxViewerPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.hwpHwpxViewer");
  const common = await getTranslations("Common");
  const content = REPRESENTATIVE_TOOL_DETAILS["/tools/hwp-hwpx-viewer"];
  const title = locale === "ko" ? content.hero.title : t("title");
  const description = locale === "ko" ? content.hero.description : t("description");

  return <>
    <ToolPageHero locale={locale} title={title} description={description} homeLabel={common("homeLabel")} category={{ key: "fileData", label: common("toolsNav.categories.fileData") }} tool={{ path: "/tools/hwp-hwpx-viewer", label: common("toolsNav.hwpHwpxViewer") }} />
    <Container className="py-8 sm:py-12">
      <HwpHwpxViewer />
      <InlineShareBar />
      <RepresentativeToolDetail toolPath="/tools/hwp-hwpx-viewer" locale={locale} />
    </Container>
  </>;
}
