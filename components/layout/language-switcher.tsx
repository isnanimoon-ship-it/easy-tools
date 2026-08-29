"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("Common.language");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: AppLocale) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Languages aria-hidden="true" className="hidden text-[var(--text-muted)] sm:block" size={18} />
      <label htmlFor="language-select" className="sr-only">
        {t("label")}
      </label>
      <select
        id="language-select"
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value as AppLocale)}
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm font-semibold text-[var(--foreground)]"
        aria-label={t("label")}
      >
        {routing.locales.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {t(supportedLocale)}
          </option>
        ))}
      </select>
    </div>
  );
}
