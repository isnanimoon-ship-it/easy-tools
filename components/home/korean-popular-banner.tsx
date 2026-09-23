import { ArrowRight, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getTopTools } from "@/lib/analytics/popularity";
import { POPULAR_PATHS } from "@/lib/tools/popular-paths";
import { homeToolsForLocale } from "@/lib/tools/registry";

const HOME_TOOLS = homeToolsForLocale("ko");
const TOOL_BY_SLUG = new Map(HOME_TOOLS.map(tool => [tool.path.replace("/tools/", ""), tool]));
const TOOL_BY_PATH = new Map(HOME_TOOLS.map(tool => [tool.path, tool]));

export async function KoreanPopularBanner() {
  const t = await getTranslations({ locale: "ko", namespace: "Home" });
  let liveRanking = true;
  let tools: (typeof HOME_TOOLS)[number][] = [];

  try {
    const { rows } = await getTopTools("realtime", 5);
    tools = rows
      .map(row => TOOL_BY_SLUG.get(row.toolSlug))
      .filter((tool): tool is (typeof HOME_TOOLS)[number] => Boolean(tool));
  } catch (error) {
    console.error("[korean-popular-banner] failed to load realtime ranking", error);
  }

  if (tools.length === 0) {
    liveRanking = false;
    tools = POPULAR_PATHS.slice(0, 5)
      .map(path => TOOL_BY_PATH.get(path))
      .filter((tool): tool is (typeof HOME_TOOLS)[number] => Boolean(tool));
  }

  return (
    <aside
      aria-labelledby="korean-popular-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]">
          <TrendingUp aria-hidden size={20} />
        </span>
        <div>
          <h2 id="korean-popular-heading" className="font-bold text-[var(--foreground)]">
            {liveRanking ? "최근 24시간 많이 사용한 도구" : "자주 찾는 도구"}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
            {liveRanking ? "최근 이용 흐름을 기준으로 정리했습니다." : "빠르게 시작하기 좋은 대표 도구입니다."}
          </p>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-[var(--border)]">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <li key={tool.path}>
              <Link
                href={tool.path}
                className="group flex min-h-12 items-center gap-3 rounded-lg px-1 py-2 transition hover:bg-[var(--surface)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"
              >
                <span aria-hidden className="w-5 shrink-0 text-center text-sm font-bold text-[var(--text-muted)]">
                  {index + 1}
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--info-bg)] text-[var(--primary)]">
                  <Icon aria-hidden size={17} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
                  {t(`tools.${tool.translationKey}.title`)}
                </span>
                <ArrowRight aria-hidden size={15} className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
