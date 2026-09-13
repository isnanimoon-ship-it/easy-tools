"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 도구 방문을 서버(/api/track-visit)에 알리는 비콘. 카운트 판정과 저장은 전부
 * 서버에서 일어나며, 이 컴포넌트는 "지금 이 slug를 보고 있다"는 신호만 보낸다.
 * app/[locale]/tools/layout.tsx 한 곳에 마운트해 모든 도구 페이지를 커버한다.
 */
export function ToolVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const toolsIndex = segments.indexOf("tools");
    const slug = toolsIndex >= 0 ? segments[toolsIndex + 1] : undefined;
    if (!slug) return;

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {
      // 조회수 집계 실패는 사용자에게 보이지 않아야 하는 부가 기능이다.
    });
  }, [pathname]);

  return null;
}
