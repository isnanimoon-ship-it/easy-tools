import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Common");
  const privacy = useTranslations("Privacy");
  const contact = useTranslations("Contact");

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <Container className="flex flex-wrap items-center justify-between gap-3 py-7 text-sm text-[var(--text-muted)]">
        <p>{t("footer", { year: new Date().getFullYear() })}</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/contact" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
            {contact("title")}
          </Link>
          <Link href="/privacy" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
            {privacy("title")}
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
