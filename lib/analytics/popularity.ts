import { createPublicClient } from "@/lib/supabase/public";

export type PopularityWindow = "realtime" | "weekly";

export type PopularToolRow = {
  toolSlug: string;
  count: number;
};

export type PopularityResult = {
  rows: PopularToolRow[];
  // 컴포넌트 렌더 중에는 Date.now()를 호출하지 않는다(react-hooks/purity) — 이 일반 함수 안에서
  // 조회 시점 기준으로 미리 계산해 내려준다.
  minutesAgo: number | null;
};

const COLUMN_BY_WINDOW = {
  realtime: "realtime_count",
  weekly: "weekly_count",
} as const;

/**
 * tool_popularity(사전 계산된 집계 테이블)만 읽는다. 무거운 집계 쿼리는
 * pg_cron이 수행하고, 여기서는 이미 계산된 값을 정렬해서 가져올 뿐이다.
 */
type PopularityRow = {
  tool_slug: string;
  realtime_count: number;
  weekly_count: number;
  updated_at: string;
};

export async function getTopTools(window: PopularityWindow, limit = 10): Promise<PopularityResult> {
  const column = COLUMN_BY_WINDOW[window];
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("tool_popularity")
    .select("tool_slug, realtime_count, weekly_count, updated_at")
    .gt(column, 0)
    .order(column, { ascending: false })
    .order("tool_slug", { ascending: true })
    .limit(limit)
    .returns<PopularityRow[]>();

  if (error) throw error;

  const rows = (data ?? []).map(row => ({
    toolSlug: row.tool_slug,
    count: row[column],
  }));
  const updatedAt = data && data.length > 0 ? data[0].updated_at : null;
  const minutesAgo = updatedAt ? Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000)) : null;

  return { rows, minutesAgo };
}
