import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { IpInfoLookup, type IpInfoLabels } from "@/components/tools/ip-info/ip-info";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.ipInfo.metadata" }); const pathname = `/${locale}/tools/ip-info`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Tools.ipInfo");
  const labels: IpInfoLabels = {
    currentTitle: t("current.title"), manualTitle: t("manual.title"), loading: t("status.loading"), emptyResult: t("manual.empty"), inputLabel: t("manual.label"), inputHelp: t("manual.help"), placeholder: t("manual.placeholder"),
    lookup: t("actions.lookup"), refresh: t("actions.refresh"), copy: t("actions.copy"), copied: t("actions.copied"), unknown: t("result.unknown"), approximate: t("result.approximate"), retryAfter: t.raw("errors.retryAfter"),
    fields: { ip: t("fields.ip"), version: t("fields.version"), country: t("fields.country"), region: t("fields.region"), city: t("fields.city"), isp: t("fields.isp"), organization: t("fields.organization"), asn: t("fields.asn"), timezone: t("fields.timezone"), continent: t("fields.continent"), postal: t("fields.postal"), coordinates: t("fields.coordinates"), callingCode: t("fields.callingCode") },
    errors: { "invalid-input": t("errors.invalidInput"), "non-public-ip": t("errors.nonPublic"), offline: t("errors.offline"), timeout: t("errors.timeout"), "rate-limited": t("errors.rateLimited"), "provider-unavailable": t("errors.unavailable"), "provider-rejected": t("errors.rejected"), "invalid-response": t("errors.invalidResponse"), "copy-failed": t("errors.copy") },
    categories: { loopback: t("categories.loopback"), private: t("categories.private"), "link-local": t("categories.linkLocal"), unspecified: t("categories.unspecified"), "carrier-grade-nat": t("categories.cgnat"), multicast: t("categories.multicast"), documentation: t("categories.documentation"), reserved: t("categories.reserved") },
  };
  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p><p className="mt-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm leading-6 text-[var(--warning-fg)]">{t("provider.notice")} <a href="https://ipwhois.io/privacy" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">{t("provider.privacyLink")}</a></p></div></Container></section>
    <Container className="py-8 sm:py-12"><IpInfoLookup labels={labels} />
      <section className="mt-8 grid gap-4 md:grid-cols-2"><Info title={t("guide.publicIpTitle")} text={t("guide.publicIpText")} /><Info title={t("guide.locationTitle")} text={t("guide.locationText")} /><Info title={t("guide.vpnTitle")} text={t("guide.vpnText")} /><Info title={t("guide.privacyTitle")} text={t("guide.privacyText")} blue /></section>
    </Container>
  </>;
}
function Info({ title, text, blue = false }: { title: string; text: string; blue?: boolean }) { return <div className={`rounded-2xl border p-5 sm:p-6 ${blue ? "border-[var(--info-border)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><h2 className={`font-bold ${blue ? "text-[var(--info-fg)]" : "text-[var(--foreground)]"}`}>{title}</h2><p className={`mt-2 text-sm leading-6 ${blue ? "text-[var(--info-fg)]" : "text-[var(--text-muted)]"}`}>{text}</p></div>; }
