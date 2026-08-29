import { ArrowRight, Binary, Braces, CalendarClock, FileKey, FileText, Globe2, ImageDown, ImageIcon, Link2, Palette, QrCode, Regex, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type HomeProps = {
  params: Promise<{ locale: AppLocale }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Home");

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)]">
              <Sparkles aria-hidden="true" size={16} />
              {t("eyebrow")}
            </div>
            <h1 className="whitespace-pre-line text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              {t("description")}
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="tools-heading">
        <Container className="py-12 sm:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 id="tools-heading" className="text-2xl font-bold text-[var(--foreground)]">{t("tools.title")}</h2><p className="mt-2 text-[var(--text-muted)]">{t("tools.description")}</p></div>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]"><ShieldCheck aria-hidden="true" size={18} />{t("tools.privacy")}</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <ToolCard href="/tools/word-counter" icon={<FileText aria-hidden="true" />} title={t("tools.wordCounter.title")} description={t("tools.wordCounter.description")} action={t("tools.open")} />
            <ToolCard href="/tools/json-formatter" icon={<Braces aria-hidden="true" />} title={t("tools.jsonFormatter.title")} description={t("tools.jsonFormatter.description")} action={t("tools.open")} />
            <ToolCard href="/tools/password-generator" icon={<FileKey aria-hidden="true" />} title={t("tools.passwordGenerator.title")} description={t("tools.passwordGenerator.description")} action={t("tools.open")} />
            <ToolCard href="/tools/base64-converter" icon={<Binary aria-hidden="true" />} title={t("tools.base64Converter.title")} description={t("tools.base64Converter.description")} action={t("tools.open")} />
            <ToolCard href="/tools/url-encoder-decoder" icon={<Link2 aria-hidden="true" />} title={t("tools.urlEncoderDecoder.title")} description={t("tools.urlEncoderDecoder.description")} action={t("tools.open")} />
            <ToolCard href="/tools/youtube-thumbnail-downloader" icon={<ImageIcon aria-hidden="true" />} title={t("tools.youtubeThumbnailDownloader.title")} description={t("tools.youtubeThumbnailDownloader.description")} action={t("tools.open")} />
            <ToolCard href="/tools/qr-code-generator" icon={<QrCode aria-hidden="true" />} title={t("tools.qrCodeGenerator.title")} description={t("tools.qrCodeGenerator.description")} action={t("tools.open")} />
            <ToolCard href="/tools/ip-info" icon={<Globe2 aria-hidden="true" />} title={t("tools.ipInfo.title")} description={t("tools.ipInfo.description")} action={t("tools.open")} />
            <ToolCard href="/tools/image-color-picker" icon={<Palette aria-hidden="true" />} title={t("tools.imageColorPicker.title")} description={t("tools.imageColorPicker.description")} action={t("tools.open")} />
            <ToolCard href="/tools/image-compressor" icon={<ImageDown aria-hidden="true" />} title={t("tools.imageCompressor.title")} description={t("tools.imageCompressor.description")} action={t("tools.open")} />
            <ToolCard href="/tools/regex-tester" icon={<Regex aria-hidden="true" />} title={t("tools.regexTester.title")} description={t("tools.regexTester.description")} action={t("tools.open")} />
            <ToolCard href="/tools/cron-expression-generator" icon={<CalendarClock aria-hidden="true" />} title={t("tools.cronExpressionGenerator.title")} description={t("tools.cronExpressionGenerator.description")} action={t("tools.open")} />
          </div>
        </Container>
      </section>
    </>
  );
}

function ToolCard({ href, icon, title, description, action }: { href: "/tools/word-counter" | "/tools/json-formatter" | "/tools/password-generator" | "/tools/base64-converter" | "/tools/url-encoder-decoder" | "/tools/youtube-thumbnail-downloader" | "/tools/qr-code-generator" | "/tools/ip-info" | "/tools/image-color-picker" | "/tools/image-compressor" | "/tools/regex-tester" | "/tools/cron-expression-generator"; icon: React.ReactNode; title: string; description: string; action: string }) {
  return <Link href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:border-[var(--info-border)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">
    <span className="grid size-11 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]">{icon}</span>
    <h3 className="mt-5 text-xl font-bold text-[var(--foreground)]">{title}</h3>
    <p className="mt-2 leading-7 text-[var(--text-muted)]">{description}</p>
    <span className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--primary)]">{action}<ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-1" /></span>
  </Link>;
}
