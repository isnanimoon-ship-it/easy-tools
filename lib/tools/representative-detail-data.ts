import type { ToolPath } from "@/lib/tools/registry";

export type RepresentativePath =
  | "/tools/hwp-hwpx-viewer"
  | "/tools/privacy-redactor"
  | "/tools/screenshot-stitcher"
  | "/tools/image-metadata-remover"
  | "/tools/screenshot-statusbar-remover"
  | "/tools/excel-chart-maker";

type CardBlock = { type: "cards"; title: string; intro?: string; items: Array<{ title: string; text: string }> };
type ListBlock = { type: "list"; title: string; intro?: string; items: string[] };
type CompareBlock = { type: "compare"; title: string; intro?: string; columns: Array<{ title: string; items: string[] }> };
type TableBlock = { type: "table"; title: string; intro?: string; caption: string; columns: string[]; rows: string[][] };
type WorkflowBlock = { type: "workflow"; title: string; items: string[] };
type NoticeBlock = { type: "notice"; title: string; text: string; tone: "info" | "warning" };
type ExampleBlock = { type: "example"; title: string; intro?: string; columns: string[]; rows: string[][]; note?: string };
type LinkBlock = { type: "link"; title: string; text: string; path: ToolPath; label: string };
export type RepresentativeBlock = CardBlock | ListBlock | CompareBlock | TableBlock | WorkflowBlock | NoticeBlock | ExampleBlock | LinkBlock;

export type RepresentativeDetail = {
  metadata: { title: string; description: string };
  hero: { title: string; description: string };
  facts: Array<{ label: string; value: string }>;
  blocks: RepresentativeBlock[];
  faqs: Array<{ question: string; answer: string }>;
  related: ToolPath[];
};

export const REPRESENTATIVE_TOOL_DETAILS: Record<RepresentativePath, RepresentativeDetail> = {
  "/tools/hwp-hwpx-viewer": {
    metadata: { title: "HWP · HWPX 뷰어 - 한글 파일 설치 없이 열기", description: "한컴오피스가 없는 환경에서 HWP·HWPX 파일의 내용을 브라우저에서 확인하세요. 실제 지원 범위와 제한사항도 함께 안내합니다." },
    hero: { title: "HWP · HWPX 파일을\n설치 없이 빠르게 확인하세요", description: "한컴오피스가 없는 환경에서 HWP 또는 HWPX 문서의 내용을 브라우저에서 확인할 수 있습니다. 실제 표시 결과는 문서 형식과 구성 요소에 따라 달라질 수 있습니다." },
    facts: [{ label: "처리 위치", value: "브라우저 임시 메모리" }, { label: "지원 형식", value: "HWPX, HWP 5.x(제한적)" }, { label: "파일 한도", value: "파일당 25 MiB" }, { label: "데이터 저장", value: "서버에 업로드하거나 저장하지 않음" }],
    blocks: [
      { type: "cards", title: "이런 상황에서 유용합니다", items: [{ title: "공공기관 문서", text: "홈페이지에서 받은 HWP 공고문의 주요 내용을 빠르게 확인할 때" }, { title: "학교·대학 문서", text: "한글 프로그램이 없는 기기에서 안내문이나 서식을 확인할 때" }, { title: "빠른 내용 확인", text: "문서를 편집하지 않고 본문과 페이지를 살펴보거나 문구를 찾을 때" }] },
      { type: "table", title: "현재 뷰어의 지원 범위", intro: "현재 사용 중인 렌더러와 화면 기능을 기준으로 정리했습니다. 문서마다 작성 방식이 달라 결과가 달라질 수 있습니다.", caption: "HWP와 HWPX 문서 요소별 표시 범위", columns: ["문서 요소", "HWPX", "HWP 5.x", "확인할 점"], rows: [["일반 텍스트", "지원", "제한적 지원", "문서 내 검색은 추출 가능한 텍스트에 적용"], ["기본 문단 서식", "지원", "제한적 지원", "설치된 글꼴에 따라 줄바꿈이 달라질 수 있음"], ["표", "지원", "제한적 지원", "복잡한 병합과 배치는 달라질 수 있음"], ["이미지", "지원", "제한적 지원", "문서 구조와 렌더러가 읽는 이미지에 한함"], ["도형·수식·차트·글맵시", "제한적 지원", "제한적 지원", "누락되거나 원본과 다르게 표시될 수 있음"], ["암호화·배포용·구버전", "미지원", "미지원", "열기 단계에서 오류로 처리될 수 있음"]] },
      { type: "compare", title: "HWP와 HWPX는 처리 범위가 다릅니다", columns: [{ title: "HWPX", items: ["ZIP 기반 문서 구조를 읽는 우선 지원 형식", "본문·기본 서식·표·이미지를 지원 범위 안에서 렌더링"] }, { title: "HWP 5.x", items: ["바이너리 문서로 제한적으로 지원", "같은 내용이라도 전용 요소와 정교한 배치가 더 다르게 보일 수 있음"] }] },
      { type: "list", title: "이 도구가 적합하지 않은 경우", items: ["원본과 픽셀 단위로 같은 레이아웃이 필요한 문서", "내용 편집이나 전자서명이 필요한 문서", "복잡한 수식·차트·도형이 문서의 핵심인 경우", "암호화되거나 배포용으로 보호된 문서", "중요한 계약·제출 문서를 최종 검토하는 경우"] },
      { type: "notice", tone: "warning", title: "중요한 문서는 공식 프로그램으로 최종 확인하세요", text: "이 뷰어는 빠른 읽기 전용 확인을 위한 도구입니다. 표시 경고가 없더라도 원본 레이아웃과 모든 전용 요소가 같다고 보장하지 않습니다." },
    ],
    faqs: [{ question: "HWP와 HWPX를 모두 열 수 있나요?", answer: "HWPX를 우선 지원하고 HWP 5.x는 제한적으로 지원합니다. 구버전, 암호화 또는 배포용 문서는 열리지 않을 수 있습니다." }, { question: "표나 이미지도 보이나요?", answer: "렌더러가 읽을 수 있는 표와 이미지는 표시하지만, 복잡한 병합·배치나 일부 이미지 형식은 원본과 다를 수 있습니다." }, { question: "문서 안에서 검색할 수 있나요?", answer: "페이지에서 추출 가능한 텍스트를 대상으로 검색하며, 글자가 이미지나 지원하지 않는 개체 안에 있으면 검색되지 않습니다." }, { question: "선택한 문서가 서버에 올라가나요?", answer: "아니요. 파일은 현재 브라우저의 임시 메모리에서 처리되며 서버에 업로드하거나 저장하지 않습니다." }, { question: "문서를 수정하거나 다시 HWP로 저장할 수 있나요?", answer: "아니요. 현재 기능은 읽기 전용 확인, 페이지 이동, 확대·축소와 텍스트 찾기입니다." }],
    related: ["/tools/markdown-viewer", "/tools/image-to-pdf", "/tools/excel-chart-maker"],
  },
  "/tools/privacy-redactor": {
    metadata: { title: "이미지 개인정보 가리기 - 사진 속 정보 안전하게 가리기", description: "사진과 스크린샷에서 공유하면 안 되는 영역을 직접 선택해 단색 또는 픽셀 방식으로 가립니다. 확인해야 할 정보와 주의사항도 안내합니다." },
    hero: { title: "이미지를 공유하기 전에\n개인정보를 한 번 더 확인하세요", description: "사진이나 스크린샷에서 가려야 할 영역을 직접 선택하고 단색 또는 픽셀 방식으로 처리할 수 있습니다. 현재 버전은 OCR 자동 탐지를 제공하지 않으므로 최종 결과를 직접 확인해야 합니다." },
    facts: [{ label: "처리 위치", value: "브라우저" }, { label: "지원 형식", value: "JPG, PNG, WebP" }, { label: "파일 한도", value: "1개 · 최대 25 MiB" }, { label: "가림 방식", value: "불투명 단색 또는 픽셀화" }],
    blocks: [
      { type: "compare", title: "공유 전에 확인할 정보", intro: "현재 버전에서는 모든 영역을 사용자가 직접 찾아 선택해야 합니다.", columns: [{ title: "문자 정보", items: ["이름과 계정명", "전화번호와 이메일", "주소와 계좌번호", "주문번호·송장번호", "차량 번호"] }, { title: "문자가 아닌 정보", items: ["프로필 사진과 얼굴", "QR 코드와 바코드", "알림 내용", "화면 모서리의 계정 정보", "사진에 찍힌 문서와 명찰"] }] },
      { type: "workflow", title: "실제 사용 흐름", items: ["JPG·PNG·WebP 이미지 한 장 선택", "이미지를 확대하거나 원본 보기로 필요한 정보 확인", "영역 추가 모드에서 가릴 사각형 지정", "영역의 위치와 크기, 선택 여부 확인", "불투명 단색 또는 픽셀화 방식 선택", "결과 만들기 후 원본과 결과를 비교", "확인이 끝난 새 PNG 파일 저장"] },
      { type: "notice", tone: "warning", title: "현재 버전은 개인정보를 자동으로 찾지 않습니다", text: "OCR이나 얼굴·번호 자동 탐지 기능이 없습니다. 이름, 번호, 얼굴, QR 코드 등 공유하면 안 되는 부분을 사용자가 직접 확인하고 영역을 추가해야 합니다." },
      { type: "compare", title: "가림 방식 선택", columns: [{ title: "불투명 단색", items: ["선택 영역을 검정 또는 흰색으로 완전히 덮음", "민감한 문자나 번호에는 이 방식을 우선 권장"] }, { title: "픽셀화", items: ["원본의 색과 형태 일부가 남는 시각적 처리", "매우 민감한 정보에는 충분하지 않을 수 있음"] }] },
      { type: "notice", tone: "info", title: "저장하기 전에 결과 이미지를 확대해서 확인하세요", text: "영역 가장자리 밖으로 글자나 얼굴 일부가 남지 않았는지, 가릴 영역이 선택 해제되지 않았는지 확인한 후 공유하세요." },
    ],
    faqs: [{ question: "개인정보를 자동으로 찾아주나요?", answer: "아니요. 현재 버전은 OCR 자동 탐지를 제공하지 않으며 사용자가 직접 가릴 영역을 추가해야 합니다." }, { question: "픽셀화하면 원래 정보를 복원할 수 없나요?", answer: "픽셀화는 원래 형태의 단서를 남길 수 있습니다. 민감한 번호나 문자는 불투명 단색으로 완전히 덮는 편이 안전합니다." }, { question: "원본 이미지가 바뀌나요?", answer: "아니요. 원본 파일은 수정하지 않고 가림 영역을 반영한 새 PNG를 생성합니다." }, { question: "애니메이션 WebP도 처리하나요?", answer: "아니요. 프레임을 안전하게 유지할 수 없어 애니메이션 WebP는 차단합니다." }],
    related: ["/tools/image-metadata-remover", "/tools/screenshot-statusbar-remover", "/tools/screenshot-stitcher"],
  },
  "/tools/screenshot-stitcher": {
    metadata: { title: "스크린샷 이어붙이기 - 여러 캡처를 한 장으로 연결", description: "연속 스크린샷의 겹치는 영역을 분석해 하나의 긴 PNG로 연결합니다. 잘 이어지는 조건과 수동 조정 방법을 확인하세요." },
    hero: { title: "여러 장의 스크린샷을\n하나의 긴 이미지로 정리하세요", description: "연속해서 촬영한 스크린샷의 겹치는 부분을 분석해 하나의 이미지로 연결합니다. 자동 분석 결과가 불확실하면 연결 지점을 직접 확인하고 조정할 수 있습니다." },
    facts: [{ label: "처리 위치", value: "브라우저 Web Worker" }, { label: "지원 형식", value: "JPG, PNG, WebP" }, { label: "입력 한도", value: "최대 20장 · 장당 20 MiB" }, { label: "결과 형식", value: "PNG" }],
    blocks: [
      { type: "cards", title: "이런 화면에 적합합니다", items: [{ title: "긴 웹페이지", text: "스크롤하며 연속 캡처한 페이지" }, { title: "앱 화면과 설정", text: "같은 폭과 배율로 촬영한 단계별 화면" }, { title: "대화와 주문 과정", text: "앞뒤 화면에 겹치는 내용이 남아 있는 기록" }, { title: "사용 방법 매뉴얼", text: "여러 화면을 한 장의 참고 이미지로 정리할 때" }] },
      { type: "compare", title: "잘 이어지는 조건과 확인이 필요한 경우", columns: [{ title: "잘 이어지는 조건", items: ["스크린샷의 가로 폭과 화면 배율이 같음", "앞 이미지 하단과 다음 이미지 상단에 충분한 겹침이 있음", "겹치는 영역에 구분 가능한 글자와 형태가 있음", "파일 순서가 실제 화면 순서와 같음"] }, { title: "자동 분석이 어려운 경우", items: ["겹치는 영역이 거의 없거나 단색에 가까움", "광고·영상·애니메이션 내용이 캡처마다 바뀜", "서로 다른 화면이나 폭이 크게 다른 이미지를 섞음", "고정 헤더가 연결 지점의 비교를 방해함"] }] },
      { type: "workflow", title: "자동 분석 뒤에도 연결 지점을 확인할 수 있습니다", items: ["스크린샷을 순서대로 추가하고 필요하면 순서 변경", "겹침 영역 자동 분석", "신뢰도가 낮은 연결은 미리보기로 확인", "겹침 픽셀과 고정 UI 제외 범위를 수동 조정", "모든 연결을 확인한 뒤 긴 PNG 생성", "결과 크기와 제거된 중복 높이를 확인하고 저장"] },
      { type: "link", title: "문서에 넣을 스크린샷인가요?", text: "이어붙인 결과의 상단에 시간·배터리 표시가 남아 있다면 상태바 제거 도구에서 별도로 정리할 수 있습니다.", path: "/tools/screenshot-statusbar-remover", label: "스크린샷 상태바 제거하기" },
    ],
    faqs: [{ question: "겹치는 부분을 찾지 못하면 작업할 수 없나요?", answer: "연결별 미리보기에서 겹침 높이를 직접 조정하고 확인할 수 있습니다." }, { question: "고정 헤더가 반복되면 어떻게 하나요?", answer: "각 연결의 고정 UI 제외 설정에서 앞 이미지 하단이나 다음 이미지 상단을 분석 대상에서 제외한 뒤 다시 분석하세요." }, { question: "가로 폭이 다른 이미지도 추가할 수 있나요?", answer: "추가할 수는 있지만 첫 이미지 폭을 기준으로 크기가 조정되므로 배율과 선명도가 달라질 수 있습니다. 같은 폭의 캡처를 권장합니다." }, { question: "원본 스크린샷이 변경되나요?", answer: "아니요. 원본은 그대로 두고 중복 영역을 제외한 새 PNG를 생성합니다." }],
    related: ["/tools/screenshot-statusbar-remover", "/tools/privacy-redactor", "/tools/image-compressor"],
  },
  "/tools/image-metadata-remover": {
    metadata: { title: "사진 메타데이터 삭제 - GPS·EXIF 정보 확인 및 제거", description: "사진에 포함된 GPS, 촬영 시각, 기기와 촬영 설정 등 알려진 메타데이터를 확인하고 브라우저에서 제거합니다." },
    hero: { title: "사진을 공유하기 전에\n남아 있는 정보를 확인하세요", description: "JPG·PNG·WebP 사진에서 EXIF와 위치정보 등 알려진 메타데이터를 확인하고, 새 이미지로 다시 만들어 제거할 수 있습니다." },
    facts: [{ label: "처리 위치", value: "브라우저" }, { label: "지원 형식", value: "JPG, PNG, WebP" }, { label: "입력 한도", value: "최대 20개 · 파일당 25 MiB" }, { label: "삭제 방식", value: "Canvas 재인코딩 후 재검사" }],
    blocks: [
      { type: "cards", title: "현재 확인할 수 있는 정보", intro: "사진에 실제로 존재하고 파서가 읽을 수 있는 항목만 결과에 표시합니다.", items: [{ title: "기기와 렌즈", text: "제조사, 카메라·휴대전화 모델, 렌즈 제조사·모델과 일련번호" }, { title: "촬영 시각과 작성 정보", text: "원본 촬영·생성·수정 시각, 사용 소프트웨어, 작성자와 저작권 정보" }, { title: "촬영 설정", text: "셔터 속도, 조리개, ISO, 초점 거리, 플래시, 화이트 밸런스와 노출 정보" }, { title: "위치와 이미지 정보", text: "위도·경도·고도, 방향, 색 공간과 기록된 이미지 크기" }] },
      { type: "list", title: "이런 사진을 공유하기 전에 확인하세요", items: ["중고거래 상품 사진", "집이나 부동산 내부 사진", "여행 중 촬영한 원본 사진", "업무 현장과 시설 사진", "커뮤니티·SNS에 올릴 이미지"] },
      { type: "compare", title: "확인과 삭제는 이렇게 동작합니다", columns: [{ title: "삭제 전", items: ["컨테이너에서 EXIF·XMP·IPTC·ICC·주석·텍스트 정보 존재 여부 확인", "읽을 수 있는 촬영·기기·GPS 항목을 상세 목록으로 표시"] }, { title: "삭제 후", items: ["사진을 화면에 보이는 방향으로 새 파일에 다시 그림", "결과 파일을 다시 검사해 알려진 메타데이터 제거 여부 확인 후 다운로드 허용"] }] },
      { type: "notice", tone: "warning", title: "사진 픽셀에 보이는 개인정보는 없어지지 않습니다", text: "사진에 직접 찍힌 얼굴, 주소, 문서, 차량번호와 화면 속 문자는 메타데이터가 아닙니다. 결과 이미지를 직접 확인하고 별도의 가림 도구를 사용하세요." },
      { type: "link", title: "사진 안에 직접 보이는 정보도 있나요?", text: "얼굴, 주소, 차량번호나 문서 내용은 이미지 개인정보 가리기 도구에서 영역을 직접 지정해 처리할 수 있습니다.", path: "/tools/privacy-redactor", label: "이미지 개인정보 가리기" },
    ],
    faqs: [{ question: "GPS 좌표를 지도 서비스로 보내나요?", answer: "아니요. 위치 정보의 존재 여부와 값은 현재 브라우저에서만 확인하며 지도나 역지오코딩 서비스를 호출하지 않습니다." }, { question: "삭제 후 사진 화질과 용량이 같나요?", answer: "재인코딩하므로 JPG·WebP의 화질과 파일 크기가 달라질 수 있고 색상 프로파일 제거로 색감이 달라질 수도 있습니다." }, { question: "메타데이터가 없다고 나오면 모든 숨은 정보가 없다는 뜻인가요?", answer: "지원하는 컨테이너와 알려진 태그에서 찾지 못했다는 뜻입니다. 비표준 제조사 데이터까지 없다고 절대적으로 보장하지는 않습니다." }, { question: "애니메이션 이미지는 처리하나요?", answer: "아니요. 애니메이션 PNG·WebP는 프레임을 유지할 수 없어 지원하지 않습니다." }],
    related: ["/tools/privacy-redactor", "/tools/image-compressor", "/tools/image-color-picker"],
  },
  "/tools/screenshot-statusbar-remover": {
    metadata: { title: "스크린샷 상태바 제거 - 시간·배터리 영역 정리", description: "모바일 스크린샷 상단의 시간·배터리·통신 상태 영역을 자동 감지하고 경계를 직접 조정해 잘라냅니다." },
    hero: { title: "업무용 스크린샷에서\n불필요한 상태바를 정리하세요", description: "시간, 배터리와 통신 상태가 표시되는 모바일 스크린샷 상단을 감지하고, 자를 경계를 직접 조정해 문서나 콘텐츠에 사용할 이미지로 저장합니다." },
    facts: [{ label: "처리 위치", value: "브라우저" }, { label: "지원 형식", value: "JPG, PNG, WebP" }, { label: "처리 대상", value: "이미지 상단 상태바" }, { label: "결과 형식", value: "원본 계열 형식으로 재인코딩" }],
    blocks: [
      { type: "cards", title: "이런 경우에 사용합니다", items: [{ title: "앱 사용 매뉴얼", text: "설명에 필요하지 않은 시간과 배터리 표시 정리" }, { title: "고객 안내 문서", text: "모바일 화면을 단계별 안내 자료에 넣기 전 정리" }, { title: "블로그·소개 자료", text: "스크린샷 상단의 기기 상태를 덜어내고 본문에 집중" }, { title: "내부 보고서", text: "업무 기록에 불필요한 개인 기기 상태 표시 제거" }] },
      { type: "compare", title: "자동 감지와 수동 조정", columns: [{ title: "자동 감지", items: ["세로형이고 충분한 크기의 이미지 상단 10%를 분석", "상태바로 추정되는 경계와 신뢰도를 제시", "확신이 낮으면 자동으로 많이 자르지 않음"] }, { title: "수동 조정", items: ["미리보기의 경계선을 드래그", "1픽셀 단위 버튼과 숫자 입력으로 보정", "자동 감지 위치로 다시 되돌리기"] }] },
      { type: "notice", tone: "warning", title: "현재는 상단만 제거합니다", text: "이 도구는 이미지 위쪽을 잘라 상태바를 제거합니다. 하단 홈 인디케이터나 앱 내 하단 탐색 영역을 별도로 제거하는 기능은 제공하지 않습니다." },
      { type: "list", title: "결과를 만들기 전에 확인하세요", items: ["앱의 제목이나 뒤로가기 버튼이 상태바 바로 아래에 붙어 있지 않은지", "자동 경계가 앱 자체 헤더 안쪽까지 내려오지 않았는지", "가로형 또는 작은 이미지라 자동 감지가 제한되지 않았는지", "잘라낼 영역에 기록상 필요한 시간 정보가 포함되지 않았는지"] },
      { type: "link", title: "여러 장의 화면을 정리하고 있나요?", text: "연속된 스크린샷은 이어붙이기 도구에서 겹치는 부분을 확인해 하나의 긴 PNG로 만들 수 있습니다.", path: "/tools/screenshot-stitcher", label: "스크린샷 이어붙이기" },
    ],
    faqs: [{ question: "상태바를 자동으로 찾지 못하면 어떻게 하나요?", answer: "미리보기 경계선을 드래그하거나 픽셀 값을 입력해 자를 위치를 직접 지정할 수 있습니다." }, { question: "앱 헤더까지 잘리는 이유는 무엇인가요?", answer: "상태바와 앱 헤더의 색이나 경계가 비슷할 수 있습니다. 결과를 만들기 전에 경계를 위쪽으로 조정하세요." }, { question: "하단 홈 인디케이터도 제거하나요?", answer: "아니요. 현재 구현은 상단 상태바 제거만 지원합니다." }, { question: "사진 속 이름이나 알림 내용도 지워지나요?", answer: "아니요. 이미지를 자르는 기능이므로 다른 위치의 개인정보는 이미지 개인정보 가리기 도구로 처리해야 합니다." }],
    related: ["/tools/screenshot-stitcher", "/tools/privacy-redactor", "/tools/image-compressor"],
  },
  "/tools/excel-chart-maker": {
    metadata: { title: "Excel · CSV 그래프 만들기 - 엑셀 데이터 차트 변환", description: "XLSX·XLS·CSV 데이터를 브라우저에서 읽고 열을 선택해 막대, 선, 원형, 도넛, 영역, 산점도 차트로 만듭니다." },
    hero: { title: "Excel · CSV 데이터를\n필요한 그래프로 바로 바꿔보세요", description: "Excel이나 CSV 파일을 업로드하고 사용할 열을 선택해 차트를 생성할 수 있습니다. 파일은 브라우저에서 분석하며 수식은 다시 계산하지 않습니다." },
    facts: [{ label: "처리 위치", value: "브라우저 Web Worker" }, { label: "지원 파일", value: "XLSX, XLS, CSV" }, { label: "파일 한도", value: "25 MiB · 10만 행 · 50열" }, { label: "저장 형식", value: "PNG, JPG, SVG" }],
    blocks: [
      { type: "table", title: "만들 수 있는 차트와 선택 기준", caption: "지원 차트별 적합한 데이터", columns: ["차트", "적합한 데이터", "현재 제한"], rows: [["세로 막대", "항목별 크기 비교", "최대 500개 포인트"], ["가로 막대", "항목명이 길거나 항목이 많은 비교", "최대 500개 포인트"], ["선", "날짜·시간 순서의 변화", "최대 5,000개 포인트"], ["영역", "시간 흐름과 누적된 크기 강조", "최대 5,000개 포인트"], ["원형·도넛", "전체에서 각 항목이 차지하는 비율", "최대 20개, 음수·합계 0 불가"], ["산점도", "숫자 X와 숫자 Y 사이의 관계", "두 숫자 열 필요, 최대 10,000개 포인트"]] },
      { type: "example", title: "작은 데이터로 열 선택을 이해해보세요", intro: "아래처럼 첫 행에 열 이름이 있고 이후 행에 값이 있으면 열을 선택하기 쉽습니다.", columns: ["월", "방문자", "문의"], rows: [["1월", "120", "14"], ["2월", "180", "19"], ["3월", "150", "17"]], note: "월 → X축, 방문자 → Y열로 선택하면 월별 방문자 막대 또는 선 그래프를 만들 수 있습니다. 산점도는 월 대신 광고비처럼 숫자로 된 X열이 필요합니다." },
      { type: "workflow", title: "파일에서 그래프까지", items: ["XLSX·XLS·CSV 파일 또는 내장 예제 선택", "시트와 헤더 행 확인", "X축과 숫자 Y열을 선택", "추천 차트 또는 원하는 차트 유형 선택", "집계·정렬·상위 N개와 표시 옵션 조정", "미리보기를 확인하고 PNG·JPG·SVG로 저장"] },
      { type: "list", title: "파일을 읽을 때 적용되는 기준", items: ["CSV는 UTF-8, UTF-16LE/BE, CP949/EUC-KR 순서로 판독", "XLSX와 XLS는 저장된 셀 값을 읽으며 수식을 다시 계산하지 않음", "최대 10만 행, 50열, 비어 있지 않은 셀 200만 개", "한 번에 파일 하나를 처리하며 데이터는 서버로 전송하지 않음"] },
      { type: "link", title: "차트 이미지를 문서로 묶어야 하나요?", text: "저장한 차트 이미지는 이미지 PDF 변환기에서 다른 이미지와 함께 하나의 PDF로 정리할 수 있습니다.", path: "/tools/image-to-pdf", label: "이미지 PDF 변환기 열기" },
    ],
    faqs: [{ question: "엑셀 수식을 다시 계산하나요?", answer: "아니요. 파일에 마지막으로 저장된 셀 값을 읽습니다. 계산 결과가 저장되지 않은 수식은 예상과 다르게 보일 수 있습니다." }, { question: "CSV 한글이 깨지면 어떻게 하나요?", answer: "UTF-8, UTF-16과 CP949/EUC-KR을 판독합니다. 그래도 깨지면 원본 프로그램에서 UTF-8 CSV로 다시 저장해 보세요." }, { question: "산점도에는 어떤 열이 필요한가요?", answer: "X축과 Y축 모두 숫자로 해석되는 열이 필요합니다. 예를 들어 광고비와 방문자 수, 키와 몸무게처럼 두 수치의 관계를 볼 때 사용합니다." }, { question: "원형 차트에 음수를 넣을 수 있나요?", answer: "아니요. 원형과 도넛은 음수 값 또는 합계가 0 이하인 데이터를 차단하며, 항목이 많으면 비교가 어렵다는 경고를 표시합니다." }],
    related: ["/tools/image-to-pdf", "/tools/sql-formatter", "/tools/json-formatter"],
  },
};
