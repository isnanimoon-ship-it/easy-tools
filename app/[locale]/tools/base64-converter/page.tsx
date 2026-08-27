import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Base64Converter, type Base64ConverterLabels } from "@/components/tools/base64-converter/base64-converter";
import { routing } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.base64Converter.metadata" }); const pathname = `/${locale}/tools/base64-converter`;
  return { title: t("title"), description: t("description"), alternates: { canonical: pathname, languages: Object.fromEntries(routing.locales.map((item) => [item, `/${item}/tools/base64-converter`])) } };
}
export default async function Page({ params }: PageProps) {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale); const t = await getTranslations("Tools.base64Converter");
  const encodingIds = ["auto", "utf-8", "utf-16le", "utf-16be", "ascii", "iso-8859-1", "windows-1252", "euc-kr", "shift_jis"] as const;
  const labels: Base64ConverterLabels = {
    modeLabel:t("mode.label"),encodeMode:t("mode.encode"),decodeMode:t("mode.decode"),encodingLabel:t("encoding.label"),encodingHelp:t("encoding.help"),encodings:Object.fromEntries(encodingIds.map((id)=>[id,t(`encoding.options.${id}`)])) as Base64ConverterLabels["encodings"],
    inputEncode:t("input.encodeLabel"),inputDecode:t("input.decodeLabel"),inputPlaceholderEncode:t("input.encodePlaceholder"),inputPlaceholderDecode:t("input.decodePlaceholder"),resultEncode:t("result.encodeLabel"),resultDecode:t("result.decodeLabel"),resultEmpty:t("result.empty"),encode:t("actions.encode"),decode:t("actions.decode"),clear:t("actions.clear"),copy:t("actions.copy"),copied:t("actions.copied"),converting:t("actions.converting"),
    applied:t.raw("applied.explicit"),autoUsed:t("applied.autoUsed"),autoBom:t.raw("applied.autoBom"),autoEstimated:t.raw("applied.autoEstimated"),autoLow:t.raw("applied.autoLow"),errors:{base64:t("errors.base64"),unrepresentable:t("errors.unrepresentable"),"invalid-bytes":t("errors.invalidBytes"),ambiguous:t("errors.ambiguous"),load:t("errors.load"),copy:t("errors.copy")},
  };
  return <><section className="border-b border-slate-200 bg-white"><Container className="py-10 sm:py-14"><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{t("description")}</p></div></Container></section><Container className="py-8 sm:py-12"><Base64Converter labels={labels}/><section className="mt-8 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-bold">{t("guide.title")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t("guide.description")}</p></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6"><h2 className="font-bold text-blue-950">{t("privacy.title")}</h2><p className="mt-2 text-sm leading-6 text-blue-900">{t("privacy.description")}</p></div></section></Container></>;
}
