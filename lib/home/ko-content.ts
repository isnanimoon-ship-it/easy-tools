import type { ToolPath } from "@/lib/tools/registry";

export const FEATURED_TOOLS: Array<{
  path: ToolPath;
  description: string;
  contexts: string[];
  cta: string;
}> = [
  { path: "/tools/hwp-hwpx-viewer", description: "한컴오피스가 없는 환경에서 한글 문서를 빠르게 확인하세요.", contexts: ["공공기관 공고문", "대학·학교 문서", "한글 프로그램이 없는 PC"], cta: "HWP 파일 열어보기" },
  { path: "/tools/privacy-redactor", description: "공유하기 전에 이미지 속 개인정보를 한 번 더 확인하세요.", contexts: ["중고거래 화면", "택배 송장", "상담 화면", "메신저 캡처"], cta: "개인정보 가리기" },
  { path: "/tools/screenshot-stitcher", description: "여러 장의 스크린샷을 하나의 긴 이미지로 정리하세요.", contexts: ["웹페이지 캡처", "앱 화면 기록", "매뉴얼 제작", "대화 화면 정리"], cta: "스크린샷 합치기" },
  { path: "/tools/image-metadata-remover", description: "사진을 공유하기 전에 위치와 촬영 정보를 확인하세요.", contexts: ["중고거래", "온라인 커뮤니티", "SNS 업로드", "업무용 사진 공유"], cta: "사진 정보 확인하기" },
  { path: "/tools/screenshot-statusbar-remover", description: "문서에 넣기 전에 화면 상단의 상태바 영역을 깔끔하게 정리하세요.", contexts: ["앱 사용 설명서", "업무 매뉴얼", "블로그", "서비스 소개 자료"], cta: "상태바 제거하기" },
  { path: "/tools/excel-chart-maker", description: "엑셀 데이터를 업로드하고 필요한 그래프를 바로 만들어보세요.", contexts: ["간단한 보고서", "업무 자료", "발표 자료", "데이터 확인"], cta: "그래프 만들기" },
];

export const WORK_GROUPS: Array<{
  title: string;
  description: string;
  paths: ToolPath[];
  cta: string;
}> = [
  { title: "문서 확인과 변환", description: "프로그램 설치 없이 문서를 열거나 다른 형식으로 정리할 때", paths: ["/tools/hwp-hwpx-viewer", "/tools/markdown-viewer", "/tools/image-to-pdf", "/tools/excel-chart-maker"], cta: "문서 도구 살펴보기" },
  { title: "이미지와 스크린샷 정리", description: "업무 자료나 콘텐츠에 사용할 이미지를 빠르게 정리할 때", paths: ["/tools/screenshot-stitcher", "/tools/screenshot-statusbar-remover", "/tools/privacy-redactor", "/tools/image-compressor", "/tools/image-color-picker", "/tools/favicon-generator"], cta: "이미지 도구 살펴보기" },
  { title: "개인정보와 파일 정보 관리", description: "파일을 외부에 공유하기 전에 남아 있는 정보를 확인할 때", paths: ["/tools/privacy-redactor", "/tools/image-metadata-remover"], cta: "개인정보 보호 도구 보기" },
  { title: "개발 중 잠깐 필요한 도구", description: "IDE나 별도 프로그램을 열지 않고 간단히 확인할 때", paths: ["/tools/regex-tester", "/tools/cron-expression-generator", "/tools/sql-formatter", "/tools/json-formatter", "/tools/jwt-decoder", "/tools/base64-converter", "/tools/url-encoder-decoder"], cta: "개발 도구 살펴보기" },
  { title: "텍스트와 간단한 작업", description: "복사한 텍스트를 정리하거나 간단한 값을 만들 때", paths: ["/tools/word-counter", "/tools/korean-initial-converter", "/tools/qr-code-generator", "/tools/password-generator", "/tools/text-cleaner", "/tools/ip-info"], cta: "기본 도구 살펴보기" },
];

export const USE_CASES: Array<{ title: string; description: string; path: ToolPath; cta: string }> = [
  { title: "공공기관에서 받은 HWP 파일을 열어야 할 때", description: "한컴오피스가 설치되지 않은 PC에서도 지원되는 문서의 주요 내용을 빠르게 확인합니다.", path: "/tools/hwp-hwpx-viewer", cta: "HWP 뷰어 사용하기" },
  { title: "중고거래 사진을 올리기 전에 위치정보가 걱정될 때", description: "사진 속 GPS·촬영기기·촬영시간 정보를 확인하고 제거할 수 있습니다.", path: "/tools/image-metadata-remover", cta: "사진 메타데이터 삭제" },
  { title: "상담 화면을 공유해야 하는데 이름과 전화번호가 보일 때", description: "이미지를 직접 확인하고 필요한 영역을 선택해 개인정보를 가립니다.", path: "/tools/privacy-redactor", cta: "개인정보 가리기" },
  { title: "앱 사용법을 설명하는데 스크린샷이 여러 장일 때", description: "여러 장의 화면을 하나의 긴 이미지로 정리하고, 필요하면 상태바도 별도 도구로 제거합니다.", path: "/tools/screenshot-stitcher", cta: "스크린샷 이어붙이기" },
  { title: "엑셀 데이터를 간단한 그래프로 보여주고 싶을 때", description: "필요한 열을 선택해 차트를 만들고 이미지로 저장합니다.", path: "/tools/excel-chart-maker", cta: "Excel 그래프 만들기" },
];

export const DEVELOPER_PATHS: ToolPath[] = [
  "/tools/regex-tester", "/tools/cron-expression-generator", "/tools/sql-formatter",
  "/tools/json-formatter", "/tools/jwt-decoder", "/tools/base64-converter", "/tools/url-encoder-decoder",
];
