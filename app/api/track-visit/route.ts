import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { hashVisitor } from "@/lib/analytics/visitor-hash";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

const TRACKABLE_SLUGS = new Set(PUBLIC_TOOLS.map(tool => tool.path.replace("/tools/", "")));

/**
 * 도구 방문 카운트 증가 endpoint. 클라이언트는 slug만 보내고, 실제 dedup 판정과
 * DB 기록은 여기(서버)와 Supabase의 log_tool_visit 함수 안에서만 일어난다.
 * 클라이언트가 tool_visit_events/tool_popularity에 직접 쓸 수 있는 경로는 없다.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const slug = body && typeof body === "object" && "slug" in body ? (body as { slug: unknown }).slug : undefined;

  if (typeof slug !== "string" || !TRACKABLE_SLUGS.has(slug)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const visitorHash = await hashVisitor(ip, userAgent);

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("log_tool_visit", {
      p_tool_slug: slug,
      p_visitor_hash: visitorHash,
    });
    if (error) throw error;
  } catch (error) {
    // 조회수 집계는 부가 기능이라 실패해도 사용자에게는 항상 204를 반환한다.
    console.error("[track-visit] failed to log visit", error);
  }

  return new NextResponse(null, { status: 204 });
}
