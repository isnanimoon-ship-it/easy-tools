import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { SqlFormatter, type SqlFormatterLabels } from "@/components/tools/sql-formatter/sql-formatter";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.sqlFormatter.metadata" });
  const pathname = `/${locale}/tools/sql-formatter`;
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.sqlFormatter");

  const labels: SqlFormatterLabels = {
    inputLabel: t("input.label"), inputHelp: t("input.help"), placeholder: t("input.placeholder"),
    dialectLabel: t("options.dialect.label"),
    dialects: {
      sql: t("options.dialect.sql"), mysql: t("options.dialect.mysql"), postgresql: t("options.dialect.postgresql"),
      tsql: t("options.dialect.tsql"), plsql: t("options.dialect.plsql"), sqlite: t("options.dialect.sqlite"),
    },
    keywordCaseLabel: t("options.keywordCase.label"),
    keywordCases: { upper: t("options.keywordCase.upper"), lower: t("options.keywordCase.lower"), preserve: t("options.keywordCase.preserve") },
    indentLabel: t("options.indent.label"),
    indents: { "2-spaces": t("options.indent.two"), "4-spaces": t("options.indent.four"), tab: t("options.indent.tab") },
    logicalOperatorLabel: t("options.logicalOperator.label"),
    logicalOperators: { before: t("options.logicalOperator.before"), after: t("options.logicalOperator.after") },
    commaStyleLabel: t("options.commaStyle.label"),
    commaStyles: { trailing: t("options.commaStyle.trailing"), leading: t("options.commaStyle.leading") },
    format: t("actions.format"), minify: t("actions.minify"), clear: t("actions.clear"),
    copy: t("actions.copy"), copied: t("actions.copied"),
    download: t("actions.download"), downloaded: t("actions.downloaded"),
    resultLabel: t("result.label"), resultEmpty: t("result.empty"), running: t("result.running"),
    retryGeneric: t("actions.retryGeneric"),
    examplesTitle: t("examples.title"), examplesHint: t("examples.hint"),
    errors: {
      "input-too-long": t("errors.inputTooLong"), "parse-error": t("errors.parseError"),
      "worker-error": t("errors.workerError"), "copy-failed": t("errors.copyFailed"), "download-failed": t("errors.downloadFailed"),
    },
  };

  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-10 sm:py-14">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p>
        </div>
      </Container>
    </section>
    <Container className="py-8 sm:py-12">
      <SqlFormatter labels={labels} />
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="font-bold text-[var(--foreground)]">{t("guide.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("guide.description")}</p>
        </div>
        <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6">
          <h2 className="font-bold text-[var(--info-fg)]">{t("privacy.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--info-fg)]">{t("privacy.description")}</p>
        </div>
      </section>
    </Container>
  </>;
}
