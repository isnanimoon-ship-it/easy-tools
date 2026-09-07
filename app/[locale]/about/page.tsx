import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "About.metadata" });

  return createPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: `/${locale}/about`,
  });
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("About");

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("intro")}</p>
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-6 py-8 sm:py-12">
        {(["service", "access", "browser", "improvement"] as const).map((section) => (
          <InfoSection key={section} title={t(`sections.${section}.title`)}>
            {t(`sections.${section}.body`)}
          </InfoSection>
        ))}

        <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6">
          <h2 className="text-xl font-bold text-[var(--info-fg)]">{t("contact.title")}</h2>
          <p className="mt-3 leading-7 text-[var(--info-fg)]">{t("contact.body")}</p>
          <Link href="/contact" className="mt-4 inline-flex font-bold text-[var(--info-fg)] hover:underline">
            {t("contact.link")}
          </Link>
        </section>
      </Container>
    </>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 leading-7 text-[var(--text-muted)]">{children}</p>
    </section>
  );
}
