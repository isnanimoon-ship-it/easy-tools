import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PasswordGenerator, type PasswordGeneratorLabels } from "@/components/tools/password-generator/password-generator";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.passwordGenerator.metadata" });
  const pathname = `/${locale}/tools/password-generator`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function PasswordGeneratorPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.passwordGenerator");
  const labels: PasswordGeneratorLabels = {
    lengthGroup: t("settings.lengthGroup"), rangeLabel: t("settings.rangeLabel"), numberLabel: t("settings.numberLabel"), characterTypes: t("settings.characterTypes"),
    uppercase: t("settings.uppercase"), lowercase: t("settings.lowercase"), numbers: t("settings.numbers"), symbols: t("settings.symbols"),
    generate: t("actions.generate"), resultLabel: t("result.label"), emptyResult: t("result.empty"), copy: t("actions.copy"), copied: t("actions.copied"),
    strengthLabel: t("strength.label"), strength: { weak: t("strength.weak"), medium: t("strength.medium"), strong: t("strength.strong") },
    strengthDescription: { weak: t("strength.weakDescription"), medium: t("strength.mediumDescription"), strong: t("strength.strongDescription") }, strengthNotice: t("strength.notice"),
    allDisabledError: t("error.allDisabled"), lengthError: t("error.length"), randomError: t("error.random"), copyError: t("error.copy"),
  };
  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p></div></Container></section>
    <Container className="py-8 sm:py-12"><PasswordGenerator labels={labels} /><section className="mt-8 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="font-bold text-[var(--foreground)]">{t("guide.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("guide.description")}</p></div>
      <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6"><h2 className="font-bold text-[var(--info-fg)]">{t("privacy.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--info-fg)]">{t("privacy.description")}</p></div>
    </section></Container>
  </>;
}
