import { getTopTools, type PopularityResult } from "@/lib/analytics/popularity";
import { POPULAR_PATHS } from "@/lib/tools/popular-paths";

import { PopularRankingFallback } from "./popular-ranking-fallback";
import { PopularRankingTabs } from "./popular-ranking-tabs";

/**
 * tool_popularity를 읽어 실시간/이번 주 랭킹 탭을 렌더링한다. Supabase 설정이
 * 없거나(신규 배포 직후 등) 조회에 실패하면 기존 큐레이션 목록(POPULAR_PATHS)을
 * 정적 카드 그리드로 보여줘 홈페이지가 절대 깨지지 않도록 한다.
 */
export async function PopularRankingWidget() {
  let realtime: PopularityResult;
  let weekly: PopularityResult;

  try {
    [realtime, weekly] = await Promise.all([getTopTools("realtime"), getTopTools("weekly")]);
  } catch (error) {
    console.error("[popular-ranking] failed to load tool_popularity, falling back to curated list", error);
    return <PopularRankingFallback paths={POPULAR_PATHS} />;
  }

  if (realtime.rows.length === 0 && weekly.rows.length === 0) {
    return <PopularRankingFallback paths={POPULAR_PATHS} />;
  }

  const minutesAgo = realtime.minutesAgo ?? weekly.minutesAgo;

  return <PopularRankingTabs realtime={realtime.rows} weekly={weekly.rows} minutesAgo={minutesAgo} />;
}
