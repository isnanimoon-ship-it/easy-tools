import type { Metadata } from "next";
import { Bug, Lightbulb, Mail } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "Contact.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}/contact` });
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const bugItems = t.raw("sections.bugReport.items") as string[];
  const email = t("sections.email.email");

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
        <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Mail aria-hidden="true" size={20} className="text-[var(--info-fg)]" />
            <h2 className="text-xl font-bold text-[var(--info-fg)]">{t("sections.email.title")}</h2>
          </div>
          <p className="mt-3 leading-7 text-[var(--info-fg)]">{t("sections.email.body")}</p>
          <a href={`mailto:${email}`} className="mt-3 inline-block text-lg font-bold text-[var(--info-fg)] hover:underline">
            {email}
          </a>
        </section>

        <ContactSection icon={<Bug aria-hidden="true" size={20} />} title={t("sections.bugReport.title")}>
          <p>{t("sections.bugReport.body")}</p>
          <ul className="list-disc space-y-1 pl-5">
            {bugItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </ContactSection>

        <ContactSection icon={<Lightbulb aria-hidden="true" size={20} />} title={t("sections.featureRequest.title")}>
          <p>{t("sections.featureRequest.body")}</p>
        </ContactSection>

        <p className="rounded-2xl bg-[var(--surface-muted)] p-5 text-sm leading-7 text-[var(--text-muted)]">{t("sections.responseTime.body")}</p>
      </Container>
    </>
  );
}

function ContactSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <span className="text-[var(--primary)]">{icon}</span>
        <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 leading-7 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}
