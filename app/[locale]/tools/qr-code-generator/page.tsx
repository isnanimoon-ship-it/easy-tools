import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { QrCodeGenerator, type QrCodeGeneratorLabels } from "@/components/tools/qr-code-generator/qr-code-generator";
import { routing } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.qrCodeGenerator.metadata" }); const pathname = `/${locale}/tools/qr-code-generator`;
  return { title: t("title"), description: t("description"), alternates: { canonical: pathname, languages: Object.fromEntries(routing.locales.map((item) => [item, `/${item}/tools/qr-code-generator`])) } };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Tools.qrCodeGenerator");
  const labels: QrCodeGeneratorLabels = {
    inputLabel: t("input.label"), inputHelp: t("input.help"), placeholder: t("input.placeholder"), previewTitle: t("preview.title"), empty: t("preview.empty"), processing: t("preview.processing"), canvasLabel: t("preview.canvasLabel"),
    optionsTitle: t("options.title"), sizeLabel: t("options.size.label"), sizeHelp: t("options.size.help"), levelLabel: t("options.level.label"), levelHelp: t("options.level.help"), marginLabel: t("options.margin.label"), marginHelp: t("options.margin.help"),
    levels: { L: t("options.level.L"), M: t("options.level.M"), Q: t("options.level.Q"), H: t("options.level.H") }, margins: { 4: t("options.margin.4"), 6: t("options.margin.6"), 8: t("options.margin.8") },
    currentSize: t("preview.size"), currentLevel: t("preview.level"), currentMargin: t("preview.margin"), inputType: t("preview.type"), inputTypes: { text: t("preview.types.text"), url: t("preview.types.url") },
    download: t("actions.download"), copyInput: t("actions.copyInput"), clear: t("actions.clear"), downloaded: t("actions.downloaded"), copied: t("actions.copied"), densityWarning: t("warning.density"),
    errors: { "capacity-exceeded": t("errors.capacity"), "size-too-small": t("errors.size"), "generation-failed": t("errors.generation"), "download-failed": t("errors.download"), "copy-failed": t("errors.copy") },
  };
  return <>
    <section className="border-b border-slate-200 bg-white"><Container className="py-10 sm:py-14"><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{t("description")}</p></div></Container></section>
    <Container className="py-8 sm:py-12"><QrCodeGenerator labels={labels} />
      <section className="mt-8 grid gap-4 md:grid-cols-2"><Info title={t("guide.title")} text={t("guide.description")} /><Info title={t("correction.title")} text={t("correction.description")} /><Info title={t("scan.title")} text={t("scan.description")} /><Info title={t("privacy.title")} text={t("privacy.description")} blue /></section>
    </Container>
  </>;
}
function Info({ title, text, blue = false }: { title: string; text: string; blue?: boolean }) { return <div className={`rounded-2xl border p-5 sm:p-6 ${blue ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}><h2 className={`font-bold ${blue ? "text-blue-950" : "text-slate-950"}`}>{title}</h2><p className={`mt-2 text-sm leading-6 ${blue ? "text-blue-900" : "text-slate-600"}`}>{text}</p></div>; }
