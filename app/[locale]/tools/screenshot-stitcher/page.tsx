import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { InlineShareBar } from "@/components/layout/share-bar";
import { ScreenshotStitcher } from "@/components/tools/screenshot-stitcher/screenshot-stitcher";
import { RepresentativeToolDetail } from "@/components/tools/shared/representative-tool-detail";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";
import { REPRESENTATIVE_TOOL_DETAILS } from "@/lib/tools/representative-detail-data";

type Props = { params: Promise<{ locale: string }> };
const path = "/tools/screenshot-stitcher" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.screenshotStitcher.metadata" });
  const content = REPRESENTATIVE_TOOL_DETAILS[path];
  return createPageMetadata({ locale, title: locale === "ko" ? content.metadata.title : t("title"), description: locale === "ko" ? content.metadata.description : t("description"), pathname: `/${locale}${path}` });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.screenshotStitcher");
  const common = await getTranslations("Common");
  const content = REPRESENTATIVE_TOOL_DETAILS[path];
  const title = locale === "ko" ? content.hero.title : t("title");
  const description = locale === "ko" ? content.hero.description : t("description");
  return <><ToolPageHero locale={locale} title={title} description={description} homeLabel={common("homeLabel")} category={{ key: "image", label: common("toolsNav.categories.image") }} tool={{ path, label: common("toolsNav.screenshotStitcher") }}/><Container className="py-8 sm:py-12"><ScreenshotStitcher/><InlineShareBar/><RepresentativeToolDetail toolPath={path} locale={locale}/></Container></>;
}
