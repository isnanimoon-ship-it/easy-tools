"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import type { PopularToolRow } from "@/lib/analytics/popularity";
import { formatNumber, formatRelativeMinutes } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";
import { TOOLS } from "@/lib/tools/registry";

type PopularRankingTabsProps = {
  realtime: PopularToolRow[];
  weekly: PopularToolRow[];
  // 렌더 시점의 Date.now()에 의존하므로 클라이언트에서 다시 계산하지 않고
  // 서버 컴포넌트(popular-ranking-widget.tsx)가 요청 시각 기준으로 미리 계산해 내려준다.
  minutesAgo: number | null;
};

type Tab = "realtime" | "weekly";

const TOOL_BY_SLUG = new Map(TOOLS.map((tool) => [tool.path.replace("/tools/", ""), tool]));

export function PopularRankingTabs({ realtime, weekly, minutesAgo }: PopularRankingTabsProps) {
  const t = useTranslations("Home");
  const locale = useLocale() as AppLocale;
  const [activeTab, setActiveTab] = useState<Tab>("realtime");

  const rows = activeTab === "realtime" ? realtime : weekly;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl bg-[var(--surface-muted)] p-1" role="tablist" aria-label={t("popular.title")}>
          <TabButton active={activeTab === "realtime"} onClick={() => setActiveTab("realtime")}>
            {t("popular.tabs.realtime")}
          </TabButton>
          <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>
            {t("popular.tabs.weekly")}
          </TabButton>
        </div>
        {minutesAgo !== null ? (
          <p className="text-xs text-[var(--text-muted)]">
            {t("popular.lastUpdated", {
              relative: minutesAgo < 1 ? t("popular.updatedJustNow") : formatRelativeMinutes(minutesAgo, locale),
            })}
          </p>
        ) : null}
      </div>

      {rows.length ? (
        <ol>
          {rows.map((row, index) => {
            const tool = TOOL_BY_SLUG.get(row.toolSlug);
            if (!tool) return null;
            const Icon = tool.icon;
            const rank = index + 1;

            return (
              <li key={row.toolSlug} className="border-b border-[var(--border)] last:border-b-0">
                <Link
                  href={tool.path}
                  className="group flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[var(--focus-ring)]"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      rank === 1
                        ? "bg-[var(--primary-fill)] text-white"
                        : rank <= 3
                          ? "bg-[var(--info-bg)] text-[var(--primary)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--info-bg)] text-[var(--primary)]">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-[var(--foreground)]">
                    {t(`tools.${tool.translationKey}.title`)}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--text-muted)]">
                    {t("popular.viewCount", { count: formatNumber(row.count, locale) })}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-4 py-10 text-center text-[var(--text-muted)]">{t("popular.empty")}</p>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${
        active ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
