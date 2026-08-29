import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import {
  WordCounter,
  type WordCounterLabels,
} from "@/components/tools/word-counter/word-counter";
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
  };

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p>
          </div>
        </Container>
      </section>

      <Container className="py-8 sm:py-12">
        <WordCounter locale={locale} labels={labels} />

        <section
          aria-labelledby="word-counter-guide-heading"
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 id="word-counter-guide-heading" className="font-bold text-[var(--foreground)]">
              {t("guide.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("guide.description")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("guide.fallback")}</p>
          </div>
          <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6">
            <h2 className="font-bold text-[var(--info-fg)]">{t("privacy.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--info-fg)]">{t("privacy.description")}</p>
          </div>
        </section>
      </Container>
    </>
  );
}
