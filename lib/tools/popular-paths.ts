import type { ToolPath } from "@/lib/tools/registry";

/**
 * 수동 큐레이션된 대표 도구 목록. 인기 랭킹 위젯(components/home/popular-ranking-widget.tsx)이
 * Supabase 조회 실패 시 폴백으로 쓰고, tool-discovery.tsx는 이 파일을 그대로 재노출한다.
 * "use client" 모듈(tool-discovery.tsx)의 일반 값 export는 서버 컴포넌트에서 읽을 수 없어
 * 별도 파일로 분리했다.
 */
export const POPULAR_PATHS: ToolPath[] = [
  "/tools/image-compressor",
  "/tools/qr-code-generator",
  "/tools/json-formatter",
  "/tools/word-counter",
  "/tools/password-generator",
  "/tools/url-encoder-decoder",
];
