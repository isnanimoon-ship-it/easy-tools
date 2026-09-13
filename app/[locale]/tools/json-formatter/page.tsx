import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { InlineShareBar } from "@/components/layout/share-bar";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { JsonFormatter, type JsonFormatterLabels } from "@/components/tools/json-formatter/json-formatter";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.jsonFormatter.metadata" });
  const pathname = `/${locale}/tools/json-formatter`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function JsonFormatterPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.jsonFormatter");
  const common = await getTranslations("Common");
  const labels: JsonFormatterLabels = {
    inputLabel: t("input.label"), inputDescription: t("input.description"), placeholder: t("input.placeholder"),
    format: t("actions.format"), minify: t("actions.minify"), copy: t("actions.copy"), clear: t("actions.clear"), copied: t("actions.copied"),
    invalid: t("error.invalid"), guidance: t("error.guidance"), position: t.raw("error.position"), copyError: t("error.copy"),
    viewEdit: t("view.edit"), viewTree: t("view.treeTab"), viewModeLabel: t("view.label"), treeInvalid: t("view.treeInvalid"),
    tree: {
      expandAll: t("view.tree.expandAll"), collapseAll: t("view.tree.collapseAll"),
      expandNode: t("view.tree.expandNode"), collapseNode: t("view.tree.collapseNode"),
      searchLabel: t("view.tree.searchLabel"), searchPlaceholder: t("view.tree.searchPlaceholder"),
      matchCount: t.raw("view.tree.matchCount"), noMatches: t("view.tree.noMatches"),
      prevMatch: t("view.tree.prevMatch"), nextMatch: t("view.tree.nextMatch"),
      itemCount: t.raw("view.tree.itemCount"),
    },
  };

  return <>
    <ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "developer", label: common("toolsNav.categories.developer") }} tool={{ path: "/tools/json-formatter", label: t("title") }} />
    <Container className="py-8 sm:py-12">
      <JsonFormatter labels={labels} />
      <InlineShareBar />
      <ToolDetailContent toolPath="/tools/json-formatter" locale={locale} />
    </Container>
  </>;
}
