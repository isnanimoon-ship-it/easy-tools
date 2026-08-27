import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";

export function Footer() {
  const t = useTranslations("Common");

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-7 text-sm text-slate-500">
        <p>{t("footer", { year: new Date().getFullYear() })}</p>
      </Container>
    </footer>
  );
}
