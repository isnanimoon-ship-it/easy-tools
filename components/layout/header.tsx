import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ToolMenu } from "@/components/layout/tool-menu";
import { Link } from "@/i18n/navigation";

export function Header() {
  const t = useTranslations("Common");

  return (
    <header className="border-b border-slate-200 bg-white">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>
      <Container>
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-md font-bold text-slate-950"
            aria-label={t("homeLabel")}
          >
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">
              <Wrench aria-hidden="true" size={19} strokeWidth={2.4} />
            </span>
            <span className="hidden sm:inline">{t("brand")}</span>
          </Link>

          <ToolMenu />

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
          </div>
        </div>

      </Container>
    </header>
  );
}
