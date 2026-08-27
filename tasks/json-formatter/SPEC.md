# JSON Formatter SPEC

## 문서 상태

- 기능명: JSON Formatter
- 상태: `SPEC READY`
- 우선순위: 두 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-26
- 개선 회차: 최초 구현 전
- 예정 URL: `/{locale}/tools/json-formatter`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 읽기 어려운 JSON을 정렬하거나 전송용으로 압축하고, 결과를 빠르게 복사해야 한다. 잘못된 JSON이 들어왔을 때 입력을 잃지 않으면서 어디를 확인해야 하는지도 이해할 수 있어야 한다. 민감한 JSON이 포함될 수 있으므로 처리는 서버가 아니라 브라우저 안에서 끝나야 한다.

## 2. 대상 사용자

- API 응답과 설정 파일을 읽기 좋게 정리하려는 개발자·테스터
- JSON을 요청 본문이나 문서에 붙이기 전에 압축·복사하려는 사용자
- 모바일에서 작은 JSON 조각을 빠르게 확인하려는 사용자
- JSON을 외부 서버에 업로드하지 않으려는 사용자

## 3. 가치 제안

JSON을 입력하면 브라우저 안에서 원래 데이터 표현을 보존한 채 보기 좋게 정렬하거나 압축하고, 오류를 이해하기 쉬운 형태로 확인한 뒤 결과를 복사할 수 있다.

## 4. 포함 범위

- 여러 줄 JSON 텍스트 입력
- `Format`: 2칸 들여쓰기 형식으로 정렬
- `Minify`: 의미 없는 공백 제거
- `Copy`: 현재 편집기 내용을 클립보드에 복사
- `Clear`: 입력·오류·일시적 피드백 초기화
- 잘못된 JSON에 대한 사용자 친화적 오류 표시
- 빈 입력과 공백만 있는 입력의 정상 처리
- 모바일 우선 반응형 UI와 키보드 조작
- `ko`, `en`, `ja` 인터페이스 및 locale별 SEO metadata
- 브라우저 내부 처리와 개인정보 안내

## 5. 제외 범위

- JSON 자동 수정 또는 오류 복구
- 구문 강조, 코드 에디터, 줄 번호, 접기, 트리 보기
- 키 정렬, 검색, 필터, diff, 스키마 검증
- JSON5, 주석, 후행 쉼표, 작은따옴표 등 비표준 문법
- 파일 업로드·다운로드, URL/API에서 JSON 가져오기
- 저장, 기록, 공유 링크, 로그인, 서버 API, 데이터베이스
- XML/YAML/CSV 등 다른 형식으로 변환

제외 범위의 제안은 현재 기능에 추가하지 않고 `IDEAS.md`에서 별도 검토한다.

## 6. 데이터 및 변환 규칙

### 6.1 유효한 입력

- RFC 8259 계열의 표준 JSON 문법만 허용한다.
- 최상위 값은 객체와 배열뿐 아니라 문자열, 숫자, `true`, `false`, `null`도 허용한다.
- 객체 키는 큰따옴표를 사용해야 한다.
- 주석, 후행 쉼표, 작은따옴표, `undefined`, `NaN`, `Infinity`는 오류다.
- 입력 앞뒤의 의미 없는 공백은 검증에는 영향을 주지 않는다.

### 6.2 Format

- 유효한 비어 있지 않은 JSON에서만 실행한다.
- 들여쓰기는 공백 2칸, 줄바꿈은 `LF`를 사용한다.
- 객체의 colon 뒤에는 공백 1칸을 둔다.
- 객체 멤버와 배열 원소는 깊이에 맞게 줄바꿈하고 들여쓴다.
- 빈 객체와 빈 배열은 각각 `{}`, `[]`로 유지한다.
- 결과 앞뒤에 불필요한 공백이나 마지막 줄바꿈을 추가하지 않는다.
- 같은 입력을 반복 Format해도 결과가 달라지지 않아야 한다.

### 6.3 Minify

- 유효한 비어 있지 않은 JSON에서만 실행한다.
- JSON 문자열 내부의 공백과 escape는 유지하면서 토큰 사이의 의미 없는 공백·탭·줄바꿈만 제거한다.
- 결과 앞뒤에 공백이나 줄바꿈을 추가하지 않는다.
- 같은 입력을 반복 Minify해도 결과가 달라지지 않아야 한다.

### 6.4 데이터 무결성

- Format과 Minify는 객체 키 순서, 중복 키, 문자열의 escape 표기, 숫자 토큰 표기를 변경하지 않는다.
- 예를 들어 `9007199254740993`, `1e+3`, `-0`, `"\uAC00"`은 변환 후에도 동일한 토큰으로 유지한다.
- 구현은 `JSON.parse` 결과를 다시 `JSON.stringify`하는 방식으로 원문을 재생성해서는 안 된다. 이 방식은 큰 정수·숫자 표기·중복 키를 변경할 수 있기 때문이다.
- 검증에는 브라우저의 표준 JSON parser를 사용할 수 있지만, 출력 생성은 JSON 문자열과 escape를 인식하는 토큰 기반 순수 변환으로 수행한다.

### 6.5 빈 입력

- 빈 문자열과 Unicode 공백만 있는 입력을 빈 입력으로 본다.
- 빈 입력은 오류가 아니다.
- 빈 입력에서 Format, Minify, Copy는 disabled이며 실행 결과나 오류를 만들지 않는다.
- 공백만 입력된 상태에서는 Clear가 enabled이고, Clear 후 완전한 빈 문자열이 된다.

## 7. 오류 규칙

- Format 또는 Minify를 실행할 때 JSON이 잘못되었으면 입력을 변경하지 않는다.
- 오류 영역에는 locale별 요약 문구와 해결 안내를 표시한다. 최소 안내는 따옴표, 쉼표, colon, 중괄호·대괄호를 확인하라는 내용을 포함한다.
- parser가 오류 위치를 제공하면 1부터 시작하는 line과 column을 계산해 함께 표시한다. 위치를 얻을 수 없으면 잘못된 위치를 추정하지 않고 일반 안내만 표시한다.
- 원시 브라우저 오류만 단독으로 노출하지 않는다. 원시 메시지를 보조 상세로 사용할 경우 사용자 입력이나 stack trace를 포함하지 않는다.
- 오류는 `role="alert"` 또는 동등한 접근 가능한 방식으로 한 번 알리고 입력과 연결한다.
- 오류 발생 후 사용자가 입력을 수정하면 기존 오류를 제거한다. 다음 Format/Minify 시 다시 검증한다.
- 예상 가능한 JSON 오류와 Clipboard 오류를 console error로 기록하지 않는다.

## 8. Copy 및 Clear 규칙

### Copy

- 현재 편집기의 텍스트를 문자 그대로 복사하며 재검증하거나 변환하지 않는다.
- 비어 있지 않은 입력이라면 JSON 유효 여부와 관계없이 복사할 수 있다.
- 성공 시 locale별 `복사됨` 피드백을 일시적으로 표시하고 스크린 리더가 인지할 수 있게 한다.
- Clipboard API가 거부되거나 지원되지 않으면 입력을 유지하고 이해하기 쉬운 locale별 오류를 표시한다.

### Clear

- 입력, JSON 오류, Clipboard 오류와 복사 성공 피드백을 모두 제거한다.
- 실행 후 입력 영역으로 focus를 돌린다.
- 완전히 빈 초기 상태에서는 disabled다.

## 9. 대표 사용자 흐름

1. 사용자가 locale별 독립 URL로 직접 진입한다.
2. 제목, 설명과 JSON 입력 영역을 확인한다.
3. JSON을 입력하거나 붙여 넣는다.
4. Format 또는 Minify를 선택한다.
5. 유효하면 같은 편집기 안의 텍스트가 변환되고, 잘못되었으면 입력은 유지된 채 오류가 표시된다.
6. 사용자가 현재 편집기 내용을 Copy하거나 Clear한다.

## 10. UI 및 상태 요구사항

- 화면 순서: 제목/설명 → 입력 영역 → Format/Minify/Copy/Clear → 오류 또는 상태 피드백 → 사용 방법/개인정보 안내
- 하나의 textarea를 입력과 변환 결과 편집기로 사용한다. 별도 출력 패널을 추가하지 않는다.
- textarea에는 항상 보이는 label과 설명을 제공하며 placeholder로 label을 대신하지 않는다.
- 버튼의 시각적 우선순위는 Format을 primary, Minify·Copy·Clear를 secondary로 한다.
- 모바일에서는 버튼이 2열 또는 1열로 배치되어 각 터치 대상의 최소 높이 44px을 유지한다.
- 320px 이상에서 가로 스크롤, 버튼·문구 잘림, 겹침 없이 핵심 흐름을 완료할 수 있어야 한다.
- 키보드만으로 textarea와 모든 활성 버튼을 순서대로 사용할 수 있고 focus 표시가 보여야 한다.
- 성공·오류 피드백은 색상만으로 구분하지 않고 텍스트와 의미를 함께 제공한다.
- 처리 중 로딩 상태는 두지 않는다. 변환은 버튼 이벤트 안에서 즉시 완료한다.

## 11. 다국어 및 SEO 요구사항

- 모든 사용자 문구는 `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 동일한 `Tools.jsonFormatter` namespace에서 관리한다.
- 세 locale에서 제목, 설명, textarea label/도움말, 네 버튼, 성공·오류, 사용 방법, 개인정보 안내를 제공한다.
- 각 locale에 고유 title과 description을 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 동일한 `tools/json-formatter` 경로를 가리킨다.
- 페이지의 `<h1>`은 하나이며 기능을 명확하게 설명하는 이름을 사용한다.

## 12. 개인정보·보안·성능

- 입력 JSON은 서버, 외부 API, 분석 서비스로 전송하거나 영구 저장하지 않는다.
- 입력과 오류는 HTML로 해석하거나 비정제 DOM으로 삽입하지 않는다.
- 클립보드 쓰기는 사용자가 Copy를 실행했을 때만 수행한다.
- 이미 열린 페이지는 네트워크 연결 없이 Format, Minify, Clear를 계속 수행할 수 있어야 한다. Clipboard 동작은 브라우저 권한 정책의 영향을 받을 수 있다.
- 입력 길이에 별도 제한은 두지 않는다.
- QA 기준 장비와 최신 안정 Chrome에서 1MB JSON의 Format과 Minify가 각각 250ms 이내 완료되는 것을 목표로 하고 환경과 결과를 기록한다. 목표 미달은 점수에 반영하되 정확성·조작성 실패가 없다면 단독 High 이슈로 분류하지 않는다.

## 13. 수용 기준

1. 초기 빈 입력에서 오류가 없고 Format, Minify, Copy, Clear가 모두 disabled다.
2. 공백만 입력하면 오류가 없고 Format, Minify, Copy는 disabled, Clear는 enabled다.
3. `{"name":"Kim","items":[1,true,null]}`을 Format하면 공백 2칸과 LF를 사용하는 지정 형식이 된다.
4. 여러 줄로 정렬된 유효 JSON을 Minify하면 문자열 내부를 제외한 의미 없는 공백이 제거된다.
5. 빈 객체 `{}`와 빈 배열 `[]`, 그리고 최상위 문자열·숫자·boolean·null이 정상 처리된다.
6. 문자열 안의 공백, escaped quote, backslash와 `\n` escape가 Format/Minify 후 동일하게 유지된다.
7. `9007199254740993`, `1e+3`, `-0`, `"\uAC00"`의 토큰 표기가 변환 후 바뀌지 않는다.
8. 중복 키와 객체 키 순서가 Format/Minify 후 유지된다.
9. 같은 텍스트에 Format 또는 Minify를 반복해도 두 번째 결과가 첫 번째와 동일하다.
10. 주석, 후행 쉼표, 작은따옴표, 누락된 colon·comma·닫는 괄호는 오류로 판정된다.
11. 잘못된 JSON에서 Format/Minify를 실행하면 입력이 유지되고 이해하기 쉬운 locale별 오류가 접근 가능하게 표시된다.
12. 오류 위치를 parser에서 얻을 수 있으면 line/column이 실제 위치와 일치하며, 얻을 수 없으면 일반 오류만 표시된다.
13. 오류 상태에서 입력을 수정하면 기존 오류가 제거되고, 올바르게 고친 뒤 변환하면 성공한다.
14. Copy는 유효 여부와 관계없이 현재의 비어 있지 않은 편집기 내용을 정확히 복사하고 성공 피드백을 표시한다.
15. Clipboard 실패 시 입력을 유지하고 사용자 친화적인 오류를 표시하며 Console Error를 만들지 않는다.
16. Clear는 입력과 모든 피드백을 제거하고 textarea로 focus를 돌린다.
17. 320/375/768/1280px에서 핵심 흐름이 완료되고 가로 스크롤·잘림·겹침이 없다.
18. `ko`, `en`, `ja` URL에서 번역 누락 없이 같은 기능을 제공하고 metadata, canonical, language alternates가 올바르다.
19. 정상·JSON 오류·Clipboard 오류·Clear 흐름에서 Console Error와 처리되지 않은 rejection이 0이다.
20. 입력에 넣은 고유 문자열이 네트워크 요청에 포함되지 않고, offline 상태에서 변환이 계속 동작한다.

## 14. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 순수 함수 단위 테스트: 빈 값, 객체·배열·최상위 primitive, nested 값, 문자열 escape, CRLF 입력, Format/Minify 반복 안정성
- 데이터 무결성 테스트: 큰 정수, exponent, negative zero, Unicode escape, 중복 키, 키 순서
- 오류 테스트: 주석, 후행 쉼표, 작은따옴표, colon/comma/괄호 누락, 오류 위치 계산
- UI 테스트: 버튼 상태, Format, Minify, 유효/무효 Copy, Clipboard 성공·실패, Clear, focus, 오류 제거

필수 테스트에는 fail, skip, todo가 없어야 한다. 기존 Vitest, Testing Library와 Chrome QA 기반을 재사용하며 이 기능만을 위해 새 런타임 의존성을 추가하지 않는다.

### QA 브라우저 검사

- 최신 안정 Chrome production build
- 320/375/768/1280px
- `ko`, `en`, `ja`
- 직접 URL 진입, 새로고침, 뒤로/앞으로 이동
- 키보드 전용 흐름, focus 순서, 오류와 성공 피드백 인지
- 정상·빈 값·공백·잘못된 JSON·반복 변환·Clipboard 실패·반복 Clear
- Console Error, unhandled rejection, 입력 포함 네트워크 요청
- 1MB 성능과 offline 변환

## 15. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 목록 Critical 0, High 0
- 필수 자동 검사와 테스트 전부 PASS
- Console Error 0
- 모바일 PASS
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.

## 16. Architect 검토

### 결론

현재 프로젝트 구조와 충돌 없이 구현 가능하다. 기존 App Router, `next-intl`, Tailwind CSS, locale prefix, Button, Vitest/Testing Library와 Chrome QA 기반을 그대로 활용할 수 있으며 서버 기능이나 새 런타임 의존성이 필요하지 않다.

### 권장 구현 경계

```text
app/[locale]/tools/json-formatter/page.tsx
components/tools/json-formatter/json-formatter.tsx
components/tools/json-formatter/json-formatter.test.tsx
lib/tools/json-formatter/transform-json.ts
lib/tools/json-formatter/transform-json.test.ts
tests/json-formatter-browser.mjs
messages/{ko,en,ja}.json                 # Tools.jsonFormatter 추가
```

- 페이지와 locale별 metadata는 Server Component에 유지한다.
- textarea 상태, Clipboard API와 버튼 상호작용만 도구 전용 Client Component로 격리한다.
- 검증·Format·Minify·오류 위치 계산은 React와 분리한 순수 함수로 구현한다.
- JSON 출력은 token stream을 한 번 순회하며 문자열 내부와 외부를 구분해 생성한다. 표준 검증을 먼저 수행하고 변환 중 예상하지 못한 상태가 생기면 입력을 보존한 오류 결과를 반환한다.

### 기존 구조와의 비충돌 확인

- `/{locale}/tools/json-formatter`는 기존 `word-counter`와 다른 독립 slug라 라우트 충돌이 없다.
- `Tools.jsonFormatter`는 기존 `Tools.wordCounter`와 병렬 namespace로 추가할 수 있다.
- `strict` TypeScript와 `@/*` alias를 그대로 유지할 수 있다.
- 계산·변환이 브라우저 메모리에서 끝나므로 API route, Server Action, 데이터베이스가 필요 없다.
- 기존 테스트 도구가 단위·상호작용·실제 Chrome 검증을 모두 지원하므로 추가 테스트 프레임워크가 필요 없다.

### 공통 컴포넌트 판단

- 기존 `Button`은 primary/secondary, disabled와 44px 높이를 지원하므로 재사용한다.
- 기존 `TextInput`은 단일 행 전용이므로 JSON textarea에 사용하지 않는다.
- 기존 `CopyButton`은 Clipboard 실패 처리, disabled 상태, 도구별 피드백 제어가 없어 그대로 사용하면 SPEC을 충족하지 못한다. 첫 구현은 도구 전용 Copy handler를 사용한다. 향후 두 도구 이상에서 동일한 실패 UX가 확정되면 하위 호환 방식으로 공통 컴포넌트를 확장한다.
- 별도 출력 패널이나 범용 코드 에디터 추상화는 현재 SPEC에 필요하지 않다.

### 주요 기술 위험과 통제

- `JSON.parse` → `JSON.stringify` 재생성은 큰 숫자·중복 키·표기를 바꿀 수 있으므로 금지하고 token 기반 변환 테스트로 방지한다.
- 문자열 내부의 escaped quote와 backslash를 공백으로 오인하지 않도록 tokenizer 상태 전이를 단위 테스트한다.
- browser별 `SyntaxError` 문구가 다를 수 있으므로 사용자 문구는 locale 메시지로 고정하고, 위치 추출 실패는 정상 fallback으로 처리한다.
- Clipboard API는 권한·보안 컨텍스트에 따라 실패할 수 있으므로 rejection을 catch하고 UI 오류로 변환한다.
- layout의 홈 metadata를 상속하지 않도록 도구 페이지에서 canonical과 세 locale alternates를 직접 정의한다.

### Architect 판정

- 구조 충돌: 없음
- 서버 필요성: 없음
- 새 런타임 의존성: 불필요
- 기존 기능 영향: 독립 라우트·namespace로 제한 가능
- Builder 인계 상태: `READY`
