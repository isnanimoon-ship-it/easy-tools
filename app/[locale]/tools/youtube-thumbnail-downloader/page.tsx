import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { YouTubeThumbnailDownloader, type YouTubeThumbnailLabels } from "@/components/tools/youtube-thumbnail-downloader/youtube-thumbnail-downloader";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.youtubeThumbnailDownloader.metadata" });
  const pathname = `/${locale}/tools/youtube-thumbnail-downloader`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.youtubeThumbnailDownloader");
  const labels: YouTubeThumbnailLabels = {
    inputLabel: t("input.label"), inputHelp: t("input.help"), placeholder: t("input.placeholder"), extract: t("actions.extract"), clear: t("actions.clear"), loading: t("actions.loading"),
    videoId: t("result.videoId"), available: t("result.available"), unavailable: t("result.unavailable"), resolution: t("result.resolution"), open: t("actions.open"), save: t("actions.save"), saving: t("actions.saving"), saved: t("actions.saved"), saveError: t("errors.save"),
    variants: { max: t("variants.max"), sd: t("variants.sd"), hq: t("variants.hq"), mq: t("variants.mq"), default: t("variants.default") },
    errors: { "not-youtube": t("errors.notYoutube"), "invalid-url": t("errors.invalidUrl"), "unsupported-format": t("errors.unsupported"), "missing-video-id": t("errors.missingId"), "invalid-video-id": t("errors.invalidId"), "thumbnail-unavailable": t("errors.unavailable"), network: t("errors.network") },
  };
  return <>
    <section className="border-b border-slate-200 bg-white"><Container className="py-10 sm:py-14"><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{t("description")}</p></div></Container></section>
    <Container className="py-8 sm:py-12">
      <YouTubeThumbnailDownloader labels={labels} />
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Info title={t("guide.title")} text={t("guide.description")} />
        <Info title={t("formats.title")} text={t("formats.description")} />
        <Info title={t("privacy.title")} text={t("privacy.description")} blue />
        <Info title={t("rights.title")} text={t("rights.description")} />
      </section>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">{t("faq.title")}</h2><h3 className="mt-4 font-semibold">{t("faq.maxQuestion")}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{t("faq.maxAnswer")}</p><h3 className="mt-4 font-semibold">{t("faq.downloadQuestion")}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{t("faq.downloadAnswer")}</p></section>
    </Container>
  </>;
}

function Info({ title, text, blue = false }: { title: string; text: string; blue?: boolean }) {
  return <div className={`rounded-2xl border p-5 sm:p-6 ${blue ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}><h2 className={`font-bold ${blue ? "text-blue-950" : "text-slate-950"}`}>{title}</h2><p className={`mt-2 text-sm leading-6 ${blue ? "text-blue-900" : "text-slate-600"}`}>{text}</p></div>;
}
