import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { HOME_TOOLS, type ToolPath } from "@/lib/tools/registry";

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
            {HOME_TOOLS.map(tool => { const Icon = tool.icon; return <ToolCard key={tool.path} href={tool.path} icon={<Icon aria-hidden="true" />} title={t(`tools.${tool.translationKey}.title`)} description={t(`tools.${tool.translationKey}.description`)} action={t("tools.open")} />; })}
          </div>
        </Container>
      </section>
    </>
  );
}

function ToolCard({ href, icon, title, description, action }: { href: ToolPath; icon: React.ReactNode; title: string; description: string; action: string }) {
  return <Link href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:border-[var(--info-border)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">
    <span className="grid size-11 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]">{icon}</span>
    <h3 className="mt-5 text-xl font-bold text-[var(--foreground)]">{title}</h3>
    <p className="mt-2 leading-7 text-[var(--text-muted)]">{description}</p>
    <span className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--primary)]">{action}<ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-1" /></span>
  </Link>;
}
