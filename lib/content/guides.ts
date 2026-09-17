import type { ToolPath } from "@/lib/tools/registry";

export type GuideSection =
  | { type: "text"; title: string; paragraphs: string[] }
  | { type: "checklist"; title: string; intro?: string; items: string[] }
  | { type: "steps"; title: string; items: Array<{ title: string; text: string }> }
  | { type: "compare"; title: string; columns: Array<{ title: string; items: string[] }> }
  | { type: "notice"; title: string; text: string };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  relatedTools: ToolPath[];
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "check-personal-information-before-selling-photos",
    title: "중고거래 사진을 올리기 전에 확인할 개인정보",
    description: "중고거래 사진을 공유하기 전에 전화번호, 주소, 송장 정보와 GPS·EXIF 위치정보까지 확인해야 할 항목을 정리합니다.",
    publishedAt: "2026-09-18",
    updatedAt: "2026-09-18",
    readingTime: "약 4분",
    relatedTools: ["/tools/privacy-redactor", "/tools/image-metadata-remover"],
    sections: [
      { type: "text", title: "사진만 봐도 개인정보가 노출될 수 있습니다", paragraphs: ["판매할 물건만 찍었다고 생각해도 배경의 택배 상자, 영수증, 모니터 화면이나 반사된 얼굴에 정보가 남을 수 있습니다. 사진을 확대해 모서리와 배경까지 살펴보는 것이 먼저입니다.", "화면에서 보이는 정보와 이미지 파일 안에 저장된 정보를 나누어 확인하면 빠뜨릴 가능성을 줄일 수 있습니다."] },
      { type: "checklist", title: "화면에 직접 보이는 정보", items: ["이름, 전화번호, 주소가 적힌 택배 송장", "계좌번호, 주문번호와 거래 화면", "차량 번호판, 얼굴과 프로필 사진", "다른 페이지로 연결되는 QR 코드나 바코드", "유리·금속 표면에 반사된 사람이나 주변 공간"] },
      { type: "text", title: "눈에 보이지 않는 정보", paragraphs: ["카메라와 스마트폰 사진에는 EXIF 같은 메타데이터가 포함될 수 있습니다. 촬영 기기와 시각, 카메라 설정뿐 아니라 위치 권한 상태에 따라 GPS 좌표가 남는 경우도 있습니다.", "메신저나 일부 플랫폼이 메타데이터를 제거하기도 하지만 모든 공유 경로가 같지는 않습니다. 게시 전에 실제로 올릴 결과 파일을 확인하는 편이 안전합니다."] },
      { type: "steps", title: "공유 전 확인 순서", items: [{ title: "사진 화면 확인", text: "사진을 확대해 물건 주변, 모서리, 반사면과 배경을 살펴봅니다." }, { title: "개인정보 영역 가리기", text: "민감한 문자와 얼굴은 불투명 단색으로 충분한 여백까지 덮습니다." }, { title: "메타데이터 확인", text: "GPS, 촬영 시각과 기기 정보가 남아 있는지 결과 파일을 검사합니다." }, { title: "결과 파일 다시 확인", text: "가린 영역과 메타데이터 제거 결과를 확인한 새 파일만 업로드합니다." }] },
      { type: "notice", title: "원본 파일은 따로 보관하세요", text: "가림과 메타데이터 제거 결과는 새 파일로 저장하고 원본은 공개하지 않는 위치에 보관하세요. 픽셀화는 형태의 단서가 남을 수 있어 민감한 문자는 불투명 가림을 권장합니다." },
    ],
  },
  {
    slug: "work-screenshot-sharing-checklist",
    title: "업무용 스크린샷을 공유하기 전에 확인할 것",
    description: "업무용 스크린샷에 남기 쉬운 상태바, 알림, 계정과 내부 시스템 정보를 확인하고 안전하게 정리하는 순서를 안내합니다.",
    publishedAt: "2026-09-18",
    updatedAt: "2026-09-18",
    readingTime: "약 4분",
    relatedTools: ["/tools/screenshot-statusbar-remover", "/tools/screenshot-stitcher", "/tools/privacy-redactor"],
    sections: [
      { type: "text", title: "스크린샷에는 생각보다 많은 정보가 남습니다", paragraphs: ["설명하려는 화면 외에도 상태바, 브라우저 주소, 열린 탭, 계정 프로필과 알림이 함께 찍힐 수 있습니다. 사내 시스템 화면이라면 메뉴명이나 프로젝트 이름만으로도 공개하면 안 되는 맥락이 드러날 수 있습니다."] },
      { type: "checklist", title: "공유 전 확인 항목", items: ["상태바의 시간, 배터리, 통신사와 연결 상태", "알림에 표시된 이름, 메시지와 앱 정보", "로그인 계정, 이메일과 프로필 사진", "주소창 URL, 검색어와 내부 시스템명", "고객명, 주문번호, 전화번호와 상담 내용", "브라우저 탭 제목과 화면 가장자리의 다른 앱"] },
      { type: "compare", title: "매뉴얼용 스크린샷이라면", columns: [{ title: "먼저 정리할 것", items: ["필요하지 않은 상단 상태바 자르기", "개인정보와 내부 정보 가리기", "각 화면의 폭과 확대 비율 맞추기"] }, { title: "여러 장을 연결할 때", items: ["같은 화면 폭 유지", "앞뒤 캡처에 충분한 겹침 남기기", "고정 헤더와 팝업이 중복되지 않았는지 확인"] }] },
      { type: "steps", title: "짧은 공유 체크리스트", items: [{ title: "범위 확인", text: "전달에 필요한 화면만 남기고 주변 UI를 정리합니다." }, { title: "민감 정보 가리기", text: "이름과 번호뿐 아니라 프로필 사진, QR 코드와 URL도 확인합니다." }, { title: "연결 결과 확인", text: "이어붙인 경계에서 글자나 고정 헤더가 겹치지 않았는지 봅니다." }, { title: "최종 파일 열기", text: "다운로드한 결과 파일을 다시 열어 빠진 영역이 없는지 확인합니다." }] },
    ],
  },
  {
    slug: "hwp-hwpx-web-viewer-limitations",
    title: "한컴오피스 없이 HWP · HWPX 파일을 확인할 때 알아둘 점",
    description: "HWP와 HWPX의 차이, 웹 뷰어가 유용한 상황과 원본 레이아웃 확인에 적합하지 않은 경우를 정리합니다.",
    publishedAt: "2026-09-18",
    updatedAt: "2026-09-18",
    readingTime: "약 3분",
    relatedTools: ["/tools/hwp-hwpx-viewer"],
    sections: [
      { type: "compare", title: "HWP와 HWPX는 처리 방식이 다릅니다", columns: [{ title: "HWPX", items: ["ZIP 기반의 새 문서 구조", "본문·기본 서식·표·이미지를 지원 범위 안에서 표시", "현재 웹 뷰어의 우선 지원 형식"] }, { title: "HWP 5.x", items: ["바이너리 형식으로 제한적 지원", "복잡한 배치와 전용 요소가 더 다르게 보일 수 있음", "암호화·배포용·구버전 문서는 열리지 않을 수 있음"] }] },
      { type: "checklist", title: "웹 뷰어가 유용한 경우", items: ["공고문이나 안내문의 본문을 빠르게 확인할 때", "문서에서 특정 문구를 찾아야 할 때", "한컴오피스가 없는 기기에서 읽기 전용으로 확인할 때", "중요하지 않은 기본 표와 이미지를 함께 살펴볼 때"] },
      { type: "checklist", title: "웹 뷰어가 적합하지 않은 경우", items: ["원본과 픽셀 단위로 같은 레이아웃이 필요할 때", "문서를 수정하거나 전자서명해야 할 때", "도형·수식·차트·글맵시가 핵심일 때", "계약이나 제출 문서를 최종 검토할 때"] },
      { type: "text", title: "문서가 다르게 보일 수 있는 이유", paragraphs: ["웹 뷰어는 문서 구조를 브라우저가 표시할 수 있는 형태로 해석합니다. 작성 환경의 글꼴이 없거나 전용 요소를 렌더러가 지원하지 않으면 줄바꿈, 표 병합과 이미지 배치가 달라질 수 있습니다.", "오류 없이 열렸다는 사실이 모든 요소가 원본과 같다는 의미는 아닙니다. 중요한 문서는 공식 프로그램이나 원 작성자에게 받은 PDF로 최종 확인하세요."] },
    ],
  },
  {
    slug: "stitch-mobile-screenshots",
    title: "여러 장의 모바일 스크린샷을 한 장으로 정리하는 방법",
    description: "스크린샷의 중복 영역과 고정 헤더를 고려해 여러 캡처를 자연스럽게 이어붙이는 방법과 실패하기 쉬운 조건을 설명합니다.",
    publishedAt: "2026-09-18",
    updatedAt: "2026-09-18",
    readingTime: "약 4분",
    relatedTools: ["/tools/screenshot-stitcher", "/tools/screenshot-statusbar-remover"],
    sections: [
      { type: "text", title: "왜 직접 붙이면 어색해질까요?", paragraphs: ["스크롤 캡처에는 앞 이미지의 아래쪽과 다음 이미지의 위쪽이 반복됩니다. 이 중복 높이를 정확히 찾지 못하면 문장이 두 번 나오거나 일부가 사라지고, 한두 픽셀 차이도 긴 이미지에서는 눈에 띕니다.", "고정 헤더, 움직이는 광고와 영상처럼 스크롤해도 모양이 같지 않은 요소는 자동 비교를 어렵게 만듭니다."] },
      { type: "steps", title: "잘 이어지는 캡처 방법", items: [{ title: "같은 조건 유지", text: "기기 방향, 화면 폭, 브라우저 확대 비율을 바꾸지 않습니다." }, { title: "겹침을 충분히 남기기", text: "앞 화면의 마지막 문단이나 이미지 일부가 다음 캡처에도 보이게 합니다." }, { title: "시간차 줄이기", text: "영상, 애니메이션과 자동 갱신 영역이 바뀌기 전에 연속으로 캡처합니다." }, { title: "순서와 경계 확인", text: "위에서 아래 순서로 올리고 자동 분석 결과의 연결 경계를 확인합니다." }] },
      { type: "checklist", title: "실패하기 쉬운 경우", items: ["영상·애니메이션·실시간 숫자가 캡처마다 달라진 경우", "쿠키 배너나 팝업이 중간 캡처에만 나타난 경우", "겹치는 영역이 너무 짧거나 단색뿐인 경우", "고정 헤더와 하단 메뉴가 본문 위를 덮는 경우", "캡처 폭이나 화면 확대 비율이 달라진 경우"] },
      { type: "notice", title: "자동 결과가 낮은 신뢰도로 표시되면", text: "억지로 자동 연결하지 말고 상단·하단 제외 영역과 겹침 높이를 직접 조정하세요. 결과 PNG를 확대해 경계의 문장, 표와 이미지가 끊기지 않았는지 확인해야 합니다." },
      { type: "text", title: "매뉴얼에 사용할 때", paragraphs: ["여러 화면을 연결하기 전에 필요하지 않은 상태바를 정리하면 시간과 배터리 정보가 반복되지 않습니다. 다만 상태바 제거기는 이미지 상단만 자르므로 앱 헤더가 함께 잘리지 않도록 경계를 확인하세요."] },
    ],
  },
];

export function guideBySlug(slug: string) { return GUIDES.find((guide) => guide.slug === slug); }

export const TOOL_GUIDES: Partial<Record<ToolPath, string[]>> = {
  "/tools/privacy-redactor": [GUIDES[0].slug, GUIDES[1].slug],
  "/tools/image-metadata-remover": [GUIDES[0].slug],
  "/tools/screenshot-statusbar-remover": [GUIDES[1].slug, GUIDES[3].slug],
  "/tools/screenshot-stitcher": [GUIDES[3].slug, GUIDES[1].slug],
  "/tools/hwp-hwpx-viewer": [GUIDES[2].slug],
};
