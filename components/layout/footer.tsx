import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";

export function Footer() {
  const t = useTranslations("Common");

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-7 text-sm text-[var(--text-muted)]">
        <p>{t("footer", { year: new Date().getFullYear() })}</p>
      </Container>
    </footer>
  );
}
