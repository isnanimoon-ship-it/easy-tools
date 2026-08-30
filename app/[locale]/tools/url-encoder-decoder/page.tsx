import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { UrlEncoderDecoder, type UrlEncoderDecoderLabels } from "@/components/tools/url-encoder-decoder/url-encoder-decoder";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.urlEncoderDecoder.metadata" });
  const pathname = `/${locale}/tools/url-encoder-decoder`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.urlEncoderDecoder");
  const labels: UrlEncoderDecoderLabels = {
    viewModeLabel: t("view.label"), viewText: t("view.text"), viewQuery: t("view.query"),
    modeLabel: t("mode.label"), encodeMode: t("mode.encode"), decodeMode: t("mode.decode"),
    typeLabel: t("encodingType.label"), componentType: t("encodingType.component"), fullUrlType: t("encodingType.fullUrl"),
    componentHelp: t("encodingType.componentHelp"), fullUrlHelp: t("encodingType.fullUrlHelp"), plusHelp: t("plusHelp"),
    inputEncode: t("input.encodeLabel"), inputDecode: t("input.decodeLabel"), inputPlaceholderEncode: t("input.encodePlaceholder"), inputPlaceholderDecode: t("input.decodePlaceholder"),
    resultEncode: t("result.encodeLabel"), resultDecode: t("result.decodeLabel"), resultEmpty: t("result.empty"),
    encode: t("actions.encode"), decode: t("actions.decode"), clear: t("actions.clear"), copy: t("actions.copy"), copied: t("actions.copied"),
    operations: {
      "encode-component": t("operations.encodeComponent"), "encode-full-url": t("operations.encodeFullUrl"),
      "decode-component": t("operations.decodeComponent"), "decode-full-url": t("operations.decodeFullUrl"),
    },
    errors: { "invalid-percent-encoding": t("errors.percent"), "invalid-unicode": t("errors.unicode"), copy: t("errors.copy") },
    query: {
      inputLabel: t("query.input.label"), inputPlaceholder: t("query.input.placeholder"), parse: t("query.actions.parse"),
      keyLabel: t("query.table.keyLabel"), keyPlaceholder: t("query.table.keyPlaceholder"),
      valueLabel: t("query.table.valueLabel"), valuePlaceholder: t("query.table.valuePlaceholder"),
      removeRow: t("query.table.removeRow"), addRow: t("query.table.addRow"), tableEmpty: t("query.table.empty"),
      outputLabel: t("query.output.label"), outputEmpty: t("query.output.empty"),
      copy: t("query.actions.copy"), copied: t("query.actions.copied"), copyError: t("query.actions.copyError"),
      clear: t("query.actions.clear"),
    },
  };

  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p></div></Container>
    </section>
    <Container className="py-8 sm:py-12">
      <UrlEncoderDecoder labels={labels} />
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="font-bold">{t("guide.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("guide.description")}</p></div>
        <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6"><h2 className="font-bold text-[var(--info-fg)]">{t("privacy.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--info-fg)]">{t("privacy.description")}</p></div>
      </section>
    </Container>
  </>;
}
