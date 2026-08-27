# Base64 인코더/디코더 SPEC

## 문서 상태

- 기능명: Base64 인코더/디코더 (Base64 Converter)
- 상태: `SPEC READY`
- 우선순위: 네 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-26
- 개선 회차: 최초 구현 전
- 예정 URL: `/{locale}/tools/base64-converter`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 텍스트를 Base64로 바꾸거나 Base64 바이트를 원문으로 복원해야 한다. UTF-8뿐 아니라 기존 시스템에서 사용하는 EUC-KR, Shift_JIS, Windows-1252 같은 문자 인코딩을 명시적으로 선택할 수 있어야 하며, 표현 불가능한 문자나 잘못된 Base64를 조용히 손실시키지 않아야 한다. 모든 데이터는 브라우저에서만 처리한다.

## 2. 대상 사용자

- API payload, Basic auth 조각, 설정값을 Base64로 변환하는 개발자·테스터
- 한국어·일본어 legacy 시스템과 문자열을 교환하는 사용자
- 파일 도구 없이 모바일에서 짧은 Base64를 확인하려는 사용자
- 민감할 수 있는 텍스트를 외부 서버에 업로드하지 않으려는 사용자

## 3. 가치 제안

모드와 문자 인코딩을 선택하면 브라우저 안에서 문자열과 바이트를 명확히 분리해 안전하게 Base64로 변환하고, 적용되거나 추정된 인코딩과 오류를 이해할 수 있다.

## 4. 우선순위와 범위

### Must Have

- Encode / Decode 모드 전환
- 일반 문자열 → 선택 인코딩의 바이트 → 표준 Base64 Encode
- 표준 Base64 → 바이트 → 선택 인코딩의 문자열 Decode
- 입력과 읽기 전용 결과의 명확한 분리
- 문자 인코딩 dropdown: Auto, UTF-8, UTF-16LE, UTF-16BE, ASCII, ISO-8859-1, Windows-1252, EUC-KR, Shift_JIS
- Auto의 실제 적용 인코딩 또는 감지 한계 표시
- Encode, Decode, Clear, Copy
- 빈 입력 정상 처리, 잘못된 Base64와 표현 불가능 문자 오류
- `ko`, `en`, `ja`, 모바일, 독립 URL·SEO·홈/공통 메뉴 등록
- 로컬 처리와 개인정보 안내

### Should Have — 후속 SPEC 후보

- 입력과 결과 Swap: 반복 변환에는 유용하지만 모드·인코딩을 함께 바꾸는 규칙이 추가되므로 이번 릴리스에는 포함하지 않는다.
- URL-safe Base64: JWT·URL query에 유용하지만 표준 Base64와 검증 규칙이 달라 별도 옵션으로 후속 검토한다.
- Padding 유지/제거: 외부 시스템 호환에 유용하지만 기본 표준 출력은 padding 유지로 충분하다. 후속 옵션으로 검토한다.

### Could Have — 현재 제외

- 입력 예제 불러오기: 첫 사용 이해에는 도움되지만 핵심 변환과 안내만으로 충분하다.
- 자동 변환: 입력 중 오류 소음, legacy encoder 지연 로드와 대용량 반응 비용이 있어 명시적 버튼보다 우선순위가 낮다.

### 제외 범위

- 파일 업로드·다운로드, 이미지·Data URL 미리보기
- Base64URL, MIME 헤더, PEM, JWT 분석
- 자동 변환, Swap, 예제, padding 토글의 최초 구현
- 인코딩 직접 입력, 목록 외 문자 인코딩
- 서버 API, 저장, 기록, 공유 링크, 로그인
- 암호화·해시·압축 기능 또는 Base64를 보안 기능으로 설명하는 문구

후속 항목은 승인 없이 구현하지 않고 `IDEAS.md`에서 별도로 관리한다.

## 5. 초기 상태와 모드

- 기본 모드는 `Encode`, 기본 문자 인코딩은 `Auto`다.
- 최초 진입 시 입력과 결과는 비어 있고 오류가 없다.
- 빈 입력에서는 Encode/Decode 실행 버튼과 Copy가 disabled이며 Clear도 disabled다.
- Auto + Encode의 적용 안내는 입력 전에도 `자동 · UTF-8 사용`에 해당하는 locale 문구로 표시한다.
- Encode와 Decode는 segmented control 또는 동등한 두 개의 명확한 버튼으로 제공하고 현재 모드를 `aria-pressed`, tab 또는 동등한 시맨틱으로 전달한다.
- 모드 전환 시 입력, 결과, 오류, Copy 피드백을 모두 지운다. 다른 의미의 기존 입력을 새 모드에서 실수로 실행하는 것을 막는다.
- 인코딩을 변경하면 입력은 유지하되 기존 결과, 적용 인코딩, 오류와 Copy 피드백을 제거한다.

## 6. 입력·출력 및 동작

### Encode

- 입력은 일반 Unicode 문자열이다.
- 실행 순서는 반드시 `문자열 → 선택 문자 인코딩의 Uint8Array → Base64 문자열`이다.
- Unicode 문자열을 `btoa`에 직접 넘기지 않는다.
- 성공한 결과는 ASCII 표준 Base64 문자열이며 줄바꿈을 추가하지 않는다.
- 출력 padding `=`은 RFC 4648 계열의 표준 길이에 맞게 유지한다.

### Decode

- 입력은 표준 Base64 문자열이다.
- 실행 순서는 반드시 `Base64 문자열 → Uint8Array → 선택/감지 문자 인코딩의 문자열`이다.
- `atob` 결과를 일반 문자열 결과로 직접 사용하지 않는다.
- 입력의 ASCII 공백, tab, CR, LF는 제거한 뒤 검증한다. 그 밖의 Unicode 공백은 허용하지 않는다.
- 표준 alphabet `A–Z a–z 0–9 + /`와 끝부분 padding만 허용한다. `-`, `_`인 URL-safe alphabet은 오류다.
- 올바르게 padded된 값과 padding이 생략된 표준 alphabet 값은 모두 허용한다. 내부에서 필요한 `=`을 보완하되 원 입력은 바꾸지 않는다.
- 길이 modulo 4가 1인 값, 중간 padding, padding 3개 이상, alphabet 밖 문자는 오류다.
- non-zero padding bits처럼 다른 문자열이 같은 바이트로 해석되는 비정규 표현은 오류로 처리한다. Decode 후 표준 Base64로 재인코딩해 padding을 제외한 정규형이 입력 정규형과 같은지 확인한다.

### Clear

- 입력, 결과, 적용 인코딩 결과, 오류, Copy 피드백을 지우고 현재 모드와 선택 인코딩은 유지한다.
- 실행 뒤 현재 모드의 입력 textarea로 focus를 돌린다.
- 입력과 결과·피드백이 모두 없는 초기 상태에서는 disabled다.

### Copy

- 현재 결과를 문자 그대로 Clipboard API로 복사한다.
- 결과가 없으면 disabled다.
- 성공은 locale별 polite status로 알린다.
- 미지원·권한 거부 시 결과를 유지하고 친절한 locale별 오류를 alert로 표시한다.
- Clipboard 오류를 Console Error로 기록하지 않는다.

## 7. 문자 인코딩 정의

UI 값과 정확한 의미는 다음과 같다.

| UI 옵션 | 내부 canonical ID | Encode 의미 | Decode 의미 |
|---|---|---|---|
| 자동 감지 | `auto` | UTF-8 사용 | 보수적 자동 감지 |
| UTF-8 | `utf-8` | BOM 없이 UTF-8 | UTF-8, BOM이 있으면 제거 |
| UTF-16LE | `utf-16le` | BOM 없이 little-endian | little-endian, matching BOM 제거 |
| UTF-16BE | `utf-16be` | BOM 없이 big-endian | big-endian, matching BOM 제거 |
| ASCII | `ascii` | U+0000–U+007F만 허용 | byte 00–7F만 허용 |
| ISO-8859-1 | `iso-8859-1` | ISO-8859-1의 00–FF | 각 byte를 동일한 U+0000–U+00FF로 복원 |
| Windows-1252 | `windows-1252` | Windows code page 1252 | Windows code page 1252 |
| EUC-KR | `euc-kr` | WHATWG/CP949 호환 mapping | 같은 mapping으로 복원 |
| Shift_JIS | `shift_jis` | WHATWG/Windows-31J 호환 mapping | 같은 mapping으로 복원 |

- ASCII와 ISO-8859-1은 Windows-1252의 UI 별칭으로 합치지 않는다. 특히 U+0080–U+009F와 `€`, smart quote의 결과 차이를 테스트한다.
- UTF-16 Encode는 BOM을 자동 추가하지 않는다. Auto Decode는 입력 바이트에 BOM이 있으면 이를 우선 사용한다.
- Unicode normalization을 임의 수행하지 않는다. combining sequence와 원문 code point를 유지한다.

## 8. 표현 불가능 문자와 잘못된 바이트

- 선택 인코딩으로 원문을 표현할 수 없으면 `?`, replacement byte 또는 유사 문자로 바꿔 성공 처리하지 않는다.
- Encode는 `encode → 같은 인코딩으로 strict decode`한 결과가 원문과 code point 단위로 같은지 검증한다. 다르면 결과를 만들지 않고 해당 인코딩으로 표현할 수 없다는 오류와 UTF-8 선택 안내를 표시한다.
- ASCII는 non-ASCII code point가 하나라도 있으면 즉시 오류다.
- ISO-8859-1은 U+00FF를 넘는 code point가 하나라도 있으면 오류다.
- Decode는 가능한 경우 fatal/strict 모드를 사용한다. replacement character가 입력 자체의 정상 문자와 구분되지 않는 구현에서는 `decode → re-encode` byte equality로 손실을 검증한다.
- invalid UTF-8, 홀수 길이 UTF-16, 잘못된 surrogate, 불완전 EUC-KR/Shift_JIS sequence, Windows-1252 undefined byte는 오류다.
- 오류 시 입력을 바꾸지 않고 기존 결과를 제거한다.

## 9. Auto 규칙

### Encode Auto

- 문자열만으로 원래 인코딩을 추정하지 않는다.
- 항상 UTF-8을 사용한다.
- 결과 근처에 locale별 `자동 · UTF-8 사용` 문구를 표시한다.

### Decode Auto

Base64를 엄격히 검증해 byte array로 만든 다음 아래 순서만 수행한다.

1. UTF-8 BOM `EF BB BF`, UTF-16LE BOM `FF FE`, UTF-16BE BOM `FE FF`를 확인한다. 있으면 해당 인코딩으로 strict decode하고 `BOM 감지`임을 표시한다.
2. BOM이 없으면 UTF-16LE/BE의 alternating zero-byte 패턴이 충분히 뚜렷하고 strict round trip이 일치하는지 먼저 확인한다. UTF-16 ASCII 문자의 바이트는 NUL을 포함한 채 UTF-8 문법에도 맞을 수 있으므로 이 패턴 검사가 일반 UTF-8보다 먼저다. 일치하면 `낮은 신뢰도의 추정`으로 표시한다.
3. 위 UTF-16 패턴이 아니면 UTF-8 strict decode를 시도한다. 성공하면 `자동 추정 · UTF-8`로 표시한다. ASCII-only byte도 UTF-8 fallback으로 본다.
4. 그 밖의 legacy byte는 EUC-KR, Shift_JIS, ISO-8859-1, Windows-1252 사이를 신뢰성 있게 확정할 정보가 부족하므로 임의 점수로 단정하지 않는다. 결과를 만들지 않고 `자동 감지로 확정할 수 없음`과 명시적 인코딩 선택 안내를 표시한다.

- Auto는 추정 인코딩을 확정된 원본 정보처럼 표현하지 않는다. 표시 상태는 `사용`, `BOM 감지`, `추정`, `낮은 신뢰도`, `확정 불가`를 구분한다.
- 사용자가 명시 인코딩을 선택하면 자동 추정 문구 대신 `적용 인코딩 · {encoding}`을 표시한다.
- automatic detection을 위해 별도 통계/ML charset detector를 추가하지 않는다. 오탐을 늘리고 번들·설명 비용을 키우기 때문이다.

## 10. 오류 및 상태

- 상태는 `빈 상태`, `입력 있음`, `성공`, `Base64 오류`, `표현 불가`, `잘못된 byte sequence`, `자동 감지 확정 불가`, `라이브러리 로드/인코딩 미지원`, `Copy 성공/실패`로 구분한다.
- 잘못된 Base64 오류는 alphabet, padding 또는 길이를 확인하라는 locale별 복구 안내를 포함한다.
- 표현 불가 오류는 현재 인코딩 이름과 UTF-8 등 다른 인코딩 선택 안내를 포함한다.
- 자동 감지 확정 불가는 입력 오류로 단정하지 않고 dropdown에서 인코딩을 직접 선택하라고 안내한다.
- 오류는 `role="alert"` 또는 동등한 방식으로 알리고 입력 및 관련 dropdown과 연결한다.
- 입력 수정, 모드 전환, 인코딩 변경 시 기존 오류와 Copy 피드백을 제거한다.
- 원시 exception, stack trace, 입력 전문을 오류에 노출하지 않는다.
- 예상 가능한 오류는 Console Error 또는 unhandled rejection을 만들지 않는다.

## 11. UI 및 접근성

- 화면 순서: 제목/설명 → 모드 전환 → 문자 인코딩 dropdown/적용 안내 → 입력 → 실행/Clear → 결과 → 적용 인코딩 → Copy → 도움말/개인정보
- Encode에서는 입력 label이 `일반 문자열`, 결과 label이 `Base64 결과`에 해당하는 locale 문구다.
- Decode에서는 입력 label이 `Base64 문자열`, 결과 label이 `디코딩 결과`에 해당하는 locale 문구다.
- 입력과 결과는 별도 textarea로 제공한다. 결과는 read-only이며 placeholder로 label을 대신하지 않는다.
- 실행 버튼만 primary, Clear와 Copy는 secondary다.
- dropdown은 실행 버튼보다 시각적으로 강조하지 않고 label·도움말을 제공한다.
- 적용 인코딩 문구는 결과 영역 가까이에 항상 고정된 자리를 두어 layout shift를 줄인다.
- 320px 이상에서 dropdown, 두 textarea, 버튼, 긴 Base64와 Unicode 결과가 문서 가로 overflow·잘림·겹침을 만들지 않아야 한다.
- 버튼과 dropdown은 최소 높이 44px이며 키보드만으로 모드, dropdown, 입력, 실행, Clear, Copy를 사용할 수 있다.
- focus 표시를 숨기지 않고 결과·적용 인코딩·오류·Copy 상태를 보조기기가 인지할 수 있게 한다.

## 12. 다국어, SEO 및 탐색

- 문구는 세 message 파일의 동일한 `Tools.base64Converter` namespace에서 관리한다.
- `ko`, `en`, `ja`에 제목, 설명, 모드, 인코딩 이름·상태, input/result label, 버튼, 모든 오류, 안내를 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 `tools/base64-converter`를 가리킨다.
- 페이지에는 명확한 `<h1>` 하나와 검색 가능한 사용·문자 인코딩 설명을 둔다.
- 홈 카드와 공통 반응형 메뉴에 현재 locale을 유지하는 Base64 링크를 등록한다.

## 13. 개인정보·보안·성능

- 입력, byte array와 결과를 서버·외부 API·분석 서비스로 전송하거나 URL·쿠키·localStorage·sessionStorage·IndexedDB에 저장하지 않는다.
- Base64는 암호화가 아니라 표현 형식임을 안내한다.
- 입력과 결과는 HTML로 해석하거나 비정제 DOM으로 삽입하지 않는다.
- legacy encoding 구현은 Base64 Converter의 client chunk에만 포함하며 다른 페이지 초기 bundle에 포함하지 않는다.
- `iconv-lite`와 browser Buffer shim은 명시적 legacy encoding을 실행할 때 지연 로드하는 것을 목표로 한다. 불가능하면 Base64 route의 실제 gzip bundle 증가량을 측정해 250KB를 넘을 경우 Architect 재검토를 받는다.
- 이미 열린 페이지는 offline에서도 UTF-8과 이미 로드된 legacy encoding 변환을 수행해야 한다. 최초 legacy 동적 chunk가 아직 로드되지 않은 offline 상태는 친절한 로드 오류를 표시하며 앱이 깨지면 안 된다.
- QA 장비 최신 Chrome에서 1MB UTF-8 Encode/Decode 각각 250ms 이내, 256KB EUC-KR·Shift_JIS round trip 각각 500ms 이내를 목표로 측정한다.

## 14. 수용 기준

1. 초기 Encode/Auto 상태에서 입력·결과·오류가 비고 실행·Copy·Clear가 disabled이며 `자동 · UTF-8 사용`이 보인다.
2. 모드 변경 시 label과 primary action이 바뀌고 입력·결과·오류·피드백이 초기화된다.
3. 인코딩 변경 시 입력은 유지되지만 기존 결과·오류·Copy 피드백은 제거된다.
4. ASCII, 한글, 일본어, 숫자·특수문자, emoji, 여러 줄 문자열이 UTF-8 Encode 후 Decode되어 code point가 같은 원문으로 복원된다.
5. Encode Auto는 입력 언어와 관계없이 UTF-8을 사용하고 적용 문구가 이를 명확히 표시한다.
6. Decode Auto는 BOM을 우선하고, BOM 없는 valid UTF-8을 추정으로 표시하며 legacy가 모호하면 확정 불가 오류를 낸다.
7. UTF-16LE와 UTF-16BE가 non-ASCII·emoji를 포함한 문자열을 BOM 없이 각각 올바른 byte order로 round trip한다.
8. ASCII는 ASCII 입력을 round trip하고 한글·일본어·emoji·U+0080 이상을 표현 불가 오류로 거부한다.
9. ISO-8859-1은 U+0000–U+00FF를 round trip하고 `€`처럼 범위 밖 문자를 거부한다.
10. Windows-1252는 `€`, smart quote를 정의된 byte로 round trip하며 ISO-8859-1과 결과가 구분된다.
11. EUC-KR은 `안녕하세요`를 Encode/Decode round trip하고 emoji·표현 불가 문자를 오류로 거부한다.
12. Shift_JIS는 `こんにちは`를 Encode/Decode round trip하고 한글·emoji·표현 불가 문자를 오류로 거부한다.
13. Base64 결과는 표준 alphabet과 필요한 `=` padding을 유지하며 줄바꿈이 없다.
14. Decode는 올바른 padded/unpadded Base64와 ASCII 공백 포함 입력을 처리한다.
15. 잘못된 alphabet, URL-safe 문자, modulo 4 길이 1, 중간/과다 padding, non-zero padding bits는 입력 보존과 친절한 오류로 처리한다.
16. 잘못된 UTF-8, 홀수 UTF-16, 불완전 EUC-KR/Shift_JIS 및 정의되지 않은 Windows-1252 byte를 손실 없이 오류 처리한다.
17. 빈 문자열과 ASCII 공백만 있는 입력은 오류가 아니며 실행·Copy가 disabled, 공백 입력에서는 Clear만 enabled다.
18. Clear는 입력·결과·오류·피드백을 지우고 입력으로 focus를 돌린다.
19. Copy는 결과를 문자 그대로 복사하고 성공을 알리며, 거부/미지원 시 결과 유지·친절한 오류·Console Error 0을 만족한다.
20. 입력과 결과에 한글·일본어·emoji·여러 줄·긴 문자열이 있어도 HTML로 해석되거나 layout이 깨지지 않는다.
21. 320/375/768/1280px에서 dropdown·입력·결과·모드·버튼 핵심 흐름이 가능하고 문서 가로 overflow·잘림·겹침이 없다.
22. 키보드만으로 전체 흐름을 완료하고 label, read-only 결과, 적용 인코딩, 오류와 상태를 보조기기가 인지한다.
23. `ko/en/ja` URL의 기능·번역·metadata·canonical·hreflang과 홈/공통 메뉴 링크가 올바르다.
24. 정상·Base64·표현 불가·자동 감지·legacy load·Clipboard 오류에서 Console Error와 unhandled rejection이 0이다.
25. 입력·결과 고유 문자열이 네트워크·URL·저장소에 없고 offline 오류가 통제된다.
26. 지정한 UTF-8·legacy 성능과 Base64 route bundle 예산을 측정해 기록한다.

## 15. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- bundle/chunk 크기 측정과 다른 도구 route에 legacy encoder가 포함되지 않았는지 검사

### 순수 로직 테스트

- byte array ↔ canonical Base64: 0/1/2/3-byte 경계, padding, unpadded, whitespace, 잘못된 alphabet·padding bits
- UTF-8: 영문, 한글, 일본어, 숫자·특수문자, emoji, combining 문자, 여러 줄
- UTF-16LE/BE: byte order, BOM 유무, surrogate pair, 홀수 byte 오류
- ASCII, ISO-8859-1, Windows-1252의 경계와 서로 다른 mapping
- EUC-KR 한글 round trip·불완전 sequence·표현 불가 문자
- Shift_JIS 일본어 round trip·불완전 sequence·표현 불가 문자
- Auto: Encode UTF-8 고정, 세 BOM, valid UTF-8, ASCII fallback, UTF-16 heuristic, legacy ambiguity
- 모든 explicit encoding은 `원문 → Encode → Decode → 원문`을 검증

### UI 테스트

- 초기/공백 상태와 버튼 disabled, 모드 변경, dropdown 변경, label 변화
- 성공 결과, 적용/추정 인코딩 상태, 결과 read-only
- Base64·표현 불가·자동 감지·library load 오류와 입력 보존·수정 시 해제
- Clear/focus, Copy 성공·미지원·거부
- 홈 카드와 공통 메뉴의 현재 locale 링크

### QA 실제 Chrome

- production build, 320/375/768/1280px, `ko/en/ja`
- QA 필수 13개 내용: 영문 ASCII, 한글, 일본어, 숫자·특수문자, emoji, 여러 줄, 빈 값, 잘못된 Base64, padding 값, 표현 불가 문자, UTF-8/EUC-KR/Shift_JIS round trip
- ISO-8859-1과 Windows-1252 구분, UTF-16 byte order, Auto 상태
- 직접 URL·홈·Header·새로고침·뒤로/앞으로, 키보드, Clipboard 거부, offline legacy load 전/후
- Console/page error, unhandled rejection, 요청·URL·모든 storage 유출
- UTF-8·legacy 성능, route chunk 크기, 모바일 overflow와 화면 증거

필수 테스트에는 fail, skip, todo가 없어야 한다.

## 16. 완료 조건

- TypeScript 오류 0
- Critic 점수 90/100 이상
- Critical 0, High 0
- 필수 자동 검사와 모든 지원 인코딩 테스트 PASS
- 한글·일본어·emoji와 UTF-8/EUC-KR/Shift_JIS round trip PASS
- Console Error와 unhandled rejection 0
- 모바일 PASS
- 잘못된 입력·표현 불가·API/동적 load 실패에서 앱 안정성 PASS
- 26개 수용 기준 모두 QA 실행 증거 연결
- 최대 개선 5회 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 자체 승인하지 않는다. Critic과 QA 증거가 모두 충족된 경우에만 Product Owner가 `DONE`을 기록한다.

## 17. Architect 검토

### 결론

독립 route, Client Component, 순수 byte/Base64 모듈로 기존 구조와 충돌 없이 구현할 수 있다. 다만 브라우저 네이티브 `TextEncoder`는 UTF-8 Encode만 제공하므로 요구된 모든 명시 인코딩의 양방향 변환에는 검증된 라이브러리가 필요하다. 서버 구현은 필요하지 않다.

### 라이브러리 결정

- Decode는 최신 Chrome의 `TextDecoder(label, {fatal:true})`가 UTF-8, UTF-16LE/BE, Windows-1252, EUC-KR, Shift_JIS를 지원하므로 가능한 범위에서 네이티브를 우선한다.
- Encode의 legacy encoding에는 `iconv-lite` stable `0.7.x` 사용을 승인한다. 이 라이브러리는 UTF-16BE, ISO-8859 family, Windows-125x, EUC-KR/CP949와 Shift_JIS/CP932 양방향 mapping을 제공한다.
- browser build에는 Buffer shim이 필요할 수 있으므로 `buffer`의 직접 의존 여부를 최소 proof build에서 확인한다. 필요할 때만 승인 범위에 포함한다.
- 전체 라이브러리의 browser 비용이 크므로 Base64 route client에서 dynamic import하고 UTF-8 기본 흐름과 다른 도구 bundle에 포함하지 않는다.
- `@kayahr/text-encoding`도 모듈별 로드가 가능한 경량 후보로 검토했으나 WHATWG label 규칙에 따라 ASCII·ISO-8859-1을 Windows-1252로 합친다. 이번 SPEC은 세 옵션의 strict 의미와 차이를 요구하므로 채택하지 않는다.
- Builder는 설치 전에 현재 stable 정확한 버전, MIT license, lockfile, `npm audit`, Next production browser build를 확인한다. bundle 250KB gzip 예산 또는 browser 호환에 실패하면 임의 polyfill을 늘리지 않고 Architect 재검토로 되돌린다.

### 권장 구현 경계

```text
app/[locale]/tools/base64-converter/page.tsx
components/tools/base64-converter/base64-converter.tsx
components/tools/base64-converter/base64-converter.test.tsx
lib/tools/base64-converter/base64.ts
lib/tools/base64-converter/base64.test.ts
lib/tools/base64-converter/character-encoding.ts
lib/tools/base64-converter/character-encoding.test.ts
lib/tools/base64-converter/detect-encoding.ts
lib/tools/base64-converter/detect-encoding.test.ts
tests/base64-converter-browser.mjs
messages/{ko,en,ja}.json                       # Tools.base64Converter
app/[locale]/page.tsx                         # 홈 카드
components/layout/header.tsx                  # 공통 메뉴
package.json / lockfile                       # 승인된 encoding 의존성
```

- page와 metadata는 Server Component에 둔다.
- 모드, dropdown, text, 결과, feedback만 도구 전용 Client Component가 관리한다.
- Base64 parser는 encoding과 분리한 dependency-free 순수 함수로 둔다.
- character encoding adapter는 native와 legacy library 차이를 숨기되 canonical ID와 실제 적용 encoding을 결과에 반환한다.
- 자동 감지는 별도 순수 모듈로 분리하고 confidence/status를 명시적 union type으로 반환한다.

### 기존 구조와 비충돌 확인

- `/{locale}/tools/base64-converter`는 기존 세 도구와 slug 충돌이 없다.
- `Tools.base64Converter`는 기존 namespace와 병렬 추가 가능하다.
- locale 정적 생성, canonical/hreflang, strict TypeScript, `@/*` alias와 호환된다.
- 홈과 Header는 현재 명시적 tool list이므로 링크 하나를 추가할 수 있다. 목록이 네 개가 되어 Header overflow를 320/375 및 세 locale에서 특별히 검사한다.
- Button은 재사용 가능하다. 기존 CopyButton은 실패·disabled·도구 상태 제어가 부족해 전용 handler를 유지한다.
- textarea, mode selector, dropdown은 도구 전용 조합으로 두고 성급한 공통 abstraction을 만들지 않는다.

### 주요 기술 위험과 통제

- Base64를 Unicode 문자열에 직접 `btoa/atob`하면 깨지므로 byte boundary를 강제하고 한글·일본어·emoji 테스트로 막는다.
- legacy encoder가 replacement byte로 손실시킬 수 있으므로 encode/decode round trip equality를 성공 조건으로 둔다.
- TextDecoder의 WHATWG alias가 ASCII·ISO를 Windows-1252로 바꾸므로 strict ASCII와 실제 ISO-8859-1 semantics를 adapter와 경계 테스트로 보장한다.
- 자동 감지는 원본 metadata가 없어 본질적으로 불확실하므로 BOM·strict UTF만 확정/추정하고 모호한 legacy는 사용자가 선택하게 한다.
- 큰 byte array를 spread해 call stack/memory 오류를 내지 않도록 Base64 변환은 chunk 처리 또는 TypedArray Base64 API feature detection을 사용한다.
- dynamic import 실패와 offline 최초 legacy 선택은 예상 가능한 UI 오류로 처리한다.
- 네 번째 Header 항목은 작은 화면에서 내부 nav scroll은 허용하되 문서 전체 overflow와 발견성 저하는 허용하지 않는다.

### Architect 판정

- 구조 충돌: 없음
- 서버 필요성: 없음
- 새 런타임 의존성: 조건부 승인 (`iconv-lite` 0.7.x, 필요 시 `buffer`)
- 브라우저 네이티브 우선: Decode와 UTF-8 Encode
- 자동 감지: 보수적 BOM/UTF 기반, legacy 추정 강요 금지
- bundle gate: Base64 route gzip 증가 250KB 이하, 다른 tool route 격리
- Builder 인계 상태: `READY WITH DEPENDENCY PROOF GATE`
