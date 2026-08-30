import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { QrCodeGenerator, type QrCodeGeneratorLabels } from "@/components/tools/qr-code-generator/qr-code-generator";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.qrCodeGenerator.metadata" }); const pathname = `/${locale}/tools/qr-code-generator`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Tools.qrCodeGenerator");
  const labels: QrCodeGeneratorLabels = {
    inputLabel: t("input.label"), inputHelp: t("input.help"), placeholder: t("input.placeholder"), previewTitle: t("preview.title"), empty: t("preview.empty"), processing: t("preview.processing"), canvasLabel: t("preview.canvasLabel"),
    optionsTitle: t("options.title"), sizeLabel: t("options.size.label"), sizeHelp: t("options.size.help"), levelLabel: t("options.level.label"), levelHelp: t("options.level.help"), marginLabel: t("options.margin.label"), marginHelp: t("options.margin.help"),
    levels: { L: t("options.level.L"), M: t("options.level.M"), Q: t("options.level.Q"), H: t("options.level.H") }, margins: { 4: t("options.margin.4"), 6: t("options.margin.6"), 8: t("options.margin.8") },
    currentSize: t("preview.size"), currentLevel: t("preview.level"), currentMargin: t("preview.margin"), inputType: t("preview.type"), inputTypes: { text: t("preview.types.text"), url: t("preview.types.url") }, effectiveLevel: t("preview.effectiveLevel"),
    download: t("actions.download"), copyInput: t("actions.copyInput"), clear: t("actions.clear"), downloaded: t("actions.downloaded"), copied: t("actions.copied"), densityWarning: t("warning.density"),
    errors: { "capacity-exceeded": t("errors.capacity"), "size-too-small": t("errors.size"), "generation-failed": t("errors.generation"), "download-failed": t("errors.download"), "copy-failed": t("errors.copy") },
    sourceTypeLabel: t("source.label"),
    sourceTypes: { text: t("source.types.text"), wifi: t("source.types.wifi"), contact: t("source.types.contact"), email: t("source.types.email"), phone: t("source.types.phone"), sms: t("source.types.sms"), location: t("source.types.location") },
    payloadPreviewLabel: t("source.payloadPreview"),
    wifi: { ssid: t("source.wifi.ssid"), ssidPlaceholder: t("source.wifi.ssidPlaceholder"), password: t("source.wifi.password"), security: t("source.wifi.security"), securityOptions: { WPA: t("source.wifi.securityOptions.WPA"), WEP: t("source.wifi.securityOptions.WEP"), nopass: t("source.wifi.securityOptions.nopass") }, hidden: t("source.wifi.hidden") },
    contact: { firstName: t("source.contact.firstName"), lastName: t("source.contact.lastName"), phone: t("source.contact.phone"), email: t("source.contact.email") },
    email: { address: t("source.email.address"), subject: t("source.email.subject"), body: t("source.email.body") },
    phone: { number: t("source.phone.number") },
    sms: { number: t("source.sms.number"), message: t("source.sms.message") },
    location: { latitude: t("source.location.latitude"), longitude: t("source.location.longitude") },
    logo: {
      title: t("logo.title"), upload: t("logo.upload"), remove: t("logo.remove"), help: t("logo.help"), boosted: t("logo.boosted"),
      errors: { "unsupported-type": t("logo.errors.unsupportedType"), "file-too-large": t("logo.errors.fileTooLarge") },
    },
  };
  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p></div></Container></section>
    <Container className="py-8 sm:py-12"><QrCodeGenerator labels={labels} />
      <section className="mt-8 grid gap-4 md:grid-cols-2"><Info title={t("guide.title")} text={t("guide.description")} /><Info title={t("correction.title")} text={t("correction.description")} /><Info title={t("scan.title")} text={t("scan.description")} /><Info title={t("privacy.title")} text={t("privacy.description")} blue /></section>
    </Container>
  </>;
}
function Info({ title, text, blue = false }: { title: string; text: string; blue?: boolean }) { return <div className={`rounded-2xl border p-5 sm:p-6 ${blue ? "border-[var(--info-border)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><h2 className={`font-bold ${blue ? "text-[var(--info-fg)]" : "text-[var(--foreground)]"}`}>{title}</h2><p className={`mt-2 text-sm leading-6 ${blue ? "text-[var(--info-fg)]" : "text-[var(--text-muted)]"}`}>{text}</p></div>; }
