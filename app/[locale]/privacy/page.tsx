import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Privacy.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}/privacy` });
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  const thirdPartyItems = t.raw("sections.thirdParty.items") as string[];

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
        <PolicySection title={t("sections.principle.title")}>
          <p>{t("sections.principle.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.dataCollected.title")}>
          <p>{t("sections.dataCollected.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.ads.title")}>
          <p>{t("sections.ads.body")}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--primary)]">
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t("sections.ads.optOutLink")}
            </a>
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t("sections.ads.policyLink")}
            </a>
          </div>
        </PolicySection>

        <PolicySection title={t("sections.analytics.title")}>
          <p>{t("sections.analytics.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.thirdParty.title")}>
          <ul className="list-disc space-y-1 pl-5">
            {thirdPartyItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </PolicySection>

        <PolicySection title={t("sections.cookies.title")}>
          <p>{t("sections.cookies.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.children.title")}>
          <p>{t("sections.children.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.changes.title")}>
          <p>{t("sections.changes.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.contact.title")}>
          <p>{t("sections.contact.body")}</p>
          <a href={`mailto:${t("sections.contact.email")}`} className="mt-2 inline-block font-semibold text-[var(--primary)] hover:underline">
            {t("sections.contact.email")}
          </a>
        </PolicySection>
      </Container>
    </>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}
