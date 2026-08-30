import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { KoreanInitialConverter } from "@/components/tools/korean-initial-converter/korean-initial-converter";
import { routing, type AppLocale } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({
    locale,
    namespace: "Tools.koreanInitialConverter.metadata",
  });
  return createPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: `/${locale}/tools/korean-initial-converter`,
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.koreanInitialConverter");
  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">
              {t("description")}
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8 sm:py-12">
        <KoreanInitialConverter />
      </Container>
    </>
  );
}
