import type { ToolPath } from "@/lib/tools/registry";

export type SiteUpdate = { date: string; type: "new" | "improvement" | "fix" | "policy"; title: string; description: string; relatedTools?: ToolPath[] };

export const SITE_UPDATES: SiteUpdate[] = [
  { date: "2026-09-18", type: "improvement", title: "대표 도구 안내 개선", description: "HWP 뷰어, 개인정보 가리기, 스크린샷 이어붙이기 등 대표 도구 6개의 지원 범위와 제한사항을 실제 기능에 맞게 구체적으로 정리했습니다.", relatedTools: ["/tools/hwp-hwpx-viewer", "/tools/privacy-redactor", "/tools/screenshot-stitcher"] },
  { date: "2026-09-18", type: "new", title: "실제 작업 상황별 활용 가이드 추가", description: "사진과 스크린샷 공유, HWP 문서 확인과 스크린샷 연결 과정에서 놓치기 쉬운 점을 정리한 가이드를 추가했습니다.", relatedTools: ["/tools/image-metadata-remover", "/tools/screenshot-statusbar-remover"] },
  { date: "2026-09-17", type: "improvement", title: "홈 화면과 탐색 구조 개편", description: "대표 도구와 실제 사용 상황을 먼저 확인할 수 있도록 홈 구성을 바꾸고 브라우저 처리 원칙을 더 명확하게 안내했습니다." },
];
