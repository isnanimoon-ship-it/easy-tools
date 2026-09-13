import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { ImageMetadataRemover } from "@/components/tools/image-metadata-remover/image-metadata-remover";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.imageMetadataRemover.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}/tools/image-metadata-remover` });
}

export default async function ImageMetadataRemoverPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.imageMetadataRemover");
  const common = await getTranslations("Common");
  return <>
    <ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "image", label: common("toolsNav.categories.image") }} tool={{ path: "/tools/image-metadata-remover", label: t("title") }}/>
    <Container className="py-8 sm:py-12"><ImageMetadataRemover/><ToolDetailContent toolPath="/tools/image-metadata-remover" locale={locale}/></Container>
  </>;
}

