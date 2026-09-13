"use client";

import { HOME_TOOLS, type ToolPath } from "@/lib/tools/registry";

import { ToolCard } from "./tool-discovery";

/**
 * ToolCard.tool.icon은 함수(lucide 컴포넌트)라서 서버 컴포넌트 props로 직렬화해 넘길 수 없다.
 * 그래서 이 컴포넌트를 클라이언트로 두고, 문자열 경로(ToolPath)만 서버에서 받아 여기서
 * HOME_TOOLS를 조회한다 — popular-ranking-widget.tsx의 Supabase 조회 실패 폴백용.
 */
export function PopularRankingFallback({ paths }: { paths: ToolPath[] }) {
  const tools = paths.map((path) => HOME_TOOLS.find((tool) => tool.path === path)).filter(
    (tool): tool is (typeof HOME_TOOLS)[number] => Boolean(tool),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.path} tool={tool} compact />
      ))}
    </div>
  );
}
