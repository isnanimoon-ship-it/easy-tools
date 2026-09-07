import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import type { ToolCategoryKey, ToolPath } from "@/lib/tools/registry";

type ToolPageHeroProps = {
  locale: string;
  title: string;
  description: string;
  homeLabel: string;
  category: { key: ToolCategoryKey; label: string };
  tool: { path: ToolPath; label: string };
};

export function ToolPageHero({ locale, title, description, homeLabel, category, tool }: ToolPageHeroProps) {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-8 sm:py-12">
        <Breadcrumb locale={locale} homeLabel={homeLabel} category={category} tool={tool} />
        <div className="mt-6 max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{description}</p>
        </div>
      </Container>
    </section>
  );
}
