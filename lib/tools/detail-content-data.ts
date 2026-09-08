import type { AppLocale } from "@/i18n/routing";
import type { DetailToolPath } from "@/lib/tools/detail-content";

export type DetailSection =
  | { type: "text"; title: string; paragraphs: string[] }
  | { type: "steps" | "list"; title: string; intro?: string; items: Array<{ title: string; text: string }> }
  | { type: "example"; title: string; intro?: string; items: Array<{ label: string; value: string }> };

export type ToolDetailData = {
  sections: DetailSection[];
  privacy?: { title: string; description: string };
  faqs: { title: string; items: Array<{ question: string; answer: string }> };
  relatedTitle: string;
  popularTitle: string;
};

function koreanAppendix(input: {
  steps: Array<[string, string]>;
  examples: Array<[string, string]>;
  rules: Array<[string, string]>;
  faqs: Array<[string, string]>;
  relatedTitle: string;
  privacy?: ToolDetailData["privacy"];
}): ToolDetailData {
  return {
    sections: [
      { type: "steps", title: "사용 방법", items: input.steps.map(([title, text]) => ({ title, text })) },
      { type: "example", title: "실제 사용 예", items: input.examples.map(([label, value]) => ({ label, value })) },
      { type: "list", title: "처리 기준과 제한사항", items: input.rules.map(([title, text]) => ({ title, text })) },
    ],
    privacy: input.privacy,
    faqs: { title: "자주 묻는 질문", items: input.faqs.map(([question, answer]) => ({ question, answer })) },
    relatedTitle: input.relatedTitle,
    popularTitle: "다른 인기 도구",
  };
}

function englishAppendix(input: {
  name: string;
  overview: string;
  steps: Array<[string, string]>;
  examples: Array<[string, string]>;
  rules: Array<[string, string]>;
  privacy: ToolDetailData["privacy"];
  faqs: Array<[string, string]>;
  relatedTitle: string;
}): ToolDetailData {
  return {
    sections: [
      { type: "text", title: `What does the ${input.name} do?`, paragraphs: [input.overview] },
      { type: "steps", title: "How to use it", items: input.steps.map(([title, text]) => ({ title, text })) },
      { type: "example", title: "Practical examples", items: input.examples.map(([label, value]) => ({ label, value })) },
      { type: "list", title: "Processing rules and limitations", items: input.rules.map(([title, text]) => ({ title, text })) },
    ],
    privacy: input.privacy,
    faqs: { title: "Frequently asked questions", items: input.faqs.map(([question, answer]) => ({ question, answer })) },
    relatedTitle: input.relatedTitle,
    popularTitle: "Other popular tools",
  };
}

export const TOOL_DETAIL_DATA: Record<AppLocale, Partial<Record<DetailToolPath, ToolDetailData>>> = {
  ko: {
    "/tools/base64-converter": koreanAppendix({
      steps: [["모드 선택", "일반 문자열은 Encode, Base64를 원문으로 돌릴 때는 Decode를 선택합니다."], ["문자 인코딩 확인", "Auto Encode는 UTF-8을 사용하며 기존 데이터의 인코딩을 안다면 직접 선택합니다."], ["변환 및 복사", "변환 후 실제 적용된 인코딩을 확인하고 결과를 복사합니다."]],
      examples: [["UTF-8 텍스트", "안녕하세요 😀 → Base64 → 같은 UTF-8로 원문 복원"], ["레거시 데이터", "EUC-KR 또는 Shift_JIS Base64 → 동일 인코딩을 선택해 Decode"]],
      rules: [["바이트 기준", "문자열을 선택한 인코딩의 바이트로 바꾼 뒤 Base64를 생성합니다."], ["문자 손실 방지", "선택한 인코딩으로 표현할 수 없는 문자는 조용히 바꾸지 않고 오류로 안내합니다."], ["자동 감지 한계", "Base64에는 원래 문자 인코딩 정보가 없어 Decode 감지 결과는 추정값입니다."]],
      faqs: [["Base64는 암호화인가요?", "아니요. 누구나 디코딩할 수 있어 비밀정보 보호용으로 사용할 수 없습니다."], ["한글이나 이모지가 깨지는 이유는 무엇인가요?", "인코딩과 디코딩에서 서로 다른 문자 인코딩을 사용했을 가능성이 큽니다."], ["패딩이 없는 값도 열 수 있나요?", "유효한 범위에서는 보정하지만 손상된 Base64는 오류로 처리합니다."]], relatedTitle: "관련 인코딩 도구",
    }),
    "/tools/cron-expression-generator": koreanAppendix({
      steps: [["생성 또는 입력", "실행 주기를 선택하거나 기존 5필드 Cron을 직접 입력합니다."], ["예정 시간 확인", "필드 설명과 브라우저 시간대 기준 다음 실행 시각을 확인합니다."], ["배포 환경 검증", "복사 후 실제 서버의 시간대와 지원 문법을 다시 확인합니다."]],
      examples: [["매일 오전 9시", "0 9 * * *"], ["평일 10분마다", "*/10 * * * 1-5"]],
      rules: [["지원 문법", "Unix/Vixie 숫자형 5필드와 *, 쉼표, 하이픈, 슬래시를 지원합니다."], ["요일과 날짜", "두 필드를 함께 지정하면 일반 Vixie 규칙에서 둘 중 하나가 일치할 때 실행됩니다."], ["시간대", "Cron 문자열에는 시간대가 없으며 실제 실행 환경 설정이 최종 기준입니다."]],
      faqs: [["초 필드를 지원하나요?", "아니요. 분·시·일·월·요일의 5필드만 지원합니다."], ["서버와 다음 실행 시간이 다른 이유는 무엇인가요?", "브라우저와 서버의 시간대 또는 서비스별 Cron 규칙이 다를 수 있습니다."], ["Vercel Cron에 그대로 쓸 수 있나요?", "기본 형식은 참고할 수 있지만 허용 주기와 시간대는 최신 정책을 확인해야 합니다."]], relatedTitle: "관련 개발 도구",
    }),
    "/tools/excel-chart-maker": koreanAppendix({
      steps: [["파일 열기", "XLSX, XLS, CSV를 선택하고 시트와 헤더 행을 확인합니다."], ["축과 차트 선택", "항목 열과 숫자 열을 고르고 데이터에 맞는 차트 유형을 선택합니다."], ["디자인 및 저장", "제목, 범례, 크기를 확인하고 PNG, JPG 또는 SVG로 저장합니다."]],
      examples: [["월별 매출", "X축: 날짜 / Y축: 매출 / 막대 또는 라인"], ["광고비와 매출", "X 값: 광고비 / Y 값: 매출 / 산점도"]],
      rules: [["파일 범위", "파일 한 개, 최대 25MiB·100,000행·50열을 지원합니다."], ["산점도", "각 행이 점 하나이며 X와 Y가 모두 숫자 열이어야 합니다."], ["원형 차트", "음수를 사용할 수 없고 합계가 0보다 커야 하며 항목이 많으면 비교가 어렵습니다."]],
      faqs: [["CSV 한글이 깨지면 어떻게 하나요?", "원본 CSV를 UTF-8로 다시 저장하면 가장 안정적입니다."], ["엑셀 수식을 다시 계산하나요?", "아니요. 파일에 저장된 셀 값을 읽고 수식을 재계산하지 않습니다."], ["그래프 값이 원본과 다른 이유는 무엇인가요?", "집계를 선택하면 같은 항목이 합계나 평균으로 묶입니다."]], relatedTitle: "관련 데이터 도구",
    }),
    "/tools/favicon-generator": koreanAppendix({
      steps: [["원본 선택", "짧은 텍스트, 이모지 또는 정사각형에 가까운 이미지를 선택합니다."], ["작은 크기 확인", "색상과 여백을 조절하고 16px 미리보기를 확인합니다."], ["파일 저장", "ICO와 PNG 세트 또는 웹사이트용 패키지를 내려받습니다."]],
      examples: [["텍스트 아이콘", "한 글자 + 브랜드 배경색 + 굵은 글꼴"], ["로고 아이콘", "로고 업로드 → 여백 조정 → 16px 확인"]],
      rules: [["가독성", "16×16px에서도 구분되어야 하므로 긴 문구와 가는 선은 피하세요."], ["이미지 변환", "원본은 정사각형 캔버스에 맞춰 여러 PNG 크기로 다시 렌더링됩니다."], ["캐시", "교체 후 바로 보이지 않으면 브라우저 캐시와 기존 아이콘 링크를 확인하세요."]],
      faqs: [["ICO와 PNG가 모두 필요한가요?", "현대 브라우저는 PNG를 지원하지만 다양한 환경에는 ICO를 함께 제공할 수 있습니다."], ["글자가 흐린 이유는 무엇인가요?", "글자 수를 줄이고 굵은 글꼴과 높은 대비를 사용하세요."], ["로고가 서버에 저장되나요?", "아니요. 이미지 렌더링과 파일 생성은 브라우저에서 처리됩니다."]], relatedTitle: "관련 이미지 도구",
    }),
    "/tools/image-color-picker": koreanAppendix({
      steps: [["이미지 열기", "JPG, PNG, WebP 이미지를 선택합니다."], ["픽셀 선택", "확대 렌즈로 클릭하거나 원본 기준 X·Y 좌표를 입력합니다."], ["색상 복사", "HEX, RGB, HSL, HSV, CMYK 중 필요한 값을 복사합니다."]],
      examples: [["웹 색상", "버튼 픽셀 선택 → HEX 값 복사"], ["투명 이미지", "투명 픽셀 → HEXA 또는 RGBA 확인"]],
      rules: [["원본 좌표", "화면 확대와 관계없이 디코딩된 원본 이미지 픽셀을 읽습니다."], ["CMYK", "화면 RGB의 수학적 변환값이며 인쇄 ICC 프로파일 결과와 다를 수 있습니다."], ["지원 한도", "한 장, 최대 25MB·2,400만 픽셀·한 변 12,000px까지 지원합니다."]],
      faqs: [["확대하면 색상이 바뀌나요?", "아니요. 확대는 미리보기만 키우며 원본 픽셀을 읽습니다."], ["옆 픽셀 값이 다른 이유는 무엇인가요?", "압축 노이즈, 그라데이션, 반투명 때문에 인접 값이 다를 수 있습니다."], ["CMYK를 인쇄에 그대로 써도 되나요?", "참고값이며 정확한 인쇄에는 색상 프로파일이 필요합니다."]], relatedTitle: "관련 이미지 도구",
    }),
    "/tools/ip-info": koreanAppendix({
      steps: [["현재 IP 확인", "페이지를 열면 현재 공인 IP와 기본 네트워크 정보를 조회합니다."], ["다른 IP 입력", "URL이나 도메인이 아닌 공인 IPv4 또는 IPv6 주소만 입력합니다."], ["결과 해석", "국가, ISP, ASN과 위치가 근사 정보임을 고려해 확인합니다."]],
      examples: [["DNS 주소 확인", "8.8.8.8 → 국가·사업자·ASN 확인"], ["VPN 점검", "VPN 전후 공인 IP와 출구 국가 비교"]],
      rules: [["공인 IP만", "localhost, 사설망, CGNAT, 멀티캐스트와 문서용 주소는 조회하지 않습니다."], ["위치 정확도", "IP 등록과 라우팅 기반 근사값이며 개인의 실제 주소나 GPS 위치가 아닙니다."], ["외부 조회", "정보 조회를 위해 IP 주소가 브라우저에서 IPWHOIS.IO로 전송됩니다."]],
      faqs: [["사설 IP는 왜 조회할 수 없나요?", "인터넷에서 고유한 위치 정보가 없는 내부 네트워크 주소이기 때문입니다."], ["표시된 도시가 실제 위치와 다른 이유는 무엇인가요?", "통신사 등록지나 네트워크 출구 위치가 표시될 수 있습니다."], ["VPN을 사용하면 무엇이 표시되나요?", "일반적으로 실제 회선 대신 VPN 서버의 공인 IP와 위치가 표시됩니다."]], relatedTitle: "함께 쓰는 네트워크 도구",
    }),
    "/tools/jwt-decoder": koreanAppendix({
      steps: [["토큰 붙여넣기", "점으로 구분된 JWT 문자열을 입력합니다."], ["Header와 Payload 확인", "알고리즘 정보와 Claims, 시간 관련 값을 읽습니다."], ["검증 여부 구분", "표시된 내용은 디코딩 결과일 뿐 신뢰할 수 있는 서명 검증 결과가 아님을 확인합니다."]],
      examples: [["Payload 확인", "sub, iss, aud, exp 같은 Claim 점검"], ["만료 시간 점검", "exp Unix timestamp → 읽을 수 있는 날짜로 확인"]],
      rules: [["형식", "일반적인 JWT는 Header.Payload.Signature의 세 구간으로 구성됩니다."], ["서명 미검증", "비밀키나 공개키를 사용하지 않으므로 토큰의 진위와 변조 여부를 확인하지 않습니다."], ["민감정보", "JWT Payload는 암호문이 아니므로 비밀번호나 주민번호를 넣어서는 안 됩니다."]],
      faqs: [["디코딩되면 유효한 토큰인가요?", "아니요. 구조를 읽을 수 있다는 뜻이며 서명, 발급자, 대상 검증이 필요합니다."], ["Signature가 읽히지 않는 이유는 무엇인가요?", "서명은 일반 텍스트가 아니라 검증에 사용하는 바이트 데이터입니다."], ["만료된 토큰도 디코딩되나요?", "네. 만료 여부와 관계없이 구조는 읽을 수 있지만 서비스에서는 거부될 수 있습니다."]], relatedTitle: "관련 토큰·인코딩 도구",
    }),
    "/tools/korean-initial-converter": koreanAppendix({
      steps: [["한글 입력", "문장이나 이름 목록을 입력란에 붙여 넣습니다."], ["초성 결과 확인", "입력 즉시 각 한글 음절의 첫 자음이 표시됩니다."], ["결과 복사", "영문·숫자·기호가 유지된 결과를 필요한 곳에 복사합니다."]],
      examples: [["검색 색인", "간편도구 → ㄱㅍㄷㄱ"], ["혼합 문자열", "Konly 도구 2026 → Konly ㄷㄱ 2026"]],
      rules: [["완성형 한글", "가~힣 범위의 음절을 초성 19개 기준으로 변환합니다."], ["비한글 문자", "영문, 숫자, 공백, 기호와 이모지는 원문 그대로 유지합니다."], ["자모 입력", "이미 분리된 ㄱ, ㅏ 같은 한글 자모는 완성형 음절이 아니므로 그대로 남습니다."]],
      faqs: [["받침도 결과에 포함되나요?", "아니요. 각 음절의 초성만 추출합니다."], ["영어와 숫자는 왜 그대로 나오나요?", "혼합된 이름과 검색어의 구조를 유지하기 위한 동작입니다."], ["모든 한국어 단어를 약어로 바꾸나요?", "아니요. 의미를 해석하지 않고 문자 단위로 초성만 계산합니다."]], relatedTitle: "관련 텍스트 도구",
    }),
    "/tools/password-generator": koreanAppendix({
      steps: [["생성 방식 선택", "무작위 문자 또는 여러 단어를 조합한 Passphrase를 선택합니다."], ["조건 설정", "길이, 문자 유형 또는 단어 수와 구분자를 정합니다."], ["생성 및 보관", "새 결과를 생성해 복사하고 신뢰할 수 있는 비밀번호 관리자에 저장합니다."]],
      examples: [["계정 비밀번호", "16자 이상 + 대문자·소문자·숫자·특수문자"], ["기억할 Passphrase", "무작위 단어 5개 + 구분자 + 숫자"]],
      rules: [["보안 난수", "브라우저의 crypto.getRandomValues를 사용해 선택 가능한 값에서 무작위로 생성합니다."], ["강도 표시", "길이와 문자 조합에 따른 추정치이며 특정 서비스의 정책 통과를 보장하지 않습니다."], ["서비스별 분리", "같은 비밀번호를 여러 사이트에 재사용하지 않는 것이 중요합니다."]],
      faqs: [["생성한 비밀번호가 서버에 저장되나요?", "아니요. 현재 브라우저에서 생성하며 서버로 전송하지 않습니다."], ["강함으로 표시되면 절대 안전한가요?", "아니요. 피싱, 유출, 재사용 위험은 별개이므로 2단계 인증도 권장합니다."], ["문자 방식과 Passphrase 중 무엇이 좋나요?", "서비스 허용 조건과 사용 목적에 맞추되 충분한 길이와 무작위성을 확보하세요."]], relatedTitle: "관련 보안 도구",
    }),
    "/tools/privacy-redactor": koreanAppendix({
      steps: [["이미지 선택", "공유할 사진이나 스크린샷을 불러옵니다."], ["영역 지정", "자동 후보를 검토하고 누락된 이름, 번호, 얼굴은 직접 영역으로 추가합니다."], ["가림 적용 및 저장", "단색 또는 모자이크를 적용한 결과 이미지를 내려받아 다시 확인합니다."]],
      examples: [["상담 화면 공유", "이름·전화번호·상담번호 영역을 직접 선택해 가림"], ["택배 송장", "받는 사람·주소·전화번호·운송장 번호를 선택해 가림"]],
      rules: [["자동 탐지 한계", "OCR 결과는 글자 크기, 해상도, 배경에 따라 누락되므로 자동 결과를 반드시 직접 검토해야 합니다."], ["원본 보기", "편집 중 비교 기능일 뿐 다운로드 결과에는 선택한 가림 영역이 적용됩니다."], ["되돌릴 수 없는 출력", "내보낸 이미지의 픽셀을 실제로 덮으므로 원본은 별도로 보관하세요."]],
      faqs: [["모든 개인정보가 자동으로 찾아지나요?", "아니요. 사용자명, 얼굴, 작은 글자 등은 누락될 수 있어 직접 영역 추가가 필요합니다."], ["모자이크를 나중에 복원할 수 있나요?", "이 도구의 출력은 픽셀에 적용되지만 중요한 정보는 단색 가림을 사용하는 편이 더 안전합니다."], ["이미지가 서버에 올라가나요?", "아니요. OCR 모델과 이미지 편집은 브라우저에서 실행됩니다."]], relatedTitle: "관련 스크린샷 도구",
    }),
    "/tools/qr-code-generator": koreanAppendix({
      steps: [["내용 입력", "URL 또는 일반 텍스트를 입력하면 잠시 후 QR이 생성됩니다."], ["옵션 조정", "크기, 오류 복원 수준, 여백과 색상을 조정합니다."], ["스캔 확인 및 저장", "미리보기를 실제 기기로 읽어 본 뒤 PNG를 다운로드합니다."]],
      examples: [["웹사이트 공유", "https://www.konly.co.kr → 256px / M / 기본 여백"], ["인쇄물", "512px 이상 / 충분한 대비 / 여백 4 이상"]],
      rules: [["오류 복원", "L·M·Q·H 순서로 손상 복원 능력이 높아지지만 같은 크기에 담을 수 있는 데이터는 줄어듭니다."], ["Quiet Zone", "가장자리 여백은 인식에 중요하므로 지나치게 줄이지 않는 것이 좋습니다."], ["긴 입력", "데이터가 길수록 QR 모듈이 촘촘해져 작은 크기에서 스캔이 어려울 수 있습니다."]],
      faqs: [["URL이 아니어도 만들 수 있나요?", "네. 일반 문장, 숫자, 한글과 이모지도 QR에 넣을 수 있습니다."], ["색상을 바꿔도 잘 읽히나요?", "전경과 배경의 대비가 충분해야 하며 밝은 전경과 어두운 배경 조합은 피하는 것이 안전합니다."], ["오류 복원 H가 항상 좋은가요?", "아니요. 데이터 밀도가 높아지므로 로고나 손상 가능성이 있을 때 선택하고 실제 스캔을 확인하세요."]], relatedTitle: "관련 생성·이미지 도구",
    }),
    "/tools/regex-tester": koreanAppendix({
      steps: [["Pattern과 flag 입력", "JavaScript 정규식 본문과 g, i, m 등의 flag를 분리해 입력합니다."], ["테스트 실행", "문자열에서 매치 위치와 캡처 그룹을 확인합니다."], ["치환 검증", "Replacement를 입력해 원문이 어떻게 바뀌는지 미리봅니다."]],
      examples: [["숫자 찾기", "Pattern: \\d+ / Flag: g / 입력: 주문 12개, 반품 2개"], ["날짜 순서 변경", "Pattern: (\\d{4})-(\\d{2})-(\\d{2}) / Replacement: $2/$3/$1"]],
      rules: [["실행 엔진", "현재 브라우저의 JavaScript RegExp 문법과 지원 기능을 기준으로 합니다."], ["실행 제한", "오래 걸리는 Pattern은 Worker 제한 시간으로 중단될 수 있으며 첫 1,000개만 강조합니다."], ["검증 범위", "이메일·URL 예제는 형식 학습용이며 모든 유효한 주소를 판별하는 완전한 검증식이 아닙니다."]],
      faqs: [["g flag가 없으면 왜 하나만 나오나요?", "JavaScript RegExp는 g가 없을 때 첫 번째 일치 항목만 반환합니다."], ["브라우저마다 결과가 다를 수 있나요?", "최신 문법 지원 여부와 Unicode 처리 차이로 구형 브라우저에서는 달라질 수 있습니다."], ["정규식이 멈추는 이유는 무엇인가요?", "중첩 반복처럼 되돌아가기가 많은 Pattern은 매우 오래 걸릴 수 있어 안전 제한으로 중단합니다."]], relatedTitle: "관련 텍스트·개발 도구",
    }),
    "/tools/screenshot-statusbar-remover": koreanAppendix({
      steps: [["스크린샷 선택", "세로형 스마트폰 스크린샷을 한 장 불러옵니다."], ["제거선 확인", "자동 감지된 상태바 아래쪽 선을 보고 필요하면 직접 위아래로 조정합니다."], ["잘린 결과 저장", "미리보기에서 본문이 잘리지 않았는지 확인하고 PNG로 저장합니다."]],
      examples: [["앱 소개 이미지", "상단 시간·배터리 영역만 제거하고 앱 화면 유지"], ["버그 리포트", "상태바 제거선 수동 조정 → 필요한 본문만 공유"]],
      rules: [["감지 대상", "상단의 밝기·색상 변화와 일반적인 상태바 높이를 참고한 후보이며 기종을 확정 판별하지 않습니다."], ["지원 이미지", "세로형 PNG, JPEG, WebP 한 장을 대상으로 하며 가로 화면이나 특수 레이아웃은 수동 조정이 필요합니다."], ["개인정보", "상태바를 자르는 기능이며 화면 본문의 이름·메시지 등은 자동으로 가리지 않습니다."]],
      faqs: [["상태바가 아닌 부분까지 잘렸어요.", "제거선을 위로 조정해 본문 시작 위치를 다시 확인하세요."], ["자동 감지가 실패하는 화면은 무엇인가요?", "상단 색상이 복잡하거나 상태바와 본문 경계가 없는 화면에서는 정확도가 낮을 수 있습니다."], ["원본 이미지도 바뀌나요?", "아니요. 브라우저에서 새 결과 파일을 만들며 원본 파일은 수정하지 않습니다."]], relatedTitle: "관련 스크린샷 도구",
    }),
    "/tools/screenshot-stitcher": koreanAppendix({
      steps: [["순서대로 선택", "위에서 아래로 촬영한 스크린샷을 실제 순서대로 추가합니다."], ["연결부 검토", "자동으로 찾은 겹침 위치와 신뢰도를 확인하고 필요하면 직접 조정합니다."], ["긴 이미지 저장", "중복이나 잘림이 없는지 미리본 뒤 PNG로 저장합니다."]],
      examples: [["긴 대화", "연속 캡처 4장 → 고정 입력창 중복 확인 → 한 장으로 저장"], ["웹 문서", "스크롤마다 일부 내용을 겹쳐 촬영 → 자동 연결"]],
      rules: [["겹치는 영역", "인접 이미지에 충분히 같은 픽셀이 있어야 안정적으로 연결할 수 있습니다."], ["고정 UI", "상단바, 하단바, 반복 메뉴는 여러 위치가 같아 보여 오탐 원인이 될 수 있습니다."], ["이미지 한도", "큰 이미지 여러 장은 브라우저 메모리를 많이 사용하므로 필요한 장수와 해상도로 작업하세요."]],
      faqs: [["사진 사이에 중복이 필요한가요?", "네. 각 캡처에 이전 화면의 일부를 남겨야 같은 위치를 찾을 수 있습니다."], ["연결부가 어긋나면 어떻게 하나요?", "연결 미리보기에서 기준 위치를 조정하거나 겹침이 더 큰 원본으로 다시 촬영하세요."], ["움직이는 화면도 합칠 수 있나요?", "영상, 광고, 시간처럼 캡처마다 내용이 바뀌면 자동 연결 정확도가 낮아집니다."]], relatedTitle: "관련 스크린샷 도구",
    }),
    "/tools/sql-formatter": koreanAppendix({
      steps: [["DBMS 선택", "MySQL, PostgreSQL, SQL Server, Oracle, SQLite 중 쿼리에 맞는 문법을 고릅니다."], ["SQL 정렬", "쿼리를 붙여 넣고 들여쓰기, 키워드 표기와 쉼표 옵션을 선택합니다."], ["결과 검토", "정렬 결과를 복사하되 실행 전 원래 DBMS에서 문법과 동작을 확인합니다."]],
      examples: [["긴 SELECT", "SELECT·FROM·JOIN·WHERE 절을 줄과 들여쓰기로 구분"], ["목록 정리", "긴 컬럼 목록의 쉼표 위치를 앞 또는 뒤로 통일"]],
      rules: [["정렬과 실행", "쿼리 텍스트만 정리하며 데이터베이스에 연결하거나 SQL을 실행하지 않습니다."], ["DBMS 문법", "선택한 방언을 기준으로 분석하지만 확장 문법과 공급자별 함수 전체를 검증하지는 않습니다."], ["의미 보존", "공백과 표기를 정리하는 도구이지만 배포 전 결과 쿼리를 직접 검토해야 합니다."]],
      faqs: [["SQL 오류도 찾아주나요?", "일부 분석 오류는 표시하지만 완전한 문법·스키마 검증기는 아닙니다."], ["데이터베이스에 쿼리가 전송되나요?", "아니요. 브라우저에서 텍스트만 처리하고 실행하지 않습니다."], ["DBMS를 잘못 선택하면 어떻게 되나요?", "예약어와 특수 문법 인식이 달라져 정렬이 어색하거나 오류가 날 수 있습니다."]], relatedTitle: "관련 데이터·개발 도구",
    }),
    "/tools/text-cleaner": koreanAppendix({
      steps: [["텍스트 입력", "문서나 목록을 붙여 넣고 정리 전 통계를 확인합니다."], ["규칙 선택", "앞뒤 공백, 연속 공백, 빈 줄, 중복 줄 등 필요한 옵션만 선택합니다."], ["결과 검토", "변경 통계를 확인한 뒤 정리된 텍스트를 복사합니다."]],
      examples: [["복사한 목록", "줄 앞뒤 공백 제거 + 빈 줄 축소 + 중복 줄 제거"], ["문단 정리", "연속 스페이스만 정리하고 줄바꿈은 유지"]],
      rules: [["규칙 순서", "여러 옵션은 정해진 순서로 적용되므로 중복 제거 결과가 공백 정리의 영향을 받을 수 있습니다."], ["중복 줄", "대소문자와 공백을 정리한 뒤 같은 줄인지 판단하는 옵션을 구분해 사용하세요."], ["의미 보존", "자동 정리는 코드, 표, 들여쓰기의 의미를 바꿀 수 있으므로 결과를 확인해야 합니다."]],
      faqs: [["원본 줄바꿈을 유지할 수 있나요?", "네. 빈 줄 정리 옵션을 끄고 필요한 공백 규칙만 사용하세요."], ["중복 제거 후 순서가 바뀌나요?", "처음 나온 줄을 유지하고 이후 중복 줄을 제거합니다."], ["입력 내용이 저장되나요?", "아니요. 텍스트 정리는 현재 브라우저 메모리에서만 실행됩니다."]], relatedTitle: "관련 텍스트 도구", privacy: { title: "텍스트는 브라우저에서만 처리됩니다", description: "입력과 정리 결과를 서버나 브라우저 저장소에 저장하지 않습니다." },
    }),
    "/tools/url-encoder-decoder": koreanAppendix({
      steps: [["모드 선택", "원문을 Percent Encoding으로 바꾸려면 Encode, %XX를 원문으로 돌리려면 Decode를 선택합니다."], ["범위 선택", "Query 값은 URL Component, 주소 구조를 유지할 때는 Full URL을 선택합니다."], ["변환 및 확인", "UTF-8 결과를 확인하고 필요한 문자열만 복사합니다."]],
      examples: [["Query 값", "안녕하세요 & test=true → URL Component로 예약 문자까지 인코딩"], ["전체 주소", "https://example.com/search?q=한글 → Full URL로 : / ? = 유지"]],
      rules: [["UTF-8", "Unicode 문자를 UTF-8 바이트 기반 Percent Encoding으로 처리합니다."], ["+ 기호", "일반 Percent Decode에서는 +를 공백으로 자동 변환하지 않습니다."], ["중복 인코딩", "이미 %20처럼 인코딩된 값을 다시 Encode하면 % 자체가 %25로 바뀔 수 있습니다."]],
      faqs: [["encodeURI와 encodeURIComponent 차이는 무엇인가요?", "전체 URL은 주소 구조 문자를 유지하고 Component는 Query 값에 쓰도록 예약 문자도 인코딩합니다."], ["%ZZ가 오류인 이유는 무엇인가요?", "% 뒤에는 정확히 두 자리 16진수가 필요합니다."], ["Decode하면 링크가 자동으로 열리나요?", "아니요. 문자열만 변환하며 결과 URL을 실행하지 않습니다."]], relatedTitle: "관련 인코딩 도구",
    }),
    "/tools/youtube-thumbnail-downloader": koreanAppendix({
      steps: [["주소 붙여넣기", "일반 영상, Shorts, 공유 주소, embed 주소 또는 11자리 영상 ID를 입력합니다."], ["썸네일 확인", "추출 후 실제 제공되는 해상도와 이미지 크기를 비교합니다."], ["열기 또는 저장", "저장이 제한되면 이미지 열기로 원본을 연 뒤 브라우저 저장 기능을 사용합니다."]],
      examples: [["공유 주소", "https://youtu.be/VIDEO_ID"], ["Shorts 주소", "https://www.youtube.com/shorts/VIDEO_ID"]],
      rules: [["지원 대상", "단일 YouTube 영상 ID를 포함한 주소만 처리하며 채널·재생목록 주소는 대상이 아닙니다."], ["해상도", "maxresdefault 등 모든 크기가 모든 영상에 존재하지 않아 실제 이미지 크기를 확인합니다."], ["외부 요청", "영상 ID 확인 후 썸네일 이미지는 브라우저가 i.ytimg.com에서 직접 불러옵니다."]],
      faqs: [["비공개 영상도 가능한가요?", "YouTube 이미지 서버에서 공개적으로 제공되는 썸네일만 확인할 수 있습니다."], ["채널 주소를 넣어도 되나요?", "아니요. 영상 ID가 있는 개별 영상 주소가 필요합니다."], ["영상 제목이나 설명도 가져오나요?", "아니요. 이 도구는 영상 ID로 썸네일 후보만 확인합니다."]], relatedTitle: "관련 이미지 도구",
    }),
    "/tools/json-formatter": {
      sections: [
        { type: "text", title: "JSON 포맷터는 무엇을 하나요?", paragraphs: ["JSON 문자열의 문법을 검사하고, 데이터를 바꾸지 않은 채 읽기 좋은 들여쓰기 형식이나 공백을 제거한 압축 형식으로 변환합니다. API 응답을 확인하거나 설정 파일을 정리할 때 사용할 수 있습니다."] },
        { type: "steps", title: "사용 방법", items: [
          { title: "JSON 입력", text: "입력란에 JSON을 붙여 넣습니다. 키와 문자열은 큰따옴표를 사용해야 합니다." },
          { title: "정리 또는 압축", text: "Format은 두 칸 들여쓰기로 정리하고, Minify는 문자열 밖의 불필요한 공백을 제거합니다." },
          { title: "결과 확인", text: "트리 보기에서 중첩 구조를 확인하거나 편집 보기에서 결과를 복사합니다." },
        ] },
        { type: "example", title: "정리와 압축 예시", intro: "두 결과는 공백 표현만 다르고 같은 데이터를 나타냅니다.", items: [
          { label: "정리된 JSON", value: "{\n  \"name\": \"Konly\",\n  \"active\": true\n}" },
          { label: "압축된 JSON", value: "{\"name\":\"Konly\",\"active\":true}" },
        ] },
        { type: "list", title: "문법과 제한사항", intro: "오류가 발생하면 다음 항목을 먼저 확인하세요.", items: [
          { title: "작은따옴표와 키 따옴표", text: "JSON은 문자열과 객체 키에 큰따옴표를 사용합니다. {'name':'Kim'}은 올바른 JSON이 아닙니다." },
          { title: "마지막 쉼표", text: "배열이나 객체의 마지막 항목 뒤에는 쉼표를 둘 수 없습니다." },
          { title: "주석과 특수 숫자", text: "표준 JSON은 주석, NaN, Infinity, undefined를 지원하지 않습니다." },
          { title: "큰 문서", text: "매우 큰 JSON은 브라우저 메모리와 트리 렌더링 속도에 영향을 줄 수 있습니다." },
        ] },
      ],
      privacy: { title: "입력한 JSON은 브라우저에서 처리됩니다", description: "정리, 압축, 트리 변환은 현재 브라우저에서 실행됩니다. 입력 내용은 이 사이트의 서버로 전송하거나 저장하지 않습니다." },
      faqs: { title: "자주 묻는 질문", items: [
        { question: "Format과 Minify는 데이터 값을 바꾸나요?", answer: "아니요. 올바른 JSON이라면 객체와 배열의 값을 유지하고 문자열 밖의 공백 표현만 바꿉니다." },
        { question: "JavaScript 객체를 그대로 넣어도 되나요?", answer: "객체 키나 문자열에 작은따옴표를 사용한 JavaScript 문법은 JSON이 아닙니다. 먼저 표준 JSON 문법으로 바꿔야 합니다." },
        { question: "오류 위치는 무엇을 의미하나요?", answer: "브라우저가 JSON 해석을 멈춘 문자 위치입니다. 해당 위치 앞뒤의 따옴표, 쉼표, 괄호를 확인하세요." },
      ] }, relatedTitle: "관련 개발 도구", popularTitle: "다른 인기 도구",
    },
    "/tools/image-compressor": {
      sections: [
        { type: "text", title: "이미지 압축 도구는 무엇을 하나요?", paragraphs: ["JPG, PNG, WebP 이미지의 품질, 출력 형식 또는 최대 가로 크기를 조절해 파일 용량을 줄입니다. 원본과 결과 용량을 비교한 뒤 원하는 결과만 다운로드할 수 있습니다."] },
        { type: "steps", title: "사용 방법", items: [
          { title: "이미지 선택", text: "한 장을 처리하거나 여러 장 탭에서 최대 50장을 선택합니다." },
          { title: "압축 기준 선택", text: "화질을 직접 정하거나 목표 KB를 선택합니다. 필요하면 출력 형식과 최대 가로 크기도 변경합니다." },
          { title: "결과 비교 및 저장", text: "미리보기와 실제 결과 용량을 확인한 뒤 단일 이미지 또는 ZIP으로 저장합니다." },
        ] },
        { type: "example", title: "설정 예시", items: [
          { label: "웹 게시용 사진", value: "출력: WebP\n품질: 80%\n최대 가로: 1920px" },
          { label: "업로드 제한 맞추기", value: "압축 방식: 목표 용량\n목표: 200KB\n도달 실패 시 해상도 축소" },
        ] },
        { type: "list", title: "처리 방식과 제한사항", items: [
          { title: "품질과 압축률", text: "품질을 낮출수록 대체로 파일은 작아지지만 글자와 경계가 흐려질 수 있습니다. 사진은 80%부터 비교하는 것이 좋습니다." },
          { title: "목표 KB", text: "브라우저가 여러 품질 값을 시험해 목표 이하에서 가능한 높은 품질을 찾습니다. 해상도가 크면 목표에 도달하지 못할 수 있습니다." },
          { title: "지원 형식", text: "입력은 JPG, PNG, WebP를 지원합니다. PNG는 품질 값만으로 크게 줄지 않을 수 있어 WebP 변환이 유리할 수 있습니다." },
          { title: "파일 한도", text: "파일당 최대 25MB, 2,400만 픽셀, 한 변 12,000px까지 처리합니다. 브라우저가 지원하지 않는 인코더는 사용할 수 없습니다." },
        ] },
      ],
      privacy: { title: "이미지는 브라우저 밖으로 전송되지 않습니다", description: "이미지 디코딩과 압축은 현재 탭의 임시 메모리에서 처리됩니다. 서버나 브라우저 저장소에 원본을 저장하지 않으며, 초기화하거나 탭을 닫으면 임시 데이터를 해제합니다." },
      faqs: { title: "자주 묻는 질문", items: [
        { question: "압축 결과가 원본보다 커질 수 있나요?", answer: "가능합니다. 이미 충분히 압축된 이미지이거나 PNG를 같은 크기로 다시 인코딩하면 커질 수 있으므로 결과 용량을 비교하세요." },
        { question: "목표 용량과 정확히 같은 크기가 되나요?", answer: "항상 같지는 않습니다. 목표 이하에서 가능한 높은 품질을 찾으며, 이미지 내용과 해상도에 따라 목표 도달이 불가능할 수 있습니다." },
        { question: "투명 배경은 유지되나요?", answer: "PNG와 WebP 출력은 투명도를 유지할 수 있지만 JPEG는 투명도를 지원하지 않아 흰색 배경이 적용됩니다." },
      ] }, relatedTitle: "관련 이미지 도구", popularTitle: "다른 인기 도구",
    },
    "/tools/word-counter": {
      sections: [
        { type: "text", title: "글자수 계산기는 무엇을 하나요?", paragraphs: ["입력한 텍스트의 전체 글자, 공백을 제외한 글자, 단어, 줄 수를 실시간으로 계산합니다. 원고 분량 확인, 게시물 길이 제한, 자기소개서와 번역 작업에 활용할 수 있습니다."] },
        { type: "list", title: "계산 기준", items: [
          { title: "전체 글자 수", text: "화면에 하나로 보이는 문자를 한 글자로 계산하며 공백, 탭, 줄바꿈도 포함합니다." },
          { title: "공백 제외 글자 수", text: "스페이스, 탭, 줄바꿈 같은 공백 문자를 제외합니다. 문장부호와 숫자는 포함합니다." },
          { title: "단어 수", text: "지원되는 브라우저에서는 언어별 단어 경계를 사용하고, 지원하지 않으면 공백 기준으로 계산합니다." },
          { title: "줄 수", text: "줄바꿈으로 구분된 줄을 셉니다. 빈 입력은 0줄이며, 입력 끝의 줄바꿈도 줄 구분에 반영됩니다." },
        ] },
        { type: "steps", title: "사용 방법", items: [
          { title: "텍스트 입력", text: "직접 입력하거나 문서의 내용을 붙여 넣습니다." },
          { title: "결과 확인", text: "입력과 동시에 네 가지 계산 결과와 예상 읽기 시간이 갱신됩니다." },
          { title: "결과 활용", text: "필요하면 계산 결과를 복사하고 초기화 버튼으로 입력을 비웁니다." },
        ] },
        { type: "example", title: "계산 예시", intro: "아래 입력은 공백과 줄바꿈도 전체 글자 수에 포함합니다.", items: [
          { label: "입력", value: "안녕하세요.\n반갑습니다!" },
          { label: "활용 사례", value: "게시물 글자 제한 확인\n원고 및 번역 분량 확인\n문서의 줄 수 확인" },
        ] },
      ],
      privacy: { title: "텍스트는 현재 브라우저에서만 계산됩니다", description: "입력한 문장은 서버로 전송하거나 저장하지 않습니다. 페이지를 닫거나 초기화하면 입력 내용은 남지 않습니다." },
      faqs: { title: "자주 묻는 질문", items: [
        { question: "공백 제외 글자 수에서 줄바꿈도 빠지나요?", answer: "네. 스페이스뿐 아니라 탭과 줄바꿈 등 공백으로 분류되는 문자를 제외합니다." },
        { question: "한글의 단어 수는 어떻게 계산하나요?", answer: "브라우저가 언어별 단어 분리를 지원하면 한국어 단어 경계를 사용합니다. 그렇지 않은 환경에서는 공백을 기준으로 셉니다." },
        { question: "예상 읽기 시간은 정확한가요?", answer: "일반적인 읽기 속도를 바탕으로 한 참고값입니다. 문장의 난이도와 독자에 따라 실제 시간은 달라집니다." },
      ] }, relatedTitle: "관련 텍스트 도구", popularTitle: "다른 인기 도구",
    },
  },
  en: {
    "/tools/base64-converter": englishAppendix({
      name: "Base64 Encoder/Decoder", overview: "It converts text to Base64 through an explicit character encoding, or decodes Base64 bytes back into text. This is useful when inspecting encoded API fields, email data, or legacy text payloads.",
      steps: [["Choose a direction", "Use Encode for plain text or Decode for an existing Base64 value."], ["Set the character encoding", "Auto uses UTF-8 for encoding. Select a known legacy encoding when the source requires it."], ["Convert and review", "Run the conversion, check the applied encoding, and copy the result when it looks correct."]],
      examples: [["UTF-8 text", "Hello 안녕하세요 😀\n→ Encode → Decode → original text"], ["Legacy text", "Select EUC-KR or Shift_JIS\nDecode bytes using that character set"]],
      rules: [["Byte-based conversion", "Text is converted to bytes before Base64 is produced; Unicode text is not passed directly to btoa."], ["Loss prevention", "Encoding fails instead of silently replacing characters that the selected character set cannot represent."], ["Auto detection", "Base64 does not store its original character encoding, so a detected decode encoding is an estimate unless a BOM identifies it."]],
      privacy: { title: "Conversion stays in your browser", description: "Text, bytes, and Base64 results are processed locally and are not sent to or stored on this site's server." },
      faqs: [["Is Base64 encryption?", "No. Anyone can decode it, so it must not be used to protect secrets."], ["Why does decoded text look corrupted?", "The bytes were probably decoded with a different character encoding. Select the encoding used by the source."], ["Can I decode Base64 without padding?", "Valid unpadded input is normalized where possible, while malformed Base64 is rejected."]], relatedTitle: "Related encoding tools",
    }),
    "/tools/cron-expression-generator": englishAppendix({
      name: "Cron Expression Generator", overview: "It builds and explains numeric five-field Unix/Vixie Cron expressions, validates an existing expression, and previews upcoming run times in a selected timezone.",
      steps: [["Build or enter an expression", "Choose a schedule in the generator or switch to the parser and enter a five-field expression."], ["Check the explanation", "Review each field and the upcoming run times in the selected browser or named timezone."], ["Verify the target platform", "Copy the expression only after checking the scheduler's timezone and supported Cron syntax."]],
      examples: [["Every day at 09:00", "0 9 * * *"], ["Every 10 minutes on weekdays", "*/10 * * * 1-5"]],
      rules: [["Five fields only", "The supported fields are minute, hour, day of month, month, and day of week; seconds are not supported."], ["Supported operators", "Numeric values can use wildcards, lists, ranges, and steps."], ["Timezone is external", "A Cron string does not contain a timezone. The actual scheduler configuration remains authoritative."]],
      privacy: { title: "Schedules are calculated locally", description: "Expressions, settings, and preview dates are processed in browser memory and are not sent to the server." },
      faqs: [["Does this support a seconds field?", "No. It supports numeric five-field Unix/Vixie Cron expressions."], ["Why does my server run at a different time?", "The server may use UTC or another configured timezone instead of the timezone selected in this preview."], ["Can I paste the result into Vercel Cron unchanged?", "The basic syntax may apply, but you must check Vercel's current frequency and timezone rules before deployment."]], relatedTitle: "Related developer tools",
    }),
    "/tools/excel-chart-maker": englishAppendix({
      name: "Excel & CSV Chart Maker", overview: "It reads spreadsheet or CSV data, lets you choose columns and an aggregation, and renders bar, line, pie, or scatter charts for export as PNG, JPEG, or SVG.",
      steps: [["Open a file", "Choose an XLSX, XLS, or CSV file, then select the sheet and confirm the detected header row."], ["Map the data", "Choose the category or numeric axes, series, aggregation, and chart type."], ["Review and export", "Adjust labels and appearance, verify the preview, and export at the required dimensions."]],
      examples: [["Monthly sales", "X: Month\nY: Sales\nChart: Bar or line"], ["Ad spend vs sales", "X: Ad spend\nY: Sales\nChart: Scatter"]],
      rules: [["Input limits", "Files are limited to 25 MiB, 100,000 rows, and 100 columns."], ["Scatter data", "Each plotted row needs numeric values for both the X and Y axes."], ["Aggregation", "When aggregation is enabled, rows with the same category are combined using the selected calculation."]],
      privacy: { title: "Spreadsheet data stays in the browser", description: "The selected file, cell data, chart rendering, and export are handled locally and are not uploaded to this site's server." },
      faqs: [["Why are CSV characters garbled?", "Save the CSV as UTF-8 and open it again. The tool does not guess every legacy CSV encoding."], ["Are spreadsheet formulas recalculated?", "No. The tool reads values stored in the file and does not run the spreadsheet calculation engine."], ["Why does a pie chart show fewer values?", "Pie charts group values by category and are clearest with a small number of positive categories."]], relatedTitle: "Related data tools",
    }),
    "/tools/favicon-generator": englishAppendix({
      name: "Favicon Generator", overview: "It creates a browser favicon set from text, an emoji, or a PNG, JPEG, or WebP image and packages the common icon files, manifest, and HTML references.",
      steps: [["Choose a source", "Enter short text or an emoji, or upload a nearly square image."], ["Check small previews", "Adjust colors and spacing, then make sure the design remains recognizable at 16px."], ["Download the package", "Generate the ZIP and place its files and HTML references in your site."]],
      examples: [["Text icon", "Source: K\nHigh-contrast background\nShort bold glyph"], ["Logo icon", "Upload square logo\nAdjust crop\nCheck 16px preview"]],
      rules: [["Small-size legibility", "Fine details and long text disappear at favicon sizes, so simple high-contrast artwork works best."], ["Image inputs", "PNG, JPEG, and static WebP images are accepted and rendered into square outputs."], ["Browser caching", "A replaced favicon may not appear immediately because browsers cache icon files aggressively."]],
      privacy: { title: "Source images stay on this device", description: "Rendering and ZIP creation happen in the browser. Uploaded artwork is not sent to or stored on the server." },
      faqs: [["Do I need both ICO and PNG files?", "Modern browsers commonly use PNG, while favicon.ico remains useful for older clients and fallback requests."], ["Why is text hard to read?", "Use fewer characters, a heavier typeface, and stronger foreground/background contrast."], ["Does the package install itself?", "No. Download the ZIP, copy the files into your site, and add the provided links to your document head."]], relatedTitle: "Related image and website tools",
    }),
    "/tools/image-color-picker": englishAppendix({
      name: "Image Color Picker", overview: "It samples an exact image pixel and reports that color as HEX, RGB, HSL, HSV, and CMYK values, with zoom and a pixel grid for precise selection.",
      steps: [["Open an image", "Choose a PNG, JPEG, or static WebP file."], ["Zoom and point", "Move over the image, use the magnified pixel grid, and select the center pixel."], ["Copy a value", "Review the coordinates and copy the color notation needed by your design or code."]],
      examples: [["CSS color", "Pick a logo pixel\nCopy: #2563EB"], ["Design comparison", "Sample the same coordinate\nCompare RGB and HSL values"]],
      rules: [["Pixel coordinates", "Coordinates refer to the original image, even when the preview is scaled to fit the page."], ["Color conversion", "HEX and RGB describe sampled channel values; HSL, HSV, and CMYK are mathematical conversions of the same pixel."], ["Input validation", "The file signature and decoded dimensions are checked; animated WebP is not treated as a frame picker."]],
      privacy: { title: "Images are sampled locally", description: "The image and selected colors stay in browser memory and are not uploaded or saved by this site." },
      faqs: [["Why does the color differ from another app?", "Color profiles, display management, transparency, and rounding can change how converted values are reported."], ["Can I select a precise pixel on mobile?", "Yes. Use zoom and the magnified grid rather than relying only on the scaled preview."], ["Is CMYK read from the image file?", "No. It is a calculated approximation from the sampled RGB pixel, not an embedded print profile value."]], relatedTitle: "Related image tools",
    }),
    "/tools/ip-info": englishAppendix({
      name: "IP Address Lookup", overview: "It shows the current public IP address or looks up a valid public IPv4/IPv6 address, then presents network registration and approximate location data returned by IPWHOIS.IO.",
      steps: [["Use the current address or enter one", "Load the detected public address, or type a public IPv4 or IPv6 address to inspect."], ["Run the lookup", "The browser requests country, region, ISP, organization, ASN, and timezone data from the provider."], ["Interpret cautiously", "Treat location as a network estimate, especially for mobile carriers, VPNs, proxies, and corporate networks."]],
      examples: [["Current connection", "Check public IP\nReview ISP and ASN"], ["Known public address", "Enter: 8.8.8.8\nReview provider response"]],
      rules: [["Public addresses only", "Private, loopback, link-local, documentation, and other non-public address ranges are rejected."], ["Approximate location", "The result describes network routing and registration, not a person's street address or precise position."], ["Provider availability", "Results and rate limits depend on IPWHOIS.IO, so a lookup can fail even when the page itself is available."]],
      privacy: { title: "Lookup requests use IPWHOIS.IO", description: "The queried IP address is sent directly from your browser to IPWHOIS.IO. This site does not store the address or lookup result." },
      faqs: [["Why is the city incorrect?", "IP geolocation is an estimate based on the network and may identify an ISP gateway or regional exit point."], ["Why does a VPN change the result?", "The lookup sees the VPN or proxy exit address rather than the connection behind it."], ["Can this reveal someone's home address?", "No. Public IP data does not reliably identify a precise residence or individual."]], relatedTitle: "Related network and encoding tools",
    }),
    "/tools/jwt-decoder": englishAppendix({
      name: "JWT Decoder", overview: "It separates a compact JWT into its encoded segments, decodes readable Header and Payload JSON, and highlights common time claims such as exp, nbf, and iat.",
      steps: [["Paste a token", "Enter a compact JWS with three segments or an unsecured two-segment JWT."], ["Inspect decoded data", "Review the Header, Payload, token structure, and interpreted time claims."], ["Copy only what you need", "Use the JSON or tree views without treating the decoded token as trusted."]],
      examples: [["Header", "{\"alg\":\"HS256\",\"typ\":\"JWT\"}"], ["Payload", "{\"sub\":\"123\",\"exp\":1893456000}"]],
      rules: [["Decoding is not verification", "The tool does not validate a signature, key, issuer, audience, or authorization policy."], ["Base64URL segments", "JWT segments use URL-safe Base64 and may omit padding."], ["Time claims", "NumericDate claims are displayed for convenience, but the issuing system decides how they are enforced."]],
      privacy: { title: "Tokens are decoded locally", description: "The JWT and decoded values are processed in this browser and are not sent to or stored on the server." },
      faqs: [["Does a readable payload mean the token is valid?", "No. Anyone can construct encoded segments; validity requires signature and claim verification by the receiving system."], ["Can I paste a production access token?", "Avoid exposing active credentials unnecessarily. Decoding is local, but sensitive tokens should still be handled carefully."], ["Why is the signature not decoded as JSON?", "The final segment is cryptographic signature data, not a JSON document."]], relatedTitle: "Related token and encoding tools",
    }),
    "/tools/korean-initial-converter": englishAppendix({
      name: "Korean Initial Consonant Converter", overview: "It extracts the initial consonant from each precomposed Korean syllable while preserving Latin letters, numbers, punctuation, whitespace, and emoji.",
      steps: [["Enter Korean text", "Type or paste a word, sentence, or multiline list."], ["Review the live result", "Each Hangul syllable is replaced by its initial consonant immediately."], ["Copy or reset", "Copy the converted text or clear both input and result."]],
      examples: [["Word", "안녕하세요 → ㅇㄴㅎㅅㅇ"], ["Mixed text", "KONLY 도구 2026 → KONLY ㄷㄱ 2026"]],
      rules: [["Precomposed Hangul", "Modern precomposed syllables in the 가–힣 range are decomposed mathematically."], ["Other characters", "Standalone jamo and non-Hangul characters are preserved rather than guessed or removed."], ["Text structure", "Spaces and line breaks remain in their original positions."]],
      privacy: { title: "Text stays in your browser", description: "Initial-consonant conversion runs locally and does not send or store the input." },
      faqs: [["Why are English letters unchanged?", "The tool converts precomposed Korean syllables only and intentionally preserves other characters."], ["Does it create abbreviations automatically?", "No. It extracts consonants mechanically and does not decide which syllables should form an abbreviation."], ["Are spaces and line breaks removed?", "No. The original whitespace is preserved."]], relatedTitle: "Related text tools",
    }),
    "/tools/password-generator": englishAppendix({
      name: "Password Generator", overview: "It creates a random character password from selected character groups or a word-based passphrase, then estimates strength from the generated result and settings.",
      steps: [["Choose a mode", "Use a character password or switch to a passphrase built from words."], ["Set the options", "Choose length and character groups, or configure the passphrase word count and separators."], ["Generate and copy", "Generate a new result, review the strength indicator, and copy it to the intended password field."]],
      examples: [["Character password", "Length: 20\nUppercase + lowercase + numbers + symbols"], ["Passphrase", "Multiple random words\nCustom separator\nOptional capitalization"]],
      rules: [["Secure randomness", "Generation uses the browser's cryptographic random-number API rather than Math.random."], ["Character coverage", "When possible, the result includes at least one character from every enabled group."], ["Strength indicator", "The label is an estimate and cannot account for reuse, phishing, leaks, or how a service stores passwords."]],
      privacy: { title: "Passwords are generated locally", description: "Settings and generated values stay in the browser and are not sent to or stored on this site's server." },
      faqs: [["What happens if every character group is disabled?", "Generation is blocked until at least one character group is enabled."], ["Is a longer password always better?", "Length usually increases resistance to guessing, provided the value is random and not reused."], ["Should I save the generated password in this page?", "No. Store it in a trusted password manager; this tool does not provide an account vault."]], relatedTitle: "Related security tools",
    }),
    "/tools/privacy-redactor": englishAppendix({
      name: "Image Privacy Masking", overview: "It lets you draw and adjust regions over a PNG, JPEG, or static WebP image, cover them with an opaque block or pixelation, and export a new PNG.",
      steps: [["Open and inspect the image", "Choose an image and identify every name, number, face, or area that should not be shared."], ["Add masking regions", "Draw regions, move or resize them, and choose an opaque fill or pixelation."], ["Review the final image", "Use the result preview, confirm every sensitive area is covered, and download the generated PNG."]],
      examples: [["Message screenshot", "Cover names, profile photos, phone numbers, and message details"], ["Document photo", "Cover identification numbers, addresses, signatures, and faces"]],
      rules: [["Manual selection", "The current tool does not promise automatic OCR or face detection; the user must identify and verify sensitive areas."], ["Opaque masking is safer", "A solid opaque block is recommended for sensitive data because pixelation can sometimes leave recognizable structure."], ["New PNG output", "The exported image is rendered as a new PNG and does not retain the original image's EXIF metadata."]],
      privacy: { title: "Images are edited locally", description: "The source image and masking regions remain in browser memory and are not uploaded or saved by this site." },
      faqs: [["Does the tool find personal information automatically?", "No. Add and verify every region manually before sharing the result."], ["Can pixelation be reversed?", "It can preserve clues from the original pattern. Use a fully opaque fill when the information is sensitive."], ["Does hiding a region alter my original file?", "No. The original file is unchanged; downloading creates a separate PNG result."]], relatedTitle: "Related screenshot and image tools",
    }),
    "/tools/qr-code-generator": englishAppendix({
      name: "QR Code Generator", overview: "It encodes text, URLs, Wi-Fi settings, contact details, email, phone, SMS, or location data into a QR code with selectable size, error correction, margin, and colors.",
      steps: [["Choose the content type", "Enter plain text or complete the fields for a supported structured QR type."], ["Adjust QR options", "Choose a size, L/M/Q/H error-correction level, quiet-zone margin, and readable colors."], ["Scan before downloading", "Verify the preview with a scanner, then download the PNG or copy the original input where available."]],
      examples: [["Website", "https://example.com\n256px · M · margin 4"], ["Printed code", "512px or larger\nHigh contrast\nAdequate quiet zone"]],
      rules: [["Exact input", "Plain text and URLs are encoded as entered; the tool does not automatically normalize example.com into a different URL."], ["Density", "Longer data and higher error correction create denser symbols, which may need a larger output size."], ["Contrast and margin", "Low contrast, very small modules, or an inadequate quiet zone can reduce scan reliability."]],
      privacy: { title: "QR content stays in the browser", description: "The entered content and generated QR image are processed locally and are not sent to an external QR service or stored by this site." },
      faqs: [["What do L, M, Q, and H mean?", "They select increasing error-correction levels. More correction can tolerate more damage but also increases QR density."], ["Why will my QR code not scan?", "Try a larger size, stronger foreground/background contrast, a sufficient margin, and less content."], ["Does the tool shorten URLs?", "No. It encodes the exact URL entered and does not call a URL-shortening service."]], relatedTitle: "Related generator and image tools",
    }),
    "/tools/regex-tester": englishAppendix({
      name: "Regex Tester", overview: "It runs JavaScript regular expressions against test text, shows matches and capture groups, previews replacements, and supports checking multiple test rows. The existing syntax reference remains the detailed guide for supported constructs.",
      steps: [["Enter a pattern and flags", "Use JavaScript regular-expression syntax without surrounding slash delimiters."], ["Add test text", "Run the pattern against the main text and inspect highlighted matches and captures."], ["Check replacement or batch cases", "Preview replacement output or add rows to compare which samples match."]],
      examples: [["Capture a date", "Pattern: (?<year>\\d{4})-(\\d{2})-(\\d{2})\nFlags: g"], ["Normalize whitespace", "Pattern: \\s+\nReplacement: single space"]],
      rules: [["JavaScript behavior", "Syntax and flags follow the JavaScript RegExp engine, not PCRE, Python, or .NET."], ["Execution safeguards", "Pattern, text, matches, detail, highlighting, and replacement output are capped to keep the page responsive."], ["Global flag", "Without g, JavaScript reports the first match; with g, matching continues until the configured safety limit."]],
      privacy: { title: "Patterns and test data remain local", description: "Regex execution runs inside a browser Worker. Patterns, test strings, and replacements are not uploaded or stored." },
      faqs: [["Should I include /pattern/ delimiters?", "No. Enter only the pattern and select flags separately."], ["Why does a PCRE expression fail?", "JavaScript supports a different feature set and syntax from PCRE and other regex engines."], ["Can a regular expression freeze the page?", "Some patterns are computationally expensive. The tool uses a Worker and limits, but patterns should still be tested with realistic input."]], relatedTitle: "Related text and developer tools",
    }),
    "/tools/screenshot-statusbar-remover": englishAppendix({
      name: "Screenshot Status Bar Remover", overview: "It estimates the top status-bar boundary in a phone screenshot, lets you correct the crop manually, and exports a new image without that top strip.",
      steps: [["Open a screenshot", "Choose a supported phone screenshot and wait for the proposed top crop."], ["Verify the boundary", "Compare the preview and adjust the crop line if automatic detection includes app content or leaves status icons."], ["Create and download", "Generate the cropped result and save the new image after checking its dimensions."]],
      examples: [["Phone screenshot", "Remove time, signal, Wi-Fi, and battery strip"], ["Unusual layout", "Detection uncertain\nSet the top crop manually"]],
      rules: [["Heuristic detection", "The boundary is estimated from visual changes near the top; it is not device-model recognition."], ["Manual review", "Full-screen apps, solid backgrounds, notches, and edited screenshots can make the estimate uncertain."], ["Top crop only", "The tool removes a horizontal area from the top and does not automatically hide other private information."]],
      privacy: { title: "Screenshots stay on this device", description: "Detection, cropping, and export run in the browser. Images are not uploaded or stored by this site." },
      faqs: [["Why was part of the app header removed?", "The status bar and app header may have similar colors. Move the crop boundary before exporting."], ["Can it remove a bottom navigation bar?", "No. This tool is designed for a top status-bar crop only."], ["Does it erase other personal information?", "No. Use Image Privacy Masking to cover names, messages, numbers, or faces."]], relatedTitle: "Related screenshot tools",
    }),
    "/tools/screenshot-stitcher": englishAppendix({
      name: "Screenshot Stitcher", overview: "It compares consecutive screenshots for overlapping rows, removes the repeated area, and combines them vertically into one long PNG with manual controls for uncertain joins.",
      steps: [["Add screenshots in order", "Select consecutive captures in top-to-bottom reading order."], ["Review every join", "Check overlap confidence and adjust exclusions or overlap values where repeated UI confuses detection."], ["Build the result", "Create the combined preview, inspect each seam, and download the final PNG."]],
      examples: [["Long conversation", "Capture while scrolling\nKeep a visible overlap\nCombine in order"], ["Page with fixed header", "Exclude repeated header rows before confirming the join"]],
      rules: [["Overlap required", "Automatic joining needs a sufficiently distinctive repeated area between neighboring images."], ["Same-width images", "Consistent capture width and scale produce more reliable comparisons and a cleaner output."], ["Ambiguous screens", "Flat backgrounds, repeated lists, animations, and sticky UI can require manual adjustment."]],
      privacy: { title: "Screenshots are processed locally", description: "Source images, overlap analysis, and the combined PNG stay in the browser and are not uploaded or saved by this site." },
      faqs: [["Why was an overlap not detected?", "The shared area may be too small, too uniform, animated, or different between captures. Adjust the join manually."], ["Why is a header repeated?", "Exclude the fixed header from the relevant edge before rebuilding the result."], ["Are the original screenshots modified?", "No. The tool creates a separate combined PNG."]], relatedTitle: "Related screenshot and image tools",
    }),
    "/tools/sql-formatter": englishAppendix({
      name: "SQL Formatter", overview: "It formats or minifies SQL using the selected database dialect, with indentation, keyword case, tab width, comma style, and placeholder controls.",
      steps: [["Choose a SQL dialect", "Select MySQL, PostgreSQL, SQL Server, Oracle, SQLite, or the closest supported syntax."], ["Set formatting options", "Choose indentation, keyword case, comma style, and placeholder handling."], ["Format, review, and copy", "Check that database-specific syntax is preserved before using the result in your editor or migration."]],
      examples: [["Readable query", "SELECT id, name\nFROM users\nWHERE active = 1;"], ["Compact query", "SELECT id,name FROM users WHERE active=1;"]],
      rules: [["Formatting is not validation", "A formatted query can still contain invalid SQL, missing objects, or logic errors."], ["Dialect matters", "Quoting, operators, clauses, and placeholders differ by database, so choose the intended dialect."], ["Comments and literals", "The formatter aims to preserve their content, but important production queries should be compared before execution."]],
      privacy: { title: "SQL stays in your browser", description: "Formatting and minification run locally. Queries are not executed, sent to a database, or stored by this site." },
      faqs: [["Does this run my SQL?", "No. It only transforms text and never connects to a database."], ["Can formatting change query behavior?", "It is designed to preserve semantics, but vendor-specific syntax should always be reviewed before execution."], ["Which dialect should I choose?", "Select the database that will execute the query; use the closest option only when its syntax is compatible."]], relatedTitle: "Related data and developer tools",
    }),
    "/tools/text-cleaner": englishAppendix({
      name: "Text Cleaner", overview: "It applies selected cleanup steps to multiline text, including whitespace normalization, blank-line handling, line trimming, sorting, and duplicate-line filtering.",
      steps: [["Paste the source text", "Enter the list, copied document, or multiline content you want to clean."], ["Choose cleanup rules", "Enable only the whitespace, blank-line, duplicate, sort, or filtering operations you need."], ["Review and copy", "Compare counts and output, then copy the cleaned result."]],
      examples: [["Remove duplicate lines", "Apple\nApple \nBanana\n→ Apple\nBanana"], ["Normalize copied text", "Trim line edges\nCollapse repeated spaces\nLimit blank lines"]],
      rules: [["Order of operations", "Cleanup follows the tool's displayed pipeline, so sorting and duplicate handling can affect the final line order."], ["Duplicate comparison", "Case sensitivity and whitespace normalization influence whether two lines are considered equal."], ["No language rewriting", "The tool changes selected structure and spacing; it does not paraphrase, translate, or correct grammar."]],
      privacy: { title: "Text is cleaned locally", description: "The source, settings, and result remain in browser memory and are not sent to or stored on the server." },
      faqs: [["Why were two similar lines not merged?", "Their case or remaining whitespace may differ under the selected comparison settings."], ["Does sorting change duplicate results?", "It can change output order, while duplicate detection follows the configured pipeline and comparison rules."], ["Can I undo a cleanup?", "Keep the original input until you have checked the result; copied or replaced source text cannot be recovered by the site."]], relatedTitle: "Related text tools",
    }),
    "/tools/url-encoder-decoder": englishAppendix({
      name: "URL Encoder/Decoder", overview: "It applies UTF-8 percent encoding to either a complete URL or an individual URL component, and decodes valid percent-encoded text without treating plus signs as spaces by default.",
      steps: [["Choose Encode or Decode", "Select the direction based on whether the input is plain Unicode text or percent-encoded text."], ["Choose the encoding scope", "Use URL Component for parameter values, or Full URL when URL structure characters should remain readable."], ["Convert and copy", "Run the operation, review reserved characters, and copy the result."]],
      examples: [["Query value", "안녕하세요 world & test=true\nUse: URL Component"], ["Complete URL", "https://example.com/search?q=안녕하세요&sort=new\nUse: Full URL"]],
      rules: [["UTF-8 bytes", "Unicode characters are converted to UTF-8 percent-encoded byte sequences."], ["Reserved characters", "Full URL mode preserves URL structure in the same manner as encodeURI; component mode encodes separators such as &, =, ?, and /."], ["Plus signs", "Normal decode preserves + as a plus. Query-string handling is a separate form-encoding behavior."]],
      privacy: { title: "URL text stays in the browser", description: "Encoding, decoding, and query editing run locally. The entered URL is not requested, visited, or stored by this site." },
      faqs: [["Which mode should I use for a query parameter value?", "Use URL Component so separators inside the value cannot be confused with URL structure."], ["Why did decoding fail on % or %ZZ?", "Every percent escape must contain exactly two hexadecimal digits and form valid UTF-8 when decoded."], ["Does + become a space?", "Not in normal URL Decode mode. Use query-string behavior only when the source follows application/x-www-form-urlencoded rules."]], relatedTitle: "Related encoding tools",
    }),
    "/tools/youtube-thumbnail-downloader": englishAppendix({
      name: "YouTube Thumbnail Downloader", overview: "It extracts a video ID from supported YouTube watch, share, Shorts, embed, live, and mobile URLs, checks which standard thumbnail variants are available, and downloads a verified image.",
      steps: [["Paste a YouTube address", "Use the address copied from the browser or the YouTube share menu."], ["Check available thumbnails", "The browser requests standard thumbnail URLs and shows only image variants that respond successfully."], ["Choose and download", "Compare the actual dimensions and download the available JPEG you need."]],
      examples: [["Share URL", "https://youtu.be/VIDEO_ID"], ["Shorts URL", "https://www.youtube.com/shorts/VIDEO_ID"]],
      rules: [["Supported addresses", "The input must resolve to a recognizable YouTube video ID; arbitrary websites and channel or playlist-only URLs are not treated as videos."], ["Maximum resolution", "maxresdefault is shown only when YouTube provides it for that video. Upload history and processing affect availability."], ["Image rights", "Availability does not grant reuse permission. Follow the creator's rights and YouTube's applicable terms."]],
      privacy: { title: "Thumbnail checks contact YouTube", description: "The pasted address is parsed locally, but thumbnail availability and downloads make requests from your browser to YouTube's i.ytimg.com image servers. This site does not store the address or images." },
      faqs: [["Why is the highest-resolution thumbnail missing?", "YouTube does not generate every variant for every video, and a recent upload may still be processing."], ["Can I use a channel or playlist URL?", "No. Provide an address that contains a specific video ID."], ["Why can I preview an image but not reuse it freely?", "Technical access and copyright permission are different; obtain the necessary rights before publishing it."]], relatedTitle: "Related image tools",
    }),
    "/tools/json-formatter": {
      sections: [
        { type: "text", title: "What does the JSON Formatter do?", paragraphs: ["It validates JSON syntax and converts valid data into an indented format for reading or a compact format without unnecessary whitespace. Use it to inspect API responses and clean up configuration files."] },
        { type: "steps", title: "How to use it", items: [
          { title: "Enter JSON", text: "Paste JSON into the input. Object keys and strings must use double quotes." },
          { title: "Format or minify", text: "Format applies two-space indentation. Minify removes unnecessary whitespace outside strings." },
          { title: "Review the result", text: "Inspect nested data in Tree view, or copy the result from Edit view." },
        ] },
        { type: "example", title: "Format and minify example", intro: "Both results contain the same data; only their whitespace differs.", items: [
          { label: "Formatted JSON", value: "{\n  \"name\": \"Konly\",\n  \"active\": true\n}" },
          { label: "Minified JSON", value: "{\"name\":\"Konly\",\"active\":true}" },
        ] },
        { type: "list", title: "Syntax and limitations", intro: "Check these common causes when parsing fails.", items: [
          { title: "Quotes around keys and strings", text: "JSON requires double quotes. {'name':'Kim'} is a JavaScript-style object, not valid JSON." },
          { title: "Trailing commas", text: "A comma cannot follow the final item in an object or array." },
          { title: "Comments and special values", text: "Standard JSON does not support comments, NaN, Infinity, or undefined." },
          { title: "Large documents", text: "Very large JSON documents can use significant browser memory and slow down Tree view." },
        ] },
      ],
      privacy: { title: "Your JSON is processed in the browser", description: "Formatting, minification, and tree conversion run in your current browser. The input is not sent to or stored on this site's server." },
      faqs: { title: "Frequently asked questions", items: [
        { question: "Do Format and Minify change data values?", answer: "No. For valid JSON, object and array values remain unchanged; only whitespace outside strings is changed." },
        { question: "Can I paste a JavaScript object directly?", answer: "JavaScript syntax using unquoted keys or single-quoted strings is not JSON. Convert it to standard JSON first." },
        { question: "What does the error position mean?", answer: "It is where the browser stopped parsing. Check nearby quotes, commas, braces, and brackets." },
      ] }, relatedTitle: "Related developer tools", popularTitle: "Other popular tools",
    },
    "/tools/image-compressor": {
      sections: [
        { type: "text", title: "What does the image compressor do?", paragraphs: ["It reduces JPG, PNG, and WebP file size by adjusting quality, output format, or maximum width. Compare the original and result before downloading only the version you need."] },
        { type: "steps", title: "How to use it", items: [
          { title: "Choose images", text: "Process one image, or select up to 50 in the batch tab." },
          { title: "Choose a compression target", text: "Set quality directly or choose a target file size. You can also change the output format and maximum width." },
          { title: "Compare and save", text: "Review the preview and actual file size, then save one image or a ZIP archive." },
        ] },
        { type: "example", title: "Example settings", items: [
          { label: "Photo for the web", value: "Output: WebP\nQuality: 80%\nMaximum width: 1920px" },
          { label: "Meet an upload limit", value: "Mode: Target file size\nTarget: 200KB\nReduce dimensions if needed" },
        ] },
        { type: "list", title: "Processing and limitations", items: [
          { title: "Quality and file size", text: "Lower quality generally means a smaller file, but text and edges may blur. For photos, start around 80% and compare." },
          { title: "Target KB", text: "The browser tries multiple quality values to find the highest quality under the target. Large dimensions can make the target unreachable." },
          { title: "Supported formats", text: "JPG, PNG, and WebP inputs are supported. PNG may not shrink much through quality alone, so WebP can be a better choice." },
          { title: "File limits", text: "Each file can be up to 25MB, 24 million pixels, and 12,000px on either side. Output encoders depend on browser support." },
        ] },
      ],
      privacy: { title: "Images stay inside your browser", description: "Decoding and compression use temporary memory in the current tab. Originals are not saved to the server or browser storage, and temporary data is released when you reset or close the tab." },
      faqs: { title: "Frequently asked questions", items: [
        { question: "Can the result be larger than the original?", answer: "Yes. A file that is already compressed, or a re-encoded PNG at the same dimensions, can become larger. Always compare the result size." },
        { question: "Will the result match the target size exactly?", answer: "Not always. The tool finds the highest available quality below the target, and some images cannot reach it without reducing dimensions." },
        { question: "Is transparency preserved?", answer: "PNG and WebP can preserve transparency. JPEG cannot, so transparent areas are placed on a white background." },
      ] }, relatedTitle: "Related image tools", popularTitle: "Other popular tools",
    },
    "/tools/word-counter": {
      sections: [
        { type: "text", title: "What does the Word Counter do?", paragraphs: ["It counts all characters, non-whitespace characters, words, and lines as you type. Use it for post limits, manuscript length, application forms, and translation work."] },
        { type: "list", title: "Counting rules", items: [
          { title: "All characters", text: "A user-perceived character counts as one. Spaces, tabs, and line breaks are included." },
          { title: "Without whitespace", text: "Spaces, tabs, and line breaks are excluded. Punctuation and numbers remain included." },
          { title: "Words", text: "Supported browsers use language-aware word boundaries. Other browsers fall back to splitting on whitespace." },
          { title: "Lines", text: "Lines are separated by line breaks. Empty input has zero lines, and a final line break affects the count." },
        ] },
        { type: "steps", title: "How to use it", items: [
          { title: "Enter text", text: "Type directly or paste text from a document." },
          { title: "Read the results", text: "The four counts and estimated reading time update immediately." },
          { title: "Use or reset", text: "Copy the count summary if needed, or clear the input with Reset." },
        ] },
        { type: "example", title: "Counting example", intro: "Spaces and line breaks in this input are included in the total character count.", items: [
          { label: "Input", value: "Hello.\nNice to meet you!" },
          { label: "Common uses", value: "Check a post limit\nMeasure manuscript length\nCount document lines" },
        ] },
      ],
      privacy: { title: "Text is counted in your browser", description: "Your text is not sent to or stored on a server. It is removed when you reset the tool or close the page." },
      faqs: { title: "Frequently asked questions", items: [
        { question: "Are line breaks excluded from the non-whitespace count?", answer: "Yes. Spaces, tabs, line breaks, and other whitespace characters are excluded." },
        { question: "How are words in Korean and other languages counted?", answer: "When available, the browser's language-aware word segmentation is used. Otherwise, words are separated by whitespace." },
        { question: "Is the estimated reading time exact?", answer: "No. It is a reference based on a typical reading speed; actual time varies by reader and text difficulty." },
      ] }, relatedTitle: "Related text tools", popularTitle: "Other popular tools",
    },
  },
  ja: {
    "/tools/json-formatter": {
      sections: [
        { type: "text", title: "JSONフォーマッターでできること", paragraphs: ["JSONの構文を検証し、データを変更せずに読みやすいインデント形式、または不要な空白を除いた圧縮形式へ変換します。APIレスポンスや設定ファイルの確認に利用できます。"] },
        { type: "steps", title: "使い方", items: [
          { title: "JSONを入力", text: "入力欄にJSONを貼り付けます。キーと文字列にはダブルクォートが必要です。" },
          { title: "整形または圧縮", text: "Formatは2スペースでインデントし、Minifyは文字列外の不要な空白を削除します。" },
          { title: "結果を確認", text: "ツリー表示で階層を確認するか、編集表示から結果をコピーします。" },
        ] },
        { type: "example", title: "整形と圧縮の例", intro: "空白表現は異なりますが、どちらも同じデータです。", items: [
          { label: "整形済みJSON", value: "{\n  \"name\": \"Konly\",\n  \"active\": true\n}" },
          { label: "圧縮済みJSON", value: "{\"name\":\"Konly\",\"active\":true}" },
        ] },
        { type: "list", title: "構文と制限", intro: "エラー時は次の点を確認してください。", items: [
          { title: "キーと文字列の引用符", text: "JSONではダブルクォートを使います。{'name':'Kim'}は有効なJSONではありません。" },
          { title: "末尾のカンマ", text: "オブジェクトや配列の最後の項目の後にはカンマを置けません。" },
          { title: "コメントと特殊な値", text: "標準JSONはコメント、NaN、Infinity、undefinedに対応しません。" },
          { title: "大きな文書", text: "非常に大きなJSONはブラウザのメモリを使い、ツリー表示が遅くなる場合があります。" },
        ] },
      ],
      privacy: { title: "JSONはブラウザ内で処理されます", description: "整形、圧縮、ツリー変換は現在のブラウザで実行されます。入力内容をこのサイトのサーバーへ送信・保存しません。" },
      faqs: { title: "よくある質問", items: [
        { question: "FormatとMinifyで値は変わりますか？", answer: "いいえ。有効なJSONではオブジェクトや配列の値を維持し、文字列外の空白だけを変更します。" },
        { question: "JavaScriptオブジェクトをそのまま貼れますか？", answer: "引用符のないキーやシングルクォートを使うJavaScript構文はJSONではありません。標準JSONへ変換してください。" },
        { question: "エラー位置とは何ですか？", answer: "ブラウザが解析を停止した文字位置です。前後の引用符、カンマ、括弧を確認してください。" },
      ] }, relatedTitle: "関連する開発ツール", popularTitle: "その他の人気ツール",
    },
    "/tools/image-compressor": {
      sections: [
        { type: "text", title: "画像圧縮ツールでできること", paragraphs: ["JPG、PNG、WebPの品質、出力形式、最大幅を調整してファイルサイズを小さくします。元画像と結果を比較してから必要な画像だけを保存できます。"] },
        { type: "steps", title: "使い方", items: [
          { title: "画像を選択", text: "1枚を処理するか、複数画像タブで最大50枚を選択します。" },
          { title: "圧縮基準を選択", text: "品質を指定するか目標KBを選び、必要に応じて出力形式と最大幅を変更します。" },
          { title: "比較して保存", text: "プレビューと実際の容量を確認し、画像またはZIPを保存します。" },
        ] },
        { type: "example", title: "設定例", items: [
          { label: "Web掲載用の写真", value: "出力: WebP\n品質: 80%\n最大幅: 1920px" },
          { label: "アップロード上限に合わせる", value: "方式: 目標容量\n目標: 200KB\n必要なら解像度を縮小" },
        ] },
        { type: "list", title: "処理方法と制限", items: [
          { title: "品質と圧縮率", text: "品質を下げると通常は小さくなりますが、文字や輪郭がぼやける場合があります。写真は80%前後から比較してください。" },
          { title: "目標KB", text: "複数の品質を試し、目標以下で最も高い品質を探します。解像度が大きいと目標に届かない場合があります。" },
          { title: "対応形式", text: "JPG、PNG、WebPに対応します。PNGは品質だけでは縮みにくく、WebP変換が有効な場合があります。" },
          { title: "ファイル上限", text: "1ファイル25MB、2400万画素、一辺12,000pxまでです。出力形式はブラウザのエンコーダー対応状況に依存します。" },
        ] },
      ],
      privacy: { title: "画像はブラウザ外へ送信されません", description: "画像の読み込みと圧縮は現在のタブの一時メモリで行います。サーバーやブラウザ保存領域に元画像を保存せず、リセットまたはタブを閉じると一時データを解放します。" },
      faqs: { title: "よくある質問", items: [
        { question: "結果が元画像より大きくなることはありますか？", answer: "あります。すでに圧縮済みの画像や同じサイズで再変換したPNGは大きくなる場合があるため、結果容量を比較してください。" },
        { question: "目標容量と完全に同じになりますか？", answer: "常に一致するわけではありません。目標以下で可能な限り高い品質を探しますが、解像度を下げないと届かない場合があります。" },
        { question: "透明背景は維持されますか？", answer: "PNGとWebPは透明度を維持できます。JPEGは透明度に対応しないため白い背景になります。" },
      ] }, relatedTitle: "関連する画像ツール", popularTitle: "その他の人気ツール",
    },
    "/tools/word-counter": {
      sections: [
        { type: "text", title: "文字数カウンターでできること", paragraphs: ["入力中に全文字数、空白を除く文字数、単語数、行数を計算します。投稿の文字制限、原稿量、応募書類、翻訳作業の確認に利用できます。"] },
        { type: "list", title: "カウント基準", items: [
          { title: "全文字数", text: "画面上で1文字に見える単位を1文字として数え、スペース、タブ、改行も含めます。" },
          { title: "空白を除く文字数", text: "スペース、タブ、改行などの空白文字を除外し、句読点と数字は含めます。" },
          { title: "単語数", text: "対応ブラウザでは言語別の単語境界を使い、それ以外では空白を基準に分割します。" },
          { title: "行数", text: "改行で区切られた行を数えます。空入力は0行で、末尾の改行も行区切りに反映されます。" },
        ] },
        { type: "steps", title: "使い方", items: [
          { title: "テキストを入力", text: "直接入力するか、文書から貼り付けます。" },
          { title: "結果を確認", text: "4つのカウントと推定読了時間が即座に更新されます。" },
          { title: "利用またはリセット", text: "必要なら結果をコピーし、リセットで入力を消去します。" },
        ] },
        { type: "example", title: "カウント例", intro: "この入力のスペースと改行も全文字数に含まれます。", items: [
          { label: "入力", value: "こんにちは。\nはじめまして！" },
          { label: "活用例", value: "投稿の文字制限確認\n原稿・翻訳量の確認\n文書の行数確認" },
        ] },
      ],
      privacy: { title: "テキストはブラウザ内で計算されます", description: "入力した文章をサーバーへ送信・保存しません。リセットまたはページを閉じると入力内容は残りません。" },
      faqs: { title: "よくある質問", items: [
        { question: "空白除外では改行も除かれますか？", answer: "はい。スペース、タブ、改行など空白に分類される文字を除外します。" },
        { question: "日本語や韓国語の単語数はどう数えますか？", answer: "利用可能な場合はブラウザの言語別単語分割を使い、それ以外では空白を基準にします。" },
        { question: "推定読了時間は正確ですか？", answer: "一般的な読書速度を使った参考値です。文章の難易度や読者によって実際の時間は異なります。" },
      ] }, relatedTitle: "関連するテキストツール", popularTitle: "その他の人気ツール",
    },
  },
};
