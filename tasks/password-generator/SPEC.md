# 비밀번호 생성기 SPEC

## 문서 상태

- 기능명: 비밀번호 생성기 (Password Generator)
- 상태: `SPEC READY`
- 우선순위: 세 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-26
- 개선 회차: 최초 구현 전
- 예정 URL: `/{locale}/tools/password-generator`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 계정마다 다른 강력한 비밀번호를 빠르게 만들고 정확히 복사해야 한다. 생성 규칙과 강도를 이해할 수 있어야 하며, 입력한 설정이나 생성 결과가 서버로 전송되어서는 안 된다. 문자 유형을 모두 끈 상태나 클립보드·보안 난수 API 실패도 막힘 없이 복구할 수 있어야 한다.

## 2. 대상 사용자

- 가입 또는 비밀번호 변경 중 새 비밀번호가 필요한 사용자
- 서비스의 길이·문자 유형 정책에 맞는 비밀번호가 필요한 사용자
- 모바일에서 즉시 생성하고 복사하려는 사용자
- 비밀번호를 외부 서버에 보내지 않는 도구가 필요한 사용자

## 3. 가치 제안

길이와 문자 유형을 선택하면 브라우저의 보안 난수로 조건에 맞는 비밀번호를 생성하고, 이해하기 쉬운 강도 안내와 함께 바로 복사할 수 있다.

## 4. 포함 범위

- 8–128자 비밀번호 길이 선택
- 대문자, 소문자, 숫자, 특수문자 포함 여부
- 보안 난수 기반 비밀번호 생성
- 선택된 각 문자 유형을 최소 1자 포함
- 생성 결과 표시와 복사
- 생성된 결과의 강도 표시
- 문자 유형 전체 비활성, Web Crypto 실패, Clipboard 실패 처리
- 모바일 우선 UI, 키보드와 보조기기 접근성
- `ko`, `en`, `ja` 인터페이스와 locale별 SEO metadata
- 홈 도구 목록과 공통 메뉴에 발견 가능한 내부 링크 등록
- 브라우저 내부 처리와 개인정보 안내

## 5. 제외 범위

- 계정, 로그인, 서버 API, 데이터베이스, 생성 기록과 동기화
- 사용자가 입력한 기존 비밀번호 분석
- 비밀번호 저장, 자동 완성, 브라우저 비밀번호 관리자 연동
- passphrase/단어 조합, 발음 가능한 비밀번호, PIN 전용 모드
- 문자 직접 제외, 사용자 정의 문자 집합, 유사 문자 제외 옵션
- 여러 비밀번호 일괄 생성, 다운로드, QR 코드, 공유 링크
- 사이트별 비밀번호 정책 자동 판별 또는 준수 보장
- 비밀번호 유출 데이터베이스 조회

제외 범위 제안은 구현하지 않고 `IDEAS.md`에서 별도 검토한다.

## 6. 설정 규칙

### 6.1 초기 상태

- 길이 기본값은 `16`이다.
- 대문자, 소문자, 숫자, 특수문자는 모두 활성화한다.
- 최초 진입 때 비밀번호를 자동 생성하지 않는다.
- 결과 영역에는 locale별 빈 상태 안내를 표시하고 Copy는 disabled다.
- Generate는 활성화한다.

### 6.2 길이

- 허용 범위는 정수 `8–128`이며 step은 `1`이다.
- range input과 number input을 같은 값으로 동기화해 빠른 조절과 정확한 입력을 모두 지원한다.
- 두 입력에는 각각 접근 가능한 label을 제공하고 현재 길이를 텍스트로도 확인할 수 있게 한다.
- number input의 blur 또는 Generate 시 값을 정수로 정규화하고 범위를 벗어나면 가장 가까운 경계값으로 보정한다. 예: `4 → 8`, `200 → 128`, `16.8 → 16`.
- number input이 일시적으로 비어 있거나 숫자가 아니면 설정 오류를 표시하고 Generate를 실행하지 않는다. 마지막 유효값으로 몰래 생성하지 않는다.
- 길이 또는 문자 유형이 바뀌면 기존 결과와 강도·복사 성공 피드백을 제거한다. 화면 설정과 오래된 결과가 일치하지 않는 혼동을 막기 위함이다.

### 6.3 문자 집합

정확한 문자 집합은 다음과 같다.

- 대문자: `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- 소문자: `abcdefghijklmnopqrstuvwxyz`
- 숫자: `0123456789`
- 특수문자: `!@#$%^&*()-_=+[]{};:,.?`

- 활성화된 유형만 후보 집합에 포함한다.
- 생성 결과에는 활성화된 각 유형의 문자가 최소 1개 들어가야 한다.
- 비활성화된 유형의 문자는 결과에 들어가면 안 된다.
- 모든 유형이 비활성화되면 설정 오류를 접근 가능하게 표시하고 Generate를 disabled로 한다.
- 유형 하나를 다시 활성화하면 전체 비활성 오류를 즉시 제거하고 Generate를 활성화한다.

## 7. 보안 난수와 생성 알고리즘

- 브라우저의 `crypto.getRandomValues`만 난수원으로 사용한다.
- `Math.random`, 시간, 순차 counter 또는 서버 생성 fallback을 사용하지 않는다.
- 후보 문자 선택은 modulo bias가 생기지 않도록 rejection sampling 또는 동등한 편향 제거 방식을 사용한다.
- 먼저 활성화된 각 문자 유형에서 최소 1자를 선택하고, 남은 길이를 전체 활성 후보 집합에서 채운다.
- 결과 위치가 유형별 고정 패턴을 드러내지 않도록 Web Crypto 난수 기반 Fisher–Yates 또는 동등한 방식으로 전체 결과를 섞는다.
- 같은 설정으로 반복 Generate하면 매번 새 난수를 요청한다. 테스트에서는 난수원을 주입하거나 mock하여 알고리즘 조건을 결정적으로 검증한다.
- `crypto.getRandomValues`가 없거나 예외를 던지면 결과를 만들거나 약한 난수로 대체하지 않는다. 기존 결과를 제거하고 locale별 친절한 오류와 재시도 안내를 표시한다.
- 예상 가능한 보안 난수 실패는 Console Error로 기록하지 않는다.

## 8. 강도 규칙

- 강도는 현재 생성 결과가 있을 때만 표시하며 `약함 / 보통 / 강함`의 3단계 locale 문구를 사용한다.
- 점수는 활성 후보 집합 크기 `P`와 길이 `L`을 이용한 추정 엔트로피 `E = L × log2(P)`로 결정한다.
- `E < 50`: 약함(Weak)
- `50 ≤ E < 80`: 보통(Medium)
- `E ≥ 80`: 강함(Strong)
- 단계와 함께 locale별 보조 설명을 표시한다. 강도는 추정치이며 특정 서비스 정책 충족이나 절대적 안전을 보장하지 않는다고 안내한다.
- 색상만으로 단계를 구분하지 않고 텍스트와 강도 meter/progress의 접근 가능한 값으로 전달한다.
- 설정 변경 또는 생성 실패로 결과가 제거되면 강도도 빈 상태로 돌아간다.

## 9. Generate 및 Copy 규칙

### Generate

- 유효한 길이와 한 개 이상의 활성 문자 유형이 있을 때만 실행한다.
- 성공 시 새 결과로 교체하고 이전 오류와 복사 피드백을 제거한다.
- 생성 결과는 사용자가 확인할 수 있는 읽기 전용 텍스트로 표시한다. 마스킹 토글은 추가하지 않는다.
- 결과가 길어도 영역 밖으로 넘치지 않고 줄바꿈 또는 가로 내부 스크롤로 전체 문자에 접근할 수 있어야 한다.

### Copy

- 현재 생성 결과를 문자 그대로 Clipboard API로 복사한다.
- 결과가 없으면 disabled다.
- 성공 시 locale별 피드백을 일시적으로 표시하고 스크린 리더가 인지할 수 있게 한다.
- Clipboard API가 없거나 거부되면 결과를 유지하고 locale별 오류와 권한 확인 안내를 표시한다.
- Clipboard 실패를 Console Error로 기록하지 않는다.

## 10. 오류와 상태 규칙

- 상태는 `초기/설정 중`, `결과 있음`, `설정 오류`, `생성 오류`, `복사 성공`, `복사 오류`로 구분한다.
- 오류는 문제와 복구 방법을 함께 설명하고 해당 control 또는 결과와 연결한다.
- 설정 오류와 생성 오류는 `role="alert"` 또는 동등한 접근 가능한 방식으로 알린다.
- Copy 성공은 과도하지 않은 polite live status로, Copy 실패는 alert로 알린다.
- 오류가 해결되는 설정 변경 시 해당 오류를 즉시 제거한다.
- 사용자에게 원시 exception, stack trace 또는 내부 난수 값을 노출하지 않는다.
- 예상 가능한 사용자·브라우저 오류에서 처리되지 않은 Promise rejection이 없어야 한다.

## 11. 대표 사용자 흐름

1. locale별 URL이나 홈/공통 도구 메뉴로 진입한다.
2. 길이와 네 문자 유형의 기본 설정을 확인한다.
3. 필요하면 길이와 유형을 조절한다.
4. Generate를 실행한다.
5. 조건에 맞는 결과와 강도 안내를 확인한다.
6. Copy를 실행하고 성공 피드백을 확인한다.
7. 다른 결과가 필요하면 같은 설정에서 Generate를 반복한다.

## 12. UI 및 접근성 요구사항

- 화면 순서: 제목/설명 → 길이 설정 → 문자 유형 설정 → Generate → 결과 → 강도 → Copy → 보안·사용 안내
- Generate만 primary action이며 Copy는 결과 이후 secondary action이다.
- 네 문자 유형은 checkbox와 항상 보이는 label로 제공한다. switch 역할을 임의로 흉내 내지 않는다.
- 관련 설정은 `fieldset`과 `legend` 또는 동등한 시맨틱 그룹으로 묶는다.
- range와 number input은 같은 현재 값을 공유하되 label이 서로 구분되어야 한다.
- 320px 이상에서 가로 스크롤, 문구·결과·control 잘림, 겹침 없이 핵심 흐름을 완료할 수 있어야 한다.
- 모든 주요 터치 대상은 최소 44×44px을 목표로 하고 checkbox label 전체를 클릭할 수 있게 한다.
- 키보드만으로 길이 조절, checkbox 변경, Generate, Copy를 순서대로 수행하며 focus 표시가 보여야 한다.
- 결과와 강도 변경은 보조기기가 인지할 수 있게 하되 Generate 한 번에 중복 알림하지 않는다.
- 밝은 테마를 사용하며 다크 테마는 범위에 포함하지 않는다.

## 13. 다국어, SEO 및 탐색

- 사용자 문구는 `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 동일한 `Tools.passwordGenerator` namespace에서 관리한다.
- 세 locale에서 제목, 설명, 설정 label, Generate/Copy, 결과, 강도, 모든 오류, 보안·사용 안내를 제공한다.
- 각 locale에 고유 title과 description을 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 동일한 `tools/password-generator` 경로를 가리킨다.
- 페이지에는 기능명을 설명하는 `<h1>` 하나를 둔다.
- 홈 도구 카드와 공통 반응형 도구 메뉴에 세 locale의 비밀번호 생성기 링크를 추가한다. 현재 locale을 유지해야 한다.

## 14. 개인정보·보안·성능

- 설정과 생성 결과는 서버, 외부 API, 분석 서비스로 전송하거나 `localStorage`, 쿠키, IndexedDB 등에 저장하지 않는다.
- 결과를 URL, query string, metadata, 로그 또는 오류 문구에 포함하지 않는다.
- 클립보드 쓰기는 사용자가 Copy를 실행할 때만 수행한다.
- 사용자 노출 값은 HTML로 해석하거나 비정제 DOM으로 삽입하지 않는다.
- 이미 열린 페이지는 offline에서도 설정 변경과 Generate를 수행할 수 있어야 한다. Copy는 브라우저 권한 정책의 영향을 받을 수 있다.
- QA 기준 장비와 최신 안정 Chrome에서 128자 Generate 상호작용이 50ms 이내 완료되는 것을 목표로 하고 환경과 결과를 기록한다.

## 15. 수용 기준

1. 최초 진입 시 길이 16, 네 문자 유형 활성, 결과·강도 없음, Generate 활성, Copy disabled다.
2. range와 number input 변경이 서로 동기화되고 8–128의 모든 정수 길이를 선택할 수 있다.
3. 길이의 범위 초과와 소수는 지정 규칙으로 보정되고, 빈 값·비숫자는 오류와 함께 Generate가 실행되지 않는다.
4. 설정 변경 시 이전 결과, 강도와 복사 성공 피드백이 제거된다.
5. 선택된 각 문자 유형은 생성 결과에 최소 1자 포함되고 비활성 유형은 포함되지 않는다.
6. 생성 결과 길이는 8, 16, 128 설정 각각과 정확히 일치한다.
7. 같은 설정에서 반복 Generate하면 보안 난수 mock이 동일하지 않은 한 새 결과가 생성된다.
8. 모든 유형을 끄면 결과가 제거되고 친절한 오류가 표시되며 Generate와 Copy가 disabled다.
9. 유형을 하나 다시 켜면 오류가 제거되고 Generate가 활성화된다.
10. Web Crypto 미지원·예외 시 약한 fallback 없이 결과를 비우고 친절한 오류를 표시하며 Console Error가 없다.
11. 생성 구현에 `Math.random`을 사용하지 않고 편향 제거 선택과 보안 난수 shuffle을 단위 테스트로 검증한다.
12. 생성 결과가 있을 때만 정의된 엔트로피 경계에 맞는 약함·보통·강함 단계와 보조 설명이 표시된다.
13. 강도는 색상뿐 아니라 텍스트와 접근 가능한 meter 값으로 인지할 수 있다.
14. Copy는 현재 결과를 정확히 복사하고 성공 상태를 접근 가능하게 알린다.
15. Clipboard 미지원·거부 시 결과를 유지하고 친절한 오류를 표시하며 Console Error가 없다.
16. 네 checkbox, 두 길이 control, Generate와 Copy를 키보드로 조작할 수 있고 focus 표시와 label이 명확하다.
17. 320/375/768/1280px에서 생성·강도 확인·복사가 가능하며 가로 스크롤·잘림·겹침이 없다.
18. `ko`, `en`, `ja`에서 번역 누락 없이 같은 기능을 제공하고 metadata, canonical, language alternates가 올바르다.
19. 홈 카드와 공통 메뉴에서 현재 locale의 비밀번호 생성기 URL로 이동할 수 있다.
20. 정상·설정 오류·난수 오류·Clipboard 오류 흐름에서 Console Error와 처리되지 않은 rejection이 0이다.
21. 생성 결과의 고유 문자열이 네트워크·URL·저장소에 포함되지 않고 offline Generate가 동작한다.
22. 128자 생성이 QA 장비에서 목표 시간 안에 완료되고 긴 결과가 모바일 레이아웃을 깨뜨리지 않는다.

## 16. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 순수 함수 테스트: 정확한 문자 집합, 8/16/128 길이, 선택 유형 보장, 비활성 유형 제외, 전체 비활성 오류
- 난수 테스트: 주입된 결정적 난수원, rejection sampling 경계, shuffle, Web Crypto 실패, `Math.random` 비사용
- 강도 테스트: 후보 집합 크기와 길이별 50/80 bit 직전·경계·직후 단계
- UI 테스트: 초기 상태, range/number 동기화·보정·오류, checkbox, 설정 변경 시 결과 제거, 반복 Generate
- Copy 테스트: 정확한 결과, 성공, Clipboard 미지원·거부, 결과 보존
- 접근성 테스트: fieldset/legend, label, disabled, alert/status, meter, focus 흐름
- 탐색 테스트: 홈 카드와 공통 메뉴의 locale 유지 링크

필수 테스트에는 fail, skip, todo가 없어야 한다. 기존 Vitest, Testing Library와 설치된 Chrome QA 기반을 재사용하며 새 런타임 의존성을 추가하지 않는다.

### QA 브라우저 검사

- 최신 안정 Chrome production build
- 320/375/768/1280px, 긴 결과가 의미 있는 모바일 portrait 중심
- `ko`, `en`, `ja`
- 홈 카드·공통 메뉴, 직접 URL, 새로고침, 뒤로/앞으로 이동
- 초기값, 8/16/128, 네 유형 개별·조합·전체 비활성, 반복 생성
- 키보드 전용 흐름, focus 순서, 오류·결과·강도·복사 피드백 인지
- Web Crypto와 Clipboard 실패 모의
- Console Error, unhandled rejection, 결과 포함 네트워크·URL·저장소 검사
- offline Generate와 128자 성능 측정

## 17. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 목록 Critical 0, High 0
- 필수 자동 검사와 테스트 전부 PASS
- Console Error 0
- 모바일 PASS
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.

## 18. Architect 검토

### 결론

현재 구조와 충돌 없이 구현 가능하다. Web Crypto, Clipboard API, App Router, `next-intl`, Tailwind CSS, 기존 Button과 테스트 기반으로 완성할 수 있으며 서버 기능이나 새 런타임 의존성이 필요하지 않다.

### 권장 구현 경계

```text
app/[locale]/tools/password-generator/page.tsx
components/tools/password-generator/password-generator.tsx
components/tools/password-generator/password-generator.test.tsx
lib/tools/password-generator/generate-password.ts
lib/tools/password-generator/generate-password.test.ts
lib/tools/password-generator/password-strength.ts
lib/tools/password-generator/password-strength.test.ts
tests/password-generator-browser.mjs
messages/{ko,en,ja}.json                       # Tools.passwordGenerator
app/[locale]/page.tsx                         # 홈 카드 등록
components/layout/header.tsx                  # 공통 메뉴 등록
```

- locale별 페이지·metadata·안내는 Server Component에 둔다.
- 설정, 결과, 오류, Clipboard 상호작용만 도구 전용 Client Component에 격리한다.
- 문자 집합, 편향 없는 난수 선택, shuffle과 생성은 UI에서 분리한 순수 도메인 모듈로 둔다.
- 난수 함수는 기본적으로 `crypto.getRandomValues`를 사용하되 테스트에서 결정적 공급자를 주입할 수 있는 좁은 인터페이스를 둔다.
- 강도 계산은 생성 로직과 분리해 경계값을 독립적으로 검증한다.

### 데이터 흐름

```text
사용자 설정 → 유효성 검사 → Web Crypto 난수 → 유형별 1자 보장 + 나머지 채움 → 보안 shuffle → 결과
                                                                                ↓
                                                   후보 집합 크기·길이 → 강도 계산
                                                                                ↓
                                                              사용자 동작 시 Clipboard
```

설정과 결과는 Client Component 메모리 밖으로 나가지 않는다. Server Component에는 번역 문자열만 전달하며 결과를 prop, URL 또는 server action으로 전달하지 않는다.

### 기존 구조와의 비충돌 확인

- `/{locale}/tools/password-generator`는 기존 두 도구와 다른 독립 slug로 라우트 충돌이 없다.
- `Tools.passwordGenerator`는 기존 namespace와 병렬 추가 가능하다.
- strict TypeScript, `@/*` alias, locale routing, 정적 생성과 호환된다.
- 현재 최신 Chrome 기준인 `crypto.getRandomValues`와 Clipboard API를 기존 QA 환경에서 검사할 수 있다.
- 홈 카드와 Header 메뉴는 새 항목을 명시적으로 등록하는 현재 구조이므로 기존 링크를 변경하지 않고 확장할 수 있다.

### 공통 컴포넌트 판단

- 기존 `Button`은 Generate와 Copy의 primary/secondary, disabled, 최소 44px 높이에 재사용한다.
- 기존 `CopyButton`은 실패 상태와 결과 없음 제어가 부족하므로 도구 전용 copy handler를 사용한다. 공통 API 변경은 기존 소비자 회귀 위험에 비해 현재 가치가 작다.
- range, number, checkbox, meter는 접근 가능한 네이티브 요소를 도구 전용 UI에서 조합하며 범용 추상화를 새로 만들지 않는다.
- 세 번째 도구 추가로 홈·Header의 하드코딩 목록이 늘지만 아직 세 항목이므로 registry 리팩터링은 범위에서 제외한다. 다음 도구 도입 때 중복 비용을 다시 평가한다.

### 주요 기술 위험과 통제

- `% poolLength`만 사용하는 선택은 modulo bias가 있으므로 rejection sampling을 단위 테스트한다.
- 선택 유형별 문자를 먼저 배치하면 패턴이 노출되므로 생성 뒤 보안 shuffle을 강제한다.
- 테스트가 전역 `crypto`를 불안정하게 바꾸지 않도록 난수 공급자를 함수 인자로 주입한다.
- number input의 빈 중간 상태와 정규화 시점을 분리해 사용자가 입력 중 값이 튀는 문제를 막는다.
- 오래된 결과가 새 설정과 함께 보이지 않도록 모든 설정 변경에서 결과와 강도를 원자적으로 제거한다.
- 긴 결과는 page 전체 가로 overflow를 만들 수 있으므로 break/내부 overflow와 320px Chrome 검사를 필수화한다.
- 강도 표시는 추정치임을 명시해 보안 보장으로 오해하지 않게 한다.

### Architect 판정

- 구조 충돌: 없음
- 서버 필요성: 없음
- 새 런타임 의존성: 불필요
- 공통 컴포넌트 파괴적 변경: 없음
- 기존 기능 영향: 홈·Header 목록에 독립 링크 추가만 필요
- 보안 기준: Web Crypto 전용, 편향 제거, 유형 보장, 보안 shuffle로 확정
- Builder 인계 상태: `READY`
