# URL Encoder / Decoder SPEC

## 문서 상태

- 기능명: URL Encoder / Decoder
- 상태: `SPEC READY`
- 우선순위: 다섯 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-26
- 개선 회차: 최초 구현 전
- 예정 URL: `/{locale}/tools/url-encoder-decoder`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 URL 전체 또는 query parameter 같은 URL 구성요소에 Unicode와 예약 문자가 포함될 때 UTF-8 Percent Encoding으로 안전하게 변환하고 원문으로 복원해야 한다. 두 방식은 보존하는 예약 문자가 다르지만 기존 도구는 차이를 충분히 설명하지 않거나 잘못된 `%` 입력에서 개발자용 예외를 노출한다. 이 기능은 두 방식을 명확히 구분하고 모든 데이터를 브라우저 안에서 처리한다.

## 2. 대상 사용자

- URL과 API query parameter를 작성·검증하는 개발자와 테스터
- 한글·일본어·중국어·Emoji가 포함된 링크를 변환하려는 사용자
- 모바일에서 짧거나 긴 URL 인코딩을 빠르게 확인하려는 사용자
- 입력을 외부 서버에 보내지 않고 로컬에서 처리하려는 사용자

## 3. 가치 제안

사용자가 Encode/Decode와 Full URL/URL Component를 명시적으로 선택하면, 현재 방식의 차이와 수행 결과를 확인하면서 UTF-8 Percent Encoding을 손실 없이 변환할 수 있다.

## 4. 우선순위와 범위

### Must Have

- Encode / Decode 모드 전환
- `Full URL`과 `URL Component` 방식 선택, 기본값 `URL Component`
- UTF-8 기반 Percent Encode/Decode
- 별도 입력 textarea와 읽기 전용 결과 textarea
- 실행, Copy, Clear
- 빈 입력 정상 처리와 잘못된 Percent Encoding의 사용자 친화적 오류
- 현재 모드·방식 및 최근 성공 작업 표시
- `+`를 일반 문자로 유지하는 기본 Decode
- `ko`, `en`, `ja`, 모바일, 독립 URL·SEO·홈/공통 메뉴 등록
- 서버 요청·저장 없는 브라우저 로컬 처리 안내

### Should Have — 후속 SPEC 후보

- 입력과 결과 Swap: 연속 Encode/Decode에 유용하지만 모드 전환과 결과 이동 규칙이 추가되므로 최초 릴리스에서는 제외한다.
- Query String 방식 Decode: `application/x-www-form-urlencoded` 입력에서 `+`를 공백으로 바꾸는 수요가 있으나 일반 Percent Decode와 의미가 다르므로 별도 옵션으로 후속 검토한다.

### Could Have — 현재 제외

- 자동 변환: 입력 중 불완전한 `%`를 계속 오류로 표시하고 긴 입력의 반복 계산을 유발하므로 명시적 실행보다 우선순위가 낮다.
- 샘플 URL 불러오기: 학습에 도움은 되지만 두 방식의 짧은 도움말과 테스트 가능한 기본 흐름으로 충분하다.

### 제외 범위

- Query String 전용 편집기·key/value parser·정렬
- URL 구조 분석, 유효한 URL인지 검증, DNS 또는 접속 가능성 검사
- 결과 파일 다운로드
- 자동 변환, Swap, 샘플, `+`→공백 옵션의 최초 구현
- RFC 3986 strict 변형, custom safe character 목록, 다른 문자 인코딩
- URL 단축, QR 코드, 서버 API, 저장, 기록, 공유 링크, 로그인

후속 항목은 승인 없이 구현하지 않고 필요하면 `IDEAS.md`에서 별도로 관리한다.

## 5. 용어와 정확한 변환 규칙

### URL Component

- Encode는 JavaScript `encodeURIComponent`와 동일한 결과를 낸다.
- 영문자, 숫자와 `- _ . ! ~ * ' ( )`를 제외한 문자를 필요에 따라 UTF-8 byte 단위 `%XX` 대문자 hex로 변환한다.
- 따라서 `; , / ? : @ & = + $ #` 같은 URL 예약 문자는 인코딩된다.
- Decode는 `decodeURIComponent`와 동일한 개념으로 모든 유효한 Percent Encoding을 복원한다.

### Full URL

- Encode는 JavaScript `encodeURI`와 동일한 결과를 낸다.
- URL 구조를 이루는 `; , / ? : @ & = + $ #`와 URL Component의 비인코딩 문자를 유지한다.
- 입력의 literal `%`는 유효한 escape인지 추정하지 않고 `%25`로 인코딩한다. 이미 인코딩된 문자열을 Encode하면 `%`가 다시 인코딩되는 것이 정상이다.
- Decode는 JavaScript `decodeURI`와 동일한 개념이다. URL 구조를 보존하기 위해 예약 문자를 나타내는 `%3B`, `%2C`, `%2F`, `%3F`, `%3A`, `%40`, `%26`, `%3D`, `%2B`, `%24`, `%23`은 문자로 강제 복원하지 않고 escape 상태로 유지할 수 있다.

### 공통 규칙

- Percent Encoding은 Unicode scalar value를 UTF-8 byte sequence로 만든 뒤 각 대상 byte를 `%XX`로 표현한다.
- hex 출력은 JavaScript 표준 함수와 같은 대문자를 사용한다.
- Unicode normalization, 대소문자 변경, 줄바꿈 변환을 변환 로직에서 임의로 수행하지 않는다. HTML textarea가 DOM value를 만들 때 CRLF를 LF로 표준화하는 것은 브라우저 입력 계층의 기준값으로 인정하며, 변환은 그 DOM value를 추가 변경 없이 보존한다.
- 정상 입력은 같은 방식을 사용한 `원문 → Encode → Decode` 후 원문과 code point 단위로 같아야 한다.
- lone high/low surrogate처럼 정상 UTF-8로 표현할 수 없는 JavaScript 문자열은 조용히 replacement character로 바꾸지 않고 친절한 Unicode 입력 오류로 처리한다.
- 이 도구는 URL의 문법적 유효성이나 안전성을 검증하지 않는다. Full URL 모드는 URL처럼 보이지 않는 일반 문자열도 동일 규칙으로 변환한다.

## 6. Plus 기호와 form encoding

- 기본 Decode는 Full URL과 URL Component 모두 `+`를 literal plus로 유지한다.
- `+`를 공백으로 바꾸는 `application/x-www-form-urlencoded` 규칙을 자동 적용하지 않는다.
- `%2B`는 URL Component Decode에서 `+`로 복원된다. Full URL Decode에서는 예약 문자 보존 의미에 따라 `%2B`가 escape 상태로 남을 수 있다.
- 도움말에 “이 도구의 기본 Decode는 `+`를 공백으로 바꾸지 않는다”는 locale별 문구를 표시한다.
- `+`를 공백으로 처리하는 Query String 옵션은 Should Have이며 이번 버전에 구현하지 않는다.

## 7. 초기 상태와 상태 전이

- 기본 모드는 `Encode`, 기본 방식은 `URL Component`다.
- 최초 진입 시 입력과 결과는 비어 있고 오류·성공 상태가 없다.
- 길이가 정확히 0인 빈 입력에서는 실행, Copy, Clear가 disabled다.
- 공백, tab 또는 줄바꿈만 있는 문자열은 유효한 변환 대상이므로 실행과 Clear가 enabled다.
- 모드 또는 방식을 변경하면 입력은 유지하되 기존 결과, 오류, 성공·Copy 피드백과 최근 작업 표시를 제거한다.
- 입력을 수정하면 기존 결과는 유지하되 오류와 성공·Copy 피드백을 제거한다. 남아 있는 결과에는 마지막으로 수행한 모드와 방식 표시를 함께 유지해 현재 입력의 새 결과로 오인하지 않게 한다.
- 실행 성공 시 결과 근처에 locale별 `UTF-8 · URL Component Encoding`, `UTF-8 · Full URL Decoding`과 동등한 최근 작업 문구를 표시한다.

## 8. Encode / Decode 동작

### Encode

- URL Component는 `encodeURIComponent`, Full URL은 `encodeURI` 의미로 변환한다.
- 성공 시 입력을 바꾸지 않고 결과만 교체한다.
- literal `%`가 있는 `hello%20world`의 URL Component Encode 결과는 `hello%2520world`이며, 같은 방식으로 Decode하면 원 입력이 복원된다.
- lone surrogate 등 변환 불가능 입력이면 기존 결과를 제거하고 사용자 친화적인 Unicode 입력 오류를 표시한다.

### Decode

- URL Component는 `decodeURIComponent`, Full URL은 `decodeURI` 의미로 변환한다.
- `%XX`의 hex는 대문자와 소문자를 모두 허용한다.
- `%`, `%A`, `%ZZ`, `abc%2`처럼 불완전하거나 non-hex인 escape는 오류다.
- escape가 형식상 완전해도 `%FF`, 잘린 다중 byte sequence, overlong UTF-8, UTF-8 surrogate encoding처럼 유효한 UTF-8 문자열이 아니면 오류다.
- literal Unicode와 올바른 Percent Encoding이 섞인 문자열은 해당 방식의 표준 Decode 결과를 따른다.
- 오류 시 입력을 바꾸지 않고 기존 결과를 제거하며 `올바르지 않은 URL 인코딩 문자열입니다. % 뒤에는 두 자리 16진수가 필요합니다.`와 동등한 locale별 복구 안내를 표시한다.
- 원시 `URIError`, exception message, stack trace 또는 입력 전문을 노출하지 않는다.

### Clear

- 입력, 결과, 최근 작업 표시, 오류, 성공·Copy 피드백을 지운다.
- 현재 모드와 방식 선택은 유지한다.
- 실행 후 입력 textarea로 focus를 돌린다.
- 완전한 초기 상태에서는 disabled다.

### Copy

- 현재 결과를 보이는 그대로 Clipboard API에 쓴다.
- 결과가 없으면 disabled다.
- 성공은 locale별 polite status로 알린다.
- 미지원·권한 거부 시 결과를 유지하고 사용자 친화적 오류를 alert로 표시한다.
- Clipboard 실패를 Console Error 또는 unhandled rejection으로 남기지 않는다.

## 9. 오류와 사용자 피드백

- 상태는 `빈 상태`, `입력 있음`, `성공`, `잘못된 Percent Encoding`, `잘못된 Unicode 입력`, `Copy 성공`, `Copy 실패`로 구분한다.
- Percent Encoding 오류에는 올바른 `%XX` 형식과 입력 확인 방법을 안내한다.
- Unicode 입력 오류에는 잘못된 문자를 자동 대체하지 않았으며 입력을 다시 확인하라고 안내한다.
- 오류는 `role="alert"` 또는 동등한 방식으로 알리고 입력과 연결한다.
- 성공과 Copy 완료는 `aria-live="polite"` 또는 동등한 status로 제공한다.
- 색상만으로 상태를 구분하지 않는다.
- 예상 가능한 입력·Clipboard 오류는 Console Error를 만들지 않는다.

## 10. UI 및 접근성

- 화면 순서: 제목/설명 → Encode/Decode 모드 → Full URL/URL Component 방식과 차이 설명 → 입력 → 실행/Clear → 결과 → 최근 작업 표시 → Copy → Plus/개인정보 안내.
- 모드와 방식은 각각 fieldset/legend가 있는 radio group, segmented control 또는 동등한 접근 가능한 선택 UI로 제공한다.
- 현재 선택은 시각적 강조와 `aria-pressed`, checked state 또는 동등한 시맨틱으로 전달한다.
- 두 방식의 도움말은 `Full URL은 URL 구조 문자를 유지`, `URL Component는 query parameter 값에 적합`에 해당하는 짧은 locale별 문구를 항상 확인할 수 있게 한다.
- Encode 입력 label은 일반 문자열 또는 URL 입력, Decode 입력 label은 인코딩된 문자열 입력에 해당하는 locale 문구를 사용한다.
- 입력과 결과는 별도 textarea이며 결과는 read-only다. placeholder로 label을 대신하지 않는다.
- 실행 버튼만 primary, Clear와 Copy는 secondary다.
- 320px 이상에서 두 선택 그룹, textarea, 버튼과 긴 URL/query string이 문서 가로 overflow·잘림·겹침을 만들지 않아야 한다.
- 긴 문자열은 textarea 내부에서 wrap 또는 내부 스크롤하며 페이지 폭을 늘리지 않는다.
- 모바일 입력과 결과 textarea는 각각 최소 160px 높이를 목표로 하되 핵심 버튼을 찾기 어렵게 만들지 않는다.
- 주요 버튼과 선택 control은 최소 44px 터치 영역을 제공한다.
- 키보드만으로 모드, 방식, 입력, 실행, Clear, Copy를 사용할 수 있고 focus 표시를 숨기지 않는다.

## 11. 다국어, SEO 및 탐색

- 모든 사용자 문구는 `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 동일한 `Tools.urlEncoderDecoder` namespace에서 관리한다.
- 세 locale에 제목, 설명, 모드, 방식·도움말, input/result label, 실행·Clear·Copy, 최근 작업, 오류, Plus 안내와 개인정보 문구를 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 `tools/url-encoder-decoder`를 가리킨다.
- 각 페이지는 고유 title·description과 기능명을 나타내는 `<h1>` 하나를 제공한다.
- 검색 가능한 설명에 Percent Encoding, Full URL과 URL Component의 차이, UTF-8과 Plus 처리 규칙을 포함한다.
- 홈 카드와 공통 반응형 메뉴에 현재 locale을 유지하는 링크를 등록한다.

## 12. 개인정보·보안·성능

- 입력과 결과는 서버, 외부 API, 분석 서비스로 전송하거나 URL, 쿠키, localStorage, sessionStorage, IndexedDB에 저장하지 않는다.
- 입력과 결과를 HTML로 해석하거나 비정제 DOM으로 삽입하지 않는다.
- URL Decode 결과는 실행 가능한 링크나 자동 navigation으로 만들지 않고 평문으로만 표시한다.
- Clipboard 쓰기는 사용자가 Copy를 눌렀을 때만 수행한다.
- 이미 열린 페이지는 네트워크가 없어도 Encode, Decode, Clear를 수행한다.
- 입력 길이에 임의 제한은 두지 않는다. QA 장비 최신 안정 Chrome에서 1MB ASCII/Unicode 혼합 입력의 Encode와 Decode를 각각 250ms 이내로 처리하는 것을 목표로 측정한다.
- 브라우저 내장 API만 사용하며 이 기능을 위한 런타임 의존성을 추가하지 않는다.

## 13. 수용 기준

1. 초기 상태는 Encode·URL Component이며 입력·결과·오류가 비고 실행·Copy·Clear가 disabled다.
2. 길이 0 입력은 오류가 아니며, 공백·tab·줄바꿈만 있는 입력은 정상적으로 Encode/Decode할 수 있다.
3. 모드와 방식 선택이 시각적·시맨틱으로 명확하고 변경 시 입력만 유지하며 stale 결과·피드백이 제거된다.
4. `hello world`는 URL Component Encode에서 `hello%20world`가 되고 Decode 후 원문으로 복원된다.
5. 한글 `안녕하세요`, 일본어 `こんにちは`, 중국어, `Hello 😀🚀`와 combining Unicode가 두 방식에서 손실 없이 round trip한다.
6. 여러 줄 문자열은 textarea가 확정한 DOM value를 기준으로 LF와 줄 구조를 추가 변형하지 않으며, 같은 방식의 round trip 후 그 입력값과 code point 단위로 같다. textarea의 표준 CRLF→LF 정규화는 별도로 QA 기록한다.
7. Full URL에서 `https://example.com/search?q=안녕하세요&sort=new`를 Encode하면 `https://`, `/`, `?`, `=`, `&`가 유지되고 Unicode가 Percent Encoding된다.
8. 같은 URL을 URL Component로 Encode하면 `:`, `/`, `?`, `=`, `&` 등 예약 문자가 Percent Encoding된다.
9. query parameter 값 `안녕하세요 world & test=true`가 URL Component 방식으로 Encode/Decode되어 원문으로 복원된다.
10. `! @ # $ % ^ & * ( )`가 각 방식의 명시된 safe/reserved set에 맞는 정확한 결과를 낸다.
11. 이미 인코딩된 `hello%20world`를 Encode하면 `%`가 `%25`로 다시 인코딩되고 같은 방식 Decode로 원 입력이 복원된다.
12. Decode에서 `%`, `%A`, `%ZZ`, `abc%2`를 각각 입력하면 앱이 깨지지 않고 입력을 보존한 친절한 Percent Encoding 오류가 표시된다.
13. `%FF`, 불완전 다중 byte, overlong 또는 surrogate UTF-8 escape는 replacement character 없이 오류 처리된다.
14. lone surrogate Encode는 문자를 손실·대체하지 않고 친절한 Unicode 입력 오류로 처리된다.
15. 기본 Decode는 literal `+`를 공백으로 바꾸지 않으며 Plus 처리 차이가 UI 도움말에 보인다.
16. Full URL Decode와 URL Component Decode가 예약 문자의 Percent Encoding에서 표준 함수 의미에 맞게 구분된다.
17. 정상 데이터, 긴 URL, 1MB 입력에서 반복 실행해도 결과가 안정적이고 앱이 깨지지 않는다.
18. Clear는 입력·결과·상태를 지우고 입력으로 focus를 돌리며 모드와 방식은 유지한다.
19. Copy는 결과를 정확히 복사하고 성공을 알리며, 거부/미지원 시 결과 유지·친절한 오류·Console Error 0을 만족한다.
20. 320/375/768/1280px에서 긴 URL과 query string을 포함한 핵심 흐름이 가능하고 문서 가로 overflow·잘림·겹침이 없다.
21. 키보드만으로 전체 흐름을 완료하고 label, read-only 결과, 최근 작업, 오류와 상태를 보조기기가 인지할 수 있다.
22. `ko/en/ja` URL의 기능·번역·metadata·canonical·hreflang과 홈/공통 메뉴 링크가 올바르다.
23. 정상·Percent 오류·Unicode 오류·Clipboard 오류에서 Console Error와 unhandled rejection이 0이다.
24. 입력·결과의 고유 문자열이 네트워크·URL·브라우저 저장소에 없고 offline에서도 핵심 변환이 동작한다.
25. 1MB 성능 목표를 실제 Chrome에서 측정해 환경과 결과를 기록한다.

## 14. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- 필수 테스트에는 fail, skip, todo가 없어야 한다.

### 순수 로직 테스트

- 영문과 공백: `hello world`
- 한글, 일본어, 중국어, Emoji, combining 문자
- 여러 줄 LF·CRLF와 tab
- Full URL: `https://example.com/search?q=안녕하세요&sort=new`의 구조 문자 보존
- URL Component: 같은 URL의 예약 문자 encoding
- query parameter 값: `안녕하세요 world & test=true`
- 특수문자: `! @ # $ % ^ & * ( )`
- 이미 인코딩된 `hello%20world`의 double encoding과 round trip
- malformed `%`, `%A`, `%ZZ`, `abc%2`
- invalid UTF-8 `%FF`, 잘린 sequence, overlong, surrogate escape
- lone high/low surrogate Encode
- literal `+`, `%2B`, `%20`의 방식별 Decode 차이
- 빈 문자열, 공백만 있는 문자열, 긴 URL, 1MB 입력
- 모든 정상 입력의 각 방식별 `원문 → Encode → Decode → 원문` equality

### UI 테스트

- 초기 모드·방식과 disabled 상태
- 모드·방식 변경, 입력 유지와 stale 상태 제거
- 입력·읽기 전용 결과·최근 작업 표시
- Percent·Unicode 오류와 입력 보존·수정 시 피드백 해제
- Clear/focus, Copy 성공·미지원·거부
- Plus와 두 방식 차이 도움말
- 홈 카드와 공통 메뉴의 locale 유지 링크

### QA 실제 Chrome

- production build, 최신 안정 Chrome
- viewport 320×800, 375×812, 768×1024, 1280×900
- `ko`, `en`, `ja` 전체 조합
- 직접 URL, reload, back/forward, 홈 카드와 공통 메뉴 이동
- 키보드 전용 흐름, focus 순서, 44px 터치 영역, 오류·상태 인지
- 사용자가 지정한 14개 필수 케이스와 Full URL/URL Component 예약 문자 비교
- 긴 URL·긴 query·1MB 성능, 반복 실행, offline 변환
- Clipboard 성공·거부, Console Error, page error, unhandled rejection
- 입력 고유 문자열이 네트워크 요청·URL·브라우저 저장소에 포함되지 않는지 검사

## 15. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 목록 Critical 0, High 0
- 필수 자동 검사와 테스트 전부 PASS
- TypeScript 오류 0
- Console Error와 처리되지 않은 rejection 0
- UTF-8 Unicode, 한글·일본어·중국어·Emoji 처리 정상
- 잘못된 Percent Encoding과 Unicode 입력에서 앱이 깨지지 않음
- 두 방식의 Encode → Decode round trip PASS
- 모바일 PASS
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.

## 16. Architect 검토

### 결론

현재 프로젝트 구조와 충돌 없이 구현 가능하다. Next.js App Router, TypeScript, Tailwind CSS, `next-intl`, 기존 Button과 테스트 기반을 그대로 사용할 수 있으며 서버 기능이나 새 런타임 의존성이 필요하지 않다.

### 권장 구현 경계

```text
app/[locale]/tools/url-encoder-decoder/page.tsx
components/tools/url-encoder-decoder/url-encoder-decoder.tsx
components/tools/url-encoder-decoder/url-encoder-decoder.test.tsx
lib/tools/url-encoder-decoder/transform-url.ts
lib/tools/url-encoder-decoder/transform-url.test.ts
tests/url-encoder-decoder-browser.mjs
messages/{ko,en,ja}.json                        # Tools.urlEncoderDecoder 추가
```

- 페이지와 locale metadata는 Server Component에 유지한다.
- 모드·방식·입력·결과·Clipboard 상태만 도구 전용 Client Component에 둔다.
- 변환과 예외 정규화는 React에서 분리한 순수 함수로 구현하고 discriminated union 결과를 반환한다.
- 순수 함수는 `encodeURI`, `encodeURIComponent`, `decodeURI`, `decodeURIComponent`를 선택해 호출하고 `URIError`를 locale 비의존 오류 코드로 바꾼다.
- 홈 카드와 공통 반응형 메뉴는 기존 등록 패턴에 URL Encoder / Decoder를 병렬 추가한다.

### 기존 구조와의 비충돌 확인

- `/{locale}/tools/url-encoder-decoder`는 기존 네 도구와 다른 stable kebab-case slug라 route 충돌이 없다.
- `Tools.urlEncoderDecoder`는 기존 도구 namespace와 병렬로 추가할 수 있다.
- `strict` TypeScript, `@/*` alias, Server/Client Component 경계를 그대로 유지한다.
- 브라우저 표준 URI 함수만으로 모든 Must Have를 구현할 수 있어 API route, Server Action, 데이터베이스가 필요 없다.
- 기존 Vitest, Testing Library와 실제 Chrome QA가 단위·상호작용·브라우저 검증을 지원한다.

### 공통 컴포넌트 판단

- 기존 `Button`의 primary/secondary, disabled와 터치 높이를 재사용한다.
- 입력/결과 textarea와 두 선택 그룹은 요구 시맨틱이 도구 전용이므로 조급하게 범용 컴포넌트로 추상화하지 않는다.
- 기존 Copy 구현들의 오류 처리 패턴은 참고하되, 공통 API가 확정되지 않은 상태에서 기존 도구를 함께 리팩터링하지 않는다.
- 전역 Header와 홈 카드 데이터 구조가 아직 별도 registry가 아니므로 이번 구현은 현재 패턴에 한 항목만 추가하고, registry 리팩터링은 별도 Architect 결정으로 남긴다.

### 주요 기술 위험과 통제

- `decodeURI`와 `decodeURIComponent`는 예약 escape 처리 결과가 다르므로 하나의 Decode 구현으로 합치지 않고 방식별 고정 fixture로 검증한다.
- `+`를 사전 치환하면 일반 Percent Encoding 의미가 바뀌므로 어떠한 기본 경로에서도 `replaceAll('+', ' ')`를 사용하지 않는다.
- `encodeURI*`는 lone surrogate에서, `decodeURI*`는 malformed escape와 invalid UTF-8에서 `URIError`를 던질 수 있으므로 모두 순수 함수 경계에서 catch한다.
- `URL`, `URLSearchParams`는 URL 정규화와 form-style Plus 규칙을 적용할 수 있어 핵심 변환에 사용하지 않는다.
- 긴 URL은 일반 text node가 아니라 textarea에 표시하고 `min-width: 0`, wrap/overflow 조건을 실제 320px Chrome에서 검증한다.
- Decode 결과를 클릭 가능한 링크로 렌더링하지 않아 `javascript:` 같은 입력의 의도치 않은 실행 가능성을 차단한다.

### 의존성 및 성능 판단

- 새 런타임 의존성: 불필요
- 브라우저 API 지원: 프로젝트의 최신 안정 Chrome 기준에서 충분
- fallback/polyfill: 불필요
- 서버·네트워크: 불필요
- 자원 정리: Object URL, worker, timer를 사용하지 않으므로 별도 정리 대상 없음

### Architect 판정

- 구조 충돌: 없음
- URL/locale 충돌: 없음
- 서버 필요성: 없음
- 새 런타임 의존성: 없음
- 기존 기능 영향: 향후 홈 카드·공통 메뉴에 한 항목을 추가하는 범위로 제한 가능
- 기술적 차단 요소: 없음
- Builder 인계 상태: `READY`
