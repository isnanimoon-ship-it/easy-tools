import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { ToolDiscovery } from "@/components/home/tool-discovery";
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

      <ToolDiscovery />
    </>
  );
}
