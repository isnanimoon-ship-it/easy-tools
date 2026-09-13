import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { InlineShareBar } from "@/components/layout/share-bar";
import {
  WordCounter,
  type WordCounterLabels,
} from "@/components/tools/word-counter/word-counter";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type WordCounterPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: WordCounterPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Tools.wordCounter.metadata" });
  const pathname = `/${locale}/tools/word-counter`;

  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function WordCounterPage({ params }: WordCounterPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations("Tools.wordCounter");
  const common = await getTranslations("Common");
  const labels: WordCounterLabels = {
    inputLabel: t("input.label"),
    inputDescription: t("input.description"),
    placeholder: t("input.placeholder"),
    reset: t("reset"),
    resultsLabel: t("results.label"),
    characters: t("results.characters"),
    charactersWithoutWhitespace: t("results.charactersWithoutWhitespace"),
    words: t("results.words"),
    lines: t("results.lines"),
    readingTimeMinutes: t.raw("readingTime.minutes"),
    readingTimeSeconds: t.raw("readingTime.seconds"),
    copyResults: t("actions.copyResults"),
    copied: t("actions.copied"),
    copyError: t("actions.copyError"),
  };

  return (
    <>
      <ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "text", label: common("toolsNav.categories.text") }} tool={{ path: "/tools/word-counter", label: t("title") }} />

      <Container className="py-8 sm:py-12">
        <WordCounter locale={locale} labels={labels} />

        <InlineShareBar />

        <ToolDetailContent toolPath="/tools/word-counter" locale={locale} />
      </Container>
    </>
  );
}
