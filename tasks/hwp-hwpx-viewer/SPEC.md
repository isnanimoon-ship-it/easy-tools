# 한글 문서 뷰어 / HWP·HWPX Viewer SPEC

## 문서 상태

- 상태: `NEEDS HUMAN REVIEW`
- 작성일: 2026-09-12
- 예정 URL: `/{locale}/tools/hwp-hwpx-viewer`
- 지원 locale: `ko`, `en`, `ja`
- 카테고리: 파일·데이터
- 우선순위: P1 신규 도구
- 유일한 구현 기준: 이 문서
- 현재 단계: Product Owner SPEC 및 Architect 사전 검토 완료
- 구현 상태: 브라우저 뷰어 구현 및 자동 회귀 완료. 필수 호환성 fixture 일부가 확보되지 않아 최종 PASS 보류

## 1. 목적과 성공 정의

사용자가 한컴오피스를 설치하지 않은 환경에서도 `.hwpx` 또는 지원 가능한 `.hwp` 문서를 서버에 업로드하지 않고 브라우저에서 **읽기 전용으로 확인**하게 한다. 이 도구는 한컴오피스를 대체하는 편집기가 아니며, 원본 레이아웃을 100% 재현한다고 주장하지 않는다.

V1의 성공은 다음을 모두 의미한다.

1. 지원되는 HWPX 문서에서 본문, 기본 문단 서식, 표와 일반 래스터 이미지를 읽을 수 있다.
2. 지원되는 HWP 5.x 문서에서 본문과 구현 검증을 통과한 기본 요소를 읽을 수 있다.
3. 형식별 지원 수준과 알려진 제한을 파일을 열기 전에 사용자가 확인한다.
4. 표시하지 못한 요소가 감지되면 누락 가능성을 결과 화면에서 숨기지 않는다.
5. 문서 파일과 추출된 내용은 서버, 외부 변환 API, 저장소 또는 분석 도구로 전송되지 않는다.
6. 손상·암호화·배포용·구버전 파일이 앱을 깨뜨리지 않고 이해하기 쉬운 오류로 종료된다.

## 2. Product Owner 범위 결정

### Must Have — V1

- `.hwpx` 읽기 전용 열람
- `.hwp` 5.x 읽기 전용 열람과 화면 내 `제한적 지원` 표시
- 파일 선택 및 Drag & Drop
- 파일 확장자, MIME, signature와 실제 파싱 결과를 조합한 형식 검증
- 파일명, 형식, 용량 표시
- **열기 전 지원 범위 확인 단계**
- 문서 본문, 문단 구분, 줄바꿈과 기본 문자 스타일 표시
- 구현 라이브러리가 안정적으로 제공하는 표·삽입 이미지 표시
- 문서 페이지 또는 연속 문서 형태의 읽기 화면
- 확대·축소, 페이지 이동 또는 문서 위치 이동
- 문서 내 텍스트 검색과 일치 개수·다음/이전 이동
- 지원되지 않거나 생략된 요소에 대한 결과 경고
- 초기화 및 다른 파일 열기
- 로딩, 처리 진행, 성공, 부분 지원, 오류 상태
- 서버 전송 및 브라우저 임시 처리 안내
- ko/en/ja UI, metadata, 메뉴, 홈 카드, sitemap과 상세 콘텐츠
- 키보드 접근, 스크린리더 상태 안내, 모바일 반응형
- light/dark theme에서 문서 가독성 유지

### Should Have — V1 안정화 후 별도 승인

- 페이지 썸네일 탐색
- 목차가 있는 문서의 목차 탐색
- 텍스트 선택 및 복사
- 문서 전체 텍스트만 보는 보조 보기
- 지원하지 못한 요소의 종류별 진단 요약
- 렌더링 작업의 Web Worker 분리

### Could Have — 별도 SPEC

- PDF 내보내기
- 인쇄 전용 레이아웃
- `.hwp`를 `.hwpx`로 변환
- 문서 간 비교
- 접근성용 문서 구조 탐색기
- 브라우저 간 레이아웃 비교 보고서

### Do Not Build — V1

- 문서 편집, 덮어쓰기 또는 새 HWP/HWPX 저장
- 한컴오피스와 픽셀 단위로 동일하다는 보장
- 서버 업로드 또는 외부 문서 변환 API
- 계정, 클라우드 저장, 최근 문서 기록
- 암호 해제 또는 배포용 문서의 보호 우회
- 매크로, 스크립트, OLE 개체 또는 외부 리소스 실행
- 차트·수식·글맵시·복잡한 도형을 부정확한 모양으로 임의 대체
- 파일 안의 URL 자동 접속

## 3. 형식별 지원 계약

지원 여부는 파일 확장자만으로 결정하지 않는다. 파서가 실제 형식과 버전을 확인해야 한다.

| 항목 | HWPX | HWP 5.x | V1 처리 원칙 |
|---|---|---|---|
| 본문 텍스트·문단 | 지원 목표 | 지원 목표 | 누락 없이 읽는 것을 필수 fixture로 검증 |
| 기본 글자·문단 서식 | 지원 목표 | 제한적 지원 | 미지원 속성은 기본 표시하고 경고 |
| 표·셀 병합 | 지원 목표 | 제한적 지원 | 복잡한 표는 원본과 달라질 수 있음을 안내 |
| PNG/JPEG 등 삽입 이미지 | 지원 목표 | 파서 제공 범위 | 안전한 로컬 Blob으로만 표시 |
| 페이지 구분 | 문서 정보가 있으면 반영 | 제한적 지원 | 없거나 불완전하면 연속 보기 사용 |
| 머리말·꼬리말·각주 | 제한적 | 제한적 | 구현 검증 전 완전 지원으로 표시하지 않음 |
| 도형·수식·차트·글맵시 | 미지원 또는 제한적 | 미지원 또는 제한적 | 누락 가능성 경고 |
| OLE·매크로·외부 개체 | 미지원 | 미지원 | 실행하거나 외부 요청하지 않음 |
| 암호화 문서 | 미지원 | 미지원 | 비밀번호를 받지 않고 오류 안내 |
| 배포용 문서 | 해당 시 미지원 | 미지원 | 보호 우회를 시도하지 않음 |
| HWP 3.x 이하 | 해당 없음 | 미지원 | 지원되는 HWP 5.x로 다시 저장하도록 안내 |

라이브러리 기술 검증 결과가 위의 `지원 목표`에 미달하면 Product Owner 승인 없이 지원한다고 표시하지 않는다. 표나 이미지가 안정적으로 구현되지 못하면 기능을 억지로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 남긴다.

## 4. 사용 전 고지와 확인 흐름

### 페이지 상시 안내

파일 선택 영역 위 또는 바로 아래에 `열기 전에 확인하세요` 패널을 표시한다. 기본 화면에서도 핵심 내용을 볼 수 있고 상세 내용을 펼칠 수 있어야 한다.

반드시 포함할 내용:

- 이 도구는 읽기 전용이며 문서를 수정하지 않는다.
- HWPX가 우선 지원 형식이고 HWP 5.x는 제한적으로 지원한다.
- 복잡한 표, 도형, 차트, 수식, 글꼴과 배치는 원본과 다르거나 표시되지 않을 수 있다.
- 암호화·배포용·구버전 HWP는 열 수 없다.
- 문서는 브라우저 안에서 처리되며 서버로 업로드하거나 저장하지 않는다.
- 중요한 제출·인쇄·계약 문서는 한컴오피스 또는 공식 뷰어로 최종 확인해야 한다.

### 파일 선택 후 확인 단계

`파일 선택 → 사전 검사 → 지원 범위 확인 → 문서 열기` 순서를 사용한다.

사전 검사 화면에는 다음을 표시한다.

- 파일명, 감지한 형식과 버전, 파일 크기
- `HWPX 지원` 또는 `HWP 5.x 제한적 지원` 배지
- 해당 형식에서 기대할 수 있는 요소와 표시되지 않을 수 있는 요소
- 개인정보 처리 요약
- `위 내용을 확인하고 문서 열기` 버튼
- `취소` 버튼

별도의 강제 체크박스는 사용하지 않는다. 버튼 문구와 인접 설명으로 사용자가 무엇에 동의하는지 명확히 한다. 지원 불가 형식은 확인 버튼을 제공하지 않는다.

### 결과 고지

- 완전히 지원되는 fixture 범위 안이면 `문서를 열었습니다` 상태를 표시한다.
- 하나 이상의 미지원 요소가 감지되면 `일부 요소가 원본과 다르거나 표시되지 않을 수 있습니다` 경고를 문서 상단에 유지한다.
- 파서가 요소 존재 여부를 판단할 수 없다면 “문제가 없음”으로 확정하지 않고 제한 안내를 유지한다.
- 문서의 정확한 법적·인쇄 결과를 보장하는 표현을 사용하지 않는다.

## 5. 사용자 흐름과 UI

### 초기 상태

1. Breadcrumb, H1, 짧은 설명
2. `열기 전에 확인하세요` 지원 안내
3. 파일 선택·Drop zone
4. 지원 형식과 파일 제한
5. 상세 사용법·지원 범위·FAQ·관련 도구

빈 입력은 오류가 아니다. 파일 선택 버튼에 초기 focus를 강제하지 않는다.

### 뷰어 상태

- 상단 도구 모음: 파일 정보, 확대/축소, 페이지 또는 위치 이동, 검색, 다른 파일 열기, 초기화
- 본문: 문서 캔버스/HTML/SVG 렌더링 영역
- 보조 상태: 현재 페이지, 전체 페이지 또는 문서 진행 위치, 확대율
- 경고 영역: 누락·대체·지원 제한
- 모바일: 도구 모음은 두 줄 또는 더보기 메뉴를 사용하고 문서 자체에 가로 overflow가 필요하면 **뷰어 내부에서만** 스크롤한다.

### 확대·이동

- 기본 확대율은 컨테이너에 맞춤으로 한다.
- 최소·최대 확대율은 렌더러 기술 검증 후 상수로 정의하며 UI 문구와 테스트가 같은 값을 사용한다.
- 전체 사이트에 가로 스크롤을 만들지 않는다.
- 페이지 정보가 없는 문서는 가짜 페이지 수를 만들지 않고 `연속 보기`로 표시한다.

### 검색

- 검색은 브라우저 메모리에 이미 파싱된 텍스트만 대상으로 한다.
- 대소문자 구분 없는 단순 부분 일치를 기본으로 한다.
- 빈 검색어는 오류가 아니다.
- 검색 결과가 없는 경우와 문서 텍스트를 추출할 수 없는 경우를 구분한다.
- 숨겨진 메타데이터나 바이너리 문자열을 검색 결과로 노출하지 않는다.

## 6. 파일 검증과 자원 제한

### 허용 입력

- 확장자: `.hwp`, `.hwpx`
- HWP 5.x: OLE/CFB signature와 FileHeader/version을 파서로 검증
- HWPX: ZIP signature뿐 아니라 필수 package entry와 문서 XML 구조를 검증
- MIME은 브라우저와 운영체제에 따라 비어 있거나 다를 수 있으므로 단독 판정 근거로 사용하지 않는다.

### V1 안전 한계

- 입력 파일 하나만 허용
- 파일 크기: 최대 25 MiB
- HWPX ZIP entry: 최대 2,000개
- HWPX 전체 압축 해제 크기: 최대 150 MiB
- 단일 압축 entry: 최대 50 MiB
- 확대된 문서 이미지와 누적 렌더링 노드는 메모리 사용량을 관찰하며 필요 시 페이지 단위로 생성·폐기

이 한계는 서비스 정책이자 브라우저 안정성 기준이다. 구현 후 저사양 모바일 측정에서 안전하지 않으면 더 낮출 수 있지만, Product Owner가 SPEC과 UI 문구를 함께 변경해야 한다. 제한을 넘은 파일을 일부만 조용히 열지 않는다.

## 7. 오류 계약

| 오류 코드 | 조건 | 사용자 안내와 복구 |
|---|---|---|
| `unsupported-extension` | HWP/HWPX 이외 확장자 | 지원 형식 안내 후 다시 선택 |
| `invalid-signature` | 확장자와 실제 파일 구조 불일치 | 손상되었거나 올바른 문서가 아님을 안내 |
| `unsupported-version` | HWP 3.x 등 미지원 버전 | HWP 5.x 또는 HWPX로 다시 저장하도록 안내 |
| `encrypted-document` | 암호화 감지 | 암호 해제된 사본을 사용하도록 안내 |
| `distribution-document` | 배포용/보호 문서 | 보호를 우회하지 않으며 공식 프로그램 사용 안내 |
| `file-too-large` | 25 MiB 초과 | 더 작은 문서 선택 안내 |
| `archive-limit` | entry·압축 해제 크기 제한 초과 | 안전을 위해 열 수 없음을 안내 |
| `damaged-document` | 필수 stream/XML/관계 파일 누락 또는 파싱 실패 | 원본 확인 또는 다시 저장 안내 |
| `unsupported-content` | 핵심 본문을 표시할 수 없음 | 공식 뷰어 사용 안내, 부분 성공으로 처리하지 않음 |
| `partial-render` | 일부 요소만 표시 가능 | 표시된 범위와 누락 가능성 안내 |
| `out-of-memory` | 할당·렌더링 실패 | 탭을 새로 열거나 더 작은 파일 사용 안내 |
| `unknown-error` | 예상하지 못한 실패 | 개발자 예외·문서 내용을 노출하지 않고 재시도 안내 |

정상적으로 지원되지 않는 문서는 console error를 발생시키지 않는 예상 오류다. 예외 stack, XML 본문, 파일 내 텍스트와 파일 바이너리를 콘솔 또는 오류 분석 서비스로 보내지 않는다.

## 8. 개인정보와 보안

- File/ArrayBuffer/파싱 모델/추출 텍스트/이미지/렌더 결과는 현재 탭의 메모리에서만 처리한다.
- fetch, XHR, server action, API route, WebSocket, Beacon 또는 외부 변환 서비스에 문서 데이터를 전달하지 않는다.
- localStorage, sessionStorage, IndexedDB, cookie, URL query/hash와 history에 파일명·본문·검색어·미리보기를 저장하지 않는다.
- 초기화, 다른 파일 선택, 페이지 이탈과 unmount 시 Object URL, ArrayBuffer 참조, 렌더 노드와 Worker를 정리한다.
- embedded script, macro, OLE, remote image, external font, hyperlink는 자동 실행·요청하지 않는다.
- HTML/SVG 렌더러를 사용할 경우 허용된 요소와 속성만 생성한다. 문서 문자열을 `dangerouslySetInnerHTML`에 직접 넣지 않는다.
- HWPX entry path는 정규화하고 절대 경로, `..`, 중복·비정상 경로를 거부한다.
- ZIP bomb는 entry 수, 개별·전체 압축 해제 크기와 압축률 guard로 방어한다.
- XML 외부 엔티티와 외부 DTD를 해석하거나 요청하지 않는다.
- 서비스 분석 이벤트가 필요해도 파일명, 문서 내용, 검색어, 페이지 이미지, 오류 원문은 payload에 포함하지 않는다.

## 9. 렌더링 정확성 원칙

- 원문 텍스트를 임의 교정, 맞춤법 수정, Unicode 정규화 또는 줄임 처리하지 않는다.
- 문서에 지정된 글꼴이 기기에 없으면 안전한 대체 글꼴을 사용하고 원본과 줄바꿈이 달라질 수 있음을 안내한다.
- 미지원 속성을 발견하면 가능한 기본 표현으로 읽을 수 있게 하되, 원본과 같다고 표시하지 않는다.
- 표 구조를 유지할 수 없는 경우 셀 순서를 뒤섞은 채 표시하지 않는다. 접근 가능한 선형 대체 표시 또는 명확한 미지원 오류를 사용한다.
- 이미지 비율을 변형하지 않는다.
- SVG 또는 HTML의 텍스트는 선택 가능 여부와 무관하게 접근성 트리에 의미 있는 읽기 순서를 제공해야 한다.
- 원본 파일은 수정하지 않는다.

## 10. 라이브러리 후보와 Architect 기술 검증 게이트

### 후보

| 후보 | 강점 | 위험 | V1 판단 |
|---|---|---|---|
| `@rhwp/core` | Rust/WASM 기반 HWP 파싱·SVG 렌더링, 브라우저 사용을 목표로 함 | 실제 문서 호환성, WASM 로딩, 번들 크기, HWPX 범위와 유지보수 상태 검증 필요 | **1차 spike 후보** |
| `@handoc/hwpx-parser` + `@handoc/viewer` | TypeScript/React 기반 HWPX 모델과 뷰어 지향 | 초기 버전이며 HWP 렌더 범위와 API 안정성 검증 필요 | **HWPX 비교 후보** |
| `hwp.js` | TypeScript 기반 기존 HWP 파서·뷰어 사례 | 최신 릴리스가 오래되어 Next.js 16/React 19 호환성과 보안 유지보수 위험 | 참고 구현, 우선 채택하지 않음 |
| 직접 HWPX ZIP/XML 파서 | 필요한 기능과 보안 한계를 직접 통제 | OWPML 스타일·배치 구현량과 장기 유지보수 비용 큼 | 라이브러리가 필수 범위를 못 채울 때만 재검토 |

### 구현 전 필수 spike

Builder는 UI 구현 전에 별도의 작은 기술 검증으로 다음을 확인한다.

1. 브라우저 번들에서 동적 import와 WASM asset 경로가 Next.js production build 및 locale 경로에서 동작한다.
2. 라이선스와 transitive dependency가 상업 웹사이트 배포에 적합하다.
3. 유지보수 상태, 공개 취약점, minified/gzip 및 WASM 크기를 기록한다.
4. 합성 fixture와 적법하게 사용할 수 있는 실제 표본으로 HWPX/HWP 5.x 본문·표·이미지를 비교한다.
5. 암호화, 배포용, HWP 3.x, 손상 파일을 구분해 실패한다.
6. 문서 데이터가 네트워크로 전송되지 않고 embedded 외부 리소스 요청이 발생하지 않는다.
7. 25 MiB 및 압축 해제 한계에서 브라우저가 멈추거나 탭이 종료되지 않는다.
8. 생성된 HTML/SVG에 script, event handler, foreignObject, 외부 URL 같은 실행 경로가 남지 않는다.

필수 fixture를 통과하지 못하면 라이브러리를 채택하지 않는다. 두 파서를 억지로 결합해 서로 다른 결과를 조용히 섞지 않으며, 형식별 adapter 경계를 둔다.

## 11. 구현 구조 제안

```text
app/[locale]/tools/hwp-hwpx-viewer/page.tsx
components/tools/hwp-hwpx-viewer/hwp-hwpx-viewer.tsx
components/tools/hwp-hwpx-viewer/preflight-panel.tsx
components/tools/hwp-hwpx-viewer/document-viewer.tsx
components/tools/hwp-hwpx-viewer/support-notice.tsx
lib/tools/hwp-hwpx-viewer/contracts.ts
lib/tools/hwp-hwpx-viewer/detect-document.ts
lib/tools/hwp-hwpx-viewer/hwpx-adapter.ts
lib/tools/hwp-hwpx-viewer/hwp-adapter.ts
lib/tools/hwp-hwpx-viewer/security.ts
lib/tools/hwp-hwpx-viewer/search.ts
lib/tools/hwp-hwpx-viewer/*.test.ts
tests/hwp-hwpx-viewer-browser.mjs
messages/{ko,en,ja}.json
```

- page와 metadata는 Server Component로 유지한다.
- File API, WASM, ZIP, parser와 viewer state만 Client Component에 둔다.
- 무거운 parser는 파일 열기를 확인한 뒤 `dynamic import`한다.
- HWP와 HWPX adapter는 공통 `ParsedDocument` 계약을 반환하되 지원하지 않는 요소와 경고 목록을 함께 반환한다.
- registry 한 곳에 도구를 추가해 홈, 메뉴와 sitemap이 함께 갱신되는 기존 구조를 사용한다.
- 공통 Breadcrumb, Tool Detail Content, theme token과 카드 스타일을 재사용한다.

## 12. 접근성·반응형·성능

- Drop zone은 실제 file input과 연결된 label을 포함하고 클릭·키보드 모두 지원한다.
- 열기 전 확인 버튼, 검색, 확대, 페이지 이동과 초기화에는 visible label 또는 접근 가능한 이름이 있어야 한다.
- parsing은 `aria-live=polite`, 오류는 `role=alert`, 부분 지원은 경고 제목과 텍스트로 전달한다.
- 확대율이나 경고를 색상만으로 전달하지 않는다.
- 문서 읽기 순서와 DOM 순서는 일치해야 한다.
- 320, 375, 768, 1024, 1440px에서 사이트 전체 overflow, 도구 모음 겹침, 버튼 잘림이 없어야 한다.
- 긴 파일명은 줄바꿈 또는 말줄임 처리하고 전체 이름을 접근 가능하게 제공한다.
- 긴 문서는 페이지 단위 lazy render 또는 virtualization을 검토하며, 검색 인덱스와 렌더 노드를 불필요하게 중복하지 않는다.
- 파싱 중 UI를 지속적으로 막는 500ms 이상 long task가 반복되면 Worker를 V1 필수 범위로 승격한다.

## 13. 상세 콘텐츠와 FAQ

도구 UI 아래 실제 HTML 콘텐츠로 다음을 제공한다.

- HWP/HWPX 온라인 뷰어가 하는 일
- HWP와 HWPX의 차이
- 파일을 여는 방법
- 형식별 보이는 항목과 보이지 않을 수 있는 항목
- 표·이미지·도형·수식·차트·글꼴 및 배치 제한
- 중요한 문서를 공식 프로그램으로 최종 확인해야 하는 이유
- 브라우저 로컬 처리와 저장하지 않는 데이터
- 관련 도구 3~5개와 다른 인기 도구

FAQ는 최소 다음 세 질문을 도구에 맞게 답한다.

1. 한컴오피스가 없어도 HWP/HWPX를 볼 수 있나요?
2. 원본과 화면이 다른 이유는 무엇인가요?
3. 문서가 서버에 업로드되거나 저장되나요?

추가 FAQ 후보는 암호 문서, 배포용 문서, 모바일 지원과 HWP/HWPX 차이다. 지원하지 않는 기능을 해결 가능한 것처럼 안내하지 않는다.

## 14. 수용 기준

1. 빈 상태는 오류가 아니며 파일 선택과 지원 안내가 명확하다.
2. `.hwp`와 `.hwpx` 이외 파일은 파싱 전에 거부한다.
3. 위장 확장자와 손상 파일은 signature·구조 검사에서 거부한다.
4. 파일 선택 후 사전 검사 결과와 형식별 지원 수준을 보여준 뒤에만 본문을 파싱·렌더링한다.
5. HWPX 필수 fixture에서 본문, 문단 순서, 표 cell text와 삽입 이미지가 기대 결과와 일치한다.
6. HWP 5.x 필수 fixture에서 본문 순서와 채택 라이브러리의 승인된 기본 요소가 기대 결과와 일치한다.
7. HWP 5.x 화면에는 제한적 지원 상태가 항상 보인다.
8. 암호화·배포용·HWP 3.x·손상 파일은 서로 구분 가능한 오류와 복구 안내를 제공한다.
9. 도형·수식·차트 등 미지원 요소를 감지하면 부분 지원 경고를 표시한다.
10. 페이지 정보가 없는 문서에 임의 페이지 수를 표시하지 않는다.
11. 확대, 이동, 검색, 다른 파일 열기와 초기화가 키보드·터치로 동작한다.
12. 검색 결과 개수와 다음/이전 이동이 본문 텍스트와 일치한다.
13. 25 MiB, ZIP entry, 압축 해제 크기와 단일 entry 한계를 정확히 차단한다.
14. ZIP bomb·비정상 entry path·외부 XML entity·embedded active content가 실행되거나 요청되지 않는다.
15. 파일 marker, 파일명, 본문, 검색어가 network, storage, URL, console과 analytics payload에 포함되지 않는다.
16. 초기화·교체·unmount 후 Blob URL, Worker, 대형 buffer와 렌더 노드가 정리된다.
17. 320/375/768/1024/1440px에서 뷰어 바깥 가로 overflow와 control overlap이 없다.
18. ko/en/ja에서 기능, 고지, 오류, metadata, Breadcrumb, 메뉴와 sitemap이 일치한다.
19. 정상·지원 불가·부분 지원·반복 열기 흐름에서 Console Error와 unhandled rejection이 0이다.
20. 실제 구현에서 검증하지 못한 요소를 `지원`이라고 안내하지 않는다.

## 15. QA 필수 매트릭스

### 문서 fixture

- HWPX: 일반 문단, 한글/영문/일본어/숫자/Emoji
- HWPX: 글자 크기·굵기·정렬·줄바꿈
- HWPX: 일반 표, 병합 셀, 중첩 또는 복잡한 표
- HWPX: PNG/JPEG 이미지와 이미지 없는 문서
- HWPX: 여러 section, 머리말·꼬리말·각주
- HWPX: 도형·수식·차트가 포함된 부분 지원 문서
- HWP 5.x: 일반 문단과 기본 스타일
- HWP 5.x: 표와 삽입 이미지
- HWP 5.x: 압축 stream과 비압축 stream 표본
- 암호화 HWP/HWPX, 배포용 HWP, HWP 3.x
- ZIP이지만 HWPX가 아닌 파일, 확장자 위장, 필수 entry 누락, 잘못된 XML
- 0 byte, 최소 문서, 25 MiB 경계와 초과
- entry 2,000개 경계/초과, 압축 해제 150 MiB 경계/초과, 높은 압축률 표본
- 매우 긴 문서와 이미지가 많은 문서

fixture는 직접 생성하거나 재배포 권한이 확인된 문서만 저장소에 포함한다. 실제 개인정보 문서를 테스트 fixture로 커밋하지 않는다.

### 자동 검증

- 감지된 형식·버전과 fixture 기대값 비교
- 추출 텍스트와 문단·표 cell 읽기 순서 비교
- 이미지 수, MIME, dimensions와 비율 비교
- 부분 지원 warning code 비교
- 검색 결과 개수와 이동 순서
- sanitizer allowlist와 외부 요청 0
- parser adapter 오류 매핑
- resource cleanup과 반복 파일 교체
- locale별 콘텐츠 key와 registry/sitemap 연결

### 실제 브라우저

- 최신 안정 Chrome production build
- 320×800, 375×812, 768×1024, 1024×768, 1440×900
- ko/en/ja 직접 URL, reload, back/forward, locale 변경
- 선택/Drop, 확인/취소, 확대/축소, 검색, 이동, 초기화
- 문서가 길 때 scroll·focus·메모리·long task 확인
- light/dark에서 문서와 UI 대비 확인
- network request body/header, storage, URL, console에서 고유 marker 유출 여부 확인
- Console Error, page error, unhandled rejection, 전체 페이지 horizontal overflow 0

## 16. Critic 필수 질문

Critic은 결과를 보기 전에 최소 10개의 질문을 작성하며 아래 질문을 반드시 포함한다.

1. 사용자가 HWPX와 HWP 5.x의 지원 수준 차이를 파일 선택 전에 이해하는가?
2. `제한적 지원`이 눈에 띄지만 파일 열기를 불필요하게 방해하지 않는가?
3. 원본과 다른 배치가 제품 오류인지 포맷 제한인지 구분할 수 있는가?
4. 표시되지 않은 표·이미지·도형이 있는데 성공으로 오해할 가능성이 없는가?
5. 중요한 문서는 공식 프로그램으로 최종 확인해야 한다는 안내가 적절한 시점에 보이는가?
6. 암호화·배포용·구버전·손상 파일의 오류와 해결 방향이 구체적인가?
7. 문서가 서버로 전송되지 않는다는 설명과 실제 network 동작이 일치하는가?
8. 긴 문서를 모바일에서 탐색하고 확대·검색하기 쉬운가?
9. 키보드와 스크린리더로 사전 확인부터 문서 탐색까지 완료할 수 있는가?
10. 지원하지 않는 기능을 제공하는 것처럼 보이는 버튼이나 문구가 없는가?
11. 브라우저 메모리 부족이나 느린 처리에서 취소·복구가 가능한가?
12. HWP/HWPX 파일명과 문서 내용이 로그·URL·저장소에 남지 않는가?

## 17. 완료 조건

다음을 모두 만족할 때만 Product Owner가 `DONE`으로 기록할 수 있다.

- Architect 라이브러리 spike와 보안 검토 PASS
- Critic 점수 90/100 이상
- 통합 Critical 0, High 0
- lint, type-check, 전체 자동 테스트, build PASS
- TypeScript 오류 0
- Console Error와 unhandled rejection 0
- HWPX 필수 본문·표·이미지 fixture PASS
- HWP 5.x 승인된 제한 지원 fixture PASS
- 암호화·배포용·구버전·손상·위장 파일 오류 PASS
- ZIP bomb·active content·외부 리소스 차단 PASS
- 모바일과 접근성 PASS
- 문서 데이터 network·storage·URL·analytics 유출 0
- 고지 내용과 실제 지원 범위 일치
- 최대 개선 반복 5회

5회 재검증 후 하나라도 미달하면 억지로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 기록한다. 특히 표·이미지 기본 fixture, 개인정보 비전송, active content 차단 중 하나라도 검증하지 못하면 점수와 무관하게 PASS할 수 없다.

## 18. Architect 검토 결과

### 기존 프로젝트와의 충돌

- App Router의 `/{locale}/tools/{slug}` 구조와 충돌하지 않는다.
- 기존 `fileData` 카테고리를 재사용할 수 있으며 새 카테고리를 만들 필요가 없다.
- registry 단일 등록으로 홈, 상단 메뉴와 sitemap을 갱신하는 기존 방식을 유지한다.
- 공통 Breadcrumb, 상세 콘텐츠, SEO helper, 다국어 메시지와 theme token을 재사용할 수 있다.
- 기존 도구 로직이나 P2P Worker를 변경할 필요가 없다.

### 승인 전 기술 조건

- 라이브러리는 아직 최종 승인하지 않는다. `@rhwp/core`와 HWPX 후보를 fixture로 비교한 결과를 기록한 뒤 하나 또는 형식별 adapter를 선택한다.
- 새 라이브러리를 설치하기 전에 라이선스, 배포 파일, WASM CSP/경로, 번들 크기와 공급망 위험을 확인한다.
- HWP/HWPX 파서는 신뢰할 수 없는 입력을 처리하므로 일반 UI 라이브러리보다 엄격한 자원 제한과 fuzz/손상 fixture가 필요하다.
- 브라우저 로컬 처리 원칙은 유지 가능하지만, WASM이나 parser asset을 CDN에서 가져오지 않고 앱과 함께 배포해야 한다.
- 정교한 페이지 재현보다 안전하고 정직한 읽기 결과를 우선한다.

### 주요 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 실제 문서별 렌더 호환성 차이 | 본문·표·배치 누락 | 형식별 fixture, 부분 지원 경고, 공식 뷰어 최종 확인 안내 |
| 오래되거나 초기 단계인 라이브러리 | 유지보수·보안·React 호환 문제 | 구현 전 spike, adapter 격리, lockfile 고정, audit |
| WASM/파서 번들 증가 | 초기 로딩 저하 | 확인 후 dynamic import, route-local loading |
| ZIP bomb·손상 문서 | 메모리 고갈·탭 중단 | decode 전후 hard limit, 취소, Worker 검토 |
| 문서 기반 active content | XSS·외부 추적 요청 | 안전한 모델 렌더, sanitizer allowlist, 외부 URL 차단 |
| 글꼴 차이 | 줄바꿈·페이지 배치 변화 | 대체 글꼴 고지, 정확한 인쇄 결과 미보장 |
| HWP 보호 문서 | 열람 불가 또는 우회 위험 | 명시적 미지원, 우회 구현 금지 |

### Architect 판정

- 구조 충돌: 없음
- 서버/API 필요: 없음
- 신규 production dependency: 가능성이 높으나 spike 후 확정
- 구현 가능성: HWPX 높음, HWP 5.x 제한적
- Builder 진입 상태: `READY`, 단 라이브러리 spike를 첫 구현 단계로 수행
- 범위 변경 권한: fixture 결과가 Must Have를 충족하지 못하면 Product Owner 재승인 필요

## 19. 참고 근거

- 한글과컴퓨터 HWP/OWPML 형식 공개 자료: HWP 바이너리와 HWPX/OWPML 명세
- KS X 6101 기반 HWPX: ZIP/XML 기반 개방형 문서 포맷
- `@rhwp/core`: 브라우저 WASM HWP 파서·SVG 렌더링 후보
- `@handoc/hwpx-parser`, `@handoc/viewer`: TypeScript/React HWPX 후보
- `hwp.js`: 기존 TypeScript HWP 웹 뷰어 사례이지만 유지보수 상태 검토 필요

참고 자료는 구현 가능성 판단 근거이며 특정 라이브러리의 기능·완성도를 보증하지 않는다. 최종 지원 문구는 실제 채택 버전과 QA fixture 결과를 기준으로 갱신한다.
