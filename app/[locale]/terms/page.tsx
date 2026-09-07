import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

const SECTION_KEYS = [
  "use",
  "features",
  "accuracy",
  "responsibility",
  "copyright",
  "external",
  "changes",
  "disclaimer",
] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Terms.metadata" });

  return createPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: `/${locale}/terms`,
  });
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Terms");

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-sm text-[var(--text-muted)]">{t("lastUpdated")}</p>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("intro")}</p>
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-6 py-8 sm:py-12">
        {SECTION_KEYS.map((section) => (
          <section key={section} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{t(`sections.${section}.title`)}</h2>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">{t(`sections.${section}.body`)}</p>
          </section>
        ))}
      </Container>
    </>
  );
}
