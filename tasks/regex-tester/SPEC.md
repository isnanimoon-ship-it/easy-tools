# 정규식 테스터 / Regex Tester SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- 예정 URL: `/{locale}/tools/regex-tester`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P0
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현 → Critic → QA → Optimizer 1 → Critic·QA 재검증 완료
- 구현 상태: 완료 (`PROGRESS.md`의 정규식 테스터 완료 기록 참조)

## 1. 목적과 사용자 가치

사용자가 JavaScript 정규표현식 pattern, flags와 테스트 문자열을 입력하면 브라우저 안에서 유효성을 검사하고, 매치 위치·캡처 그룹·named group·치환 결과를 확인하게 한다. 결과는 ECMAScript `RegExp`와 `String.prototype.replace()`의 실제 동작을 따르며 PCRE, Python, Java 호환을 주장하지 않는다.

핵심 성공 기준은 다음과 같다.

1. 정상 입력의 match value, UTF-16 index, captures, named groups, replacement가 현재 브라우저 JavaScript 결과와 같다.
2. invalid regex, zero-length match와 대량 결과에서 앱·Worker·console이 깨지지 않는다.
3. catastrophic backtracking 후보가 메인 UI를 멈추지 않고 timeout으로 중단된다.
4. pattern, test text, replacement를 서버·외부 API·URL·브라우저 저장소에 보내거나 저장하지 않는다.

## 2. 대상 사용자와 대표 작업

- JavaScript 정규식을 작성·디버깅하는 개발자
- 이메일, 날짜, 숫자, URL, 로그 문자열의 패턴을 확인하는 일반 사용자
- numbered/named capture group과 replacement 문법을 학습하는 사용자
- 모바일에서 짧은 정규식을 빠르게 확인하는 사용자

대표 흐름은 `Pattern 입력 → flags 선택 → Test String 입력 → highlight/match 확인 → 필요 시 Replace 미리보기`다.

## 3. 범위와 우선순위

### Must Have

- pattern 전용 입력란. `/.../flags`가 아닌 pattern 문자열을 그대로 `new RegExp(pattern, flags)`에 전달
- flags `g`, `i`, `m`, `s`, `u`, `y`; 기본 `g=true`, 나머지 false
- 각 flag의 짧고 정확한 설명
- 300ms debounce 자동 검증·실행
- valid/invalid 상태와 안전한 원본 `SyntaxError.message`
- 여러 줄 Test String textarea
- 별도 Match Preview 영역의 highlight
- match 총수 또는 제한 도달 시 `10,000+` 표시
- match 순번, 전체 value, 시작/끝 UTF-16 index
- numbered captures와 named captures
- unmatched optional capture를 `—`로 표시
- zero-length match 위치 표시 및 무한 반복 방지
- `g` 없음은 첫 match만, `g` 있음은 전체 match라는 설명과 실제 동작
- `y`는 `lastIndex=0`에서 sticky semantics를 그대로 적용
- Replace 입력과 원본과 분리된 결과 preview
- JavaScript replacement token `$$`, `$&`, ``$` ``, `$'`, `$1`~`$99`, `$<name>`
- Quick Reference와 이메일·숫자·날짜·URL·한국 휴대전화 예제
- pattern, `/pattern/flags`, replacement result 복사 및 실패 처리
- Web Worker 실행, 1,000ms timeout과 Worker terminate/recreate
- 합리적 입력·결과 제한과 제한 안내
- 한국어·영어·일본어, 독립 URL, metadata/canonical/hreflang, 홈·메뉴 연결
- 320px 이상 모바일, keyboard, label, live status/error
- 입력의 서버·외부 요청·storage 전송/저장 0

### Should Have — 첫 구현에 포함

- 예제 선택 시 pattern과 권장 flags만 적용하고 사용자의 test text는 덮어쓰지 않음
- `/pattern/flags` 전체 복사
- match list 접기/펼치기 또는 첫 200개 렌더 제한
- preview는 첫 1,000 matches만 highlight하고 제한 사실 표시
- 빈 pattern도 JavaScript에서 유효한 정규식임을 설명
- timeout 후 자동 실행을 잠시 멈추고 사용자가 pattern/text를 바꾸거나 명시적 재실행하도록 함

### Could Have — 별도 승인 필요

- `/pattern/gi` 전체 붙여넣기 자동 분리
- `d`(hasIndices) flag UI
- `v`(Unicode sets) flag UI
- 실행 시간 표시
- share URL
- match/result JSON export
- 여러 테스트 케이스 표

### Do Not Build — 첫 버전

- AI 정규식 설명·생성
- PCRE, Python, Java, .NET 가짜 호환 모드
- 서버 실행 또는 외부 regex API
- pattern/test/replacement 자동 저장, 최근 기록
- URL query/hash에 입력 삽입
- textarea 위에 겹치는 mirrored highlight layer
- lint 기반으로 ReDoS 안전을 보장한다는 표현

## 4. Product Owner 결정

| 항목 | 분류 | 결정 |
|---|---|---|
| 실시간 Match | Must | 300ms debounce로 자동 실행한다. |
| Match Highlight | Must | 별도 preview를 사용한다. |
| Capture/Named Group | Must | JavaScript exec 결과를 그대로 구조화한다. |
| Replace | Must | `String.prototype.replace` 동작을 worker에서 실행한다. |
| Quick Reference | Must | 확실한 문법만 간결하게 제공한다. |
| Example Regex | Must | 간단한 예시이며 완전한 검증식으로 홍보하지 않는다. |
| Copy | Must | pattern, literal, replacement result를 구분한다. |
| Share URL | Could | 민감 정보 유출 위험 때문에 기본 범위에서 제외한다. |
| Regex 자동 설명/생성 | Do Not Build | 오해 가능한 추론 기능이며 핵심 테스터가 아니다. |
| PCRE/Python/Java | Do Not Build | 엔진 의미가 달라 별도 도구가 필요하다. |

## 5. 입력 계약과 제한

### Pattern

- 입력값은 JavaScript string으로 이미 존재하는 사용자 텍스트이며 추가 escape/unescape하지 않는다.
- 사용자가 `\d+`라고 보이는 두 문자 `\`와 `d`를 입력하면 그대로 `new RegExp(pattern, flags)`에 전달한다.
- pattern 최대 길이: 10,000 UTF-16 code units.
- 빈 pattern은 유효하며 `(?:)`와 같은 zero-length 동작을 보인다. 오류로 취급하지 않는다.
- `/foo/gi`를 입력하면 slash도 pattern 일부다. 첫 버전은 자동 분리하지 않고 pattern 입력 도움말에서 이를 설명한다.

### Test String

- 최대 길이: 500,000 UTF-16 code units.
- 선행·후행 공백, `\r\n`/`\n`, tab, NUL을 포함한 문자열을 trim·정규화하지 않는다.
- UI 문자 수는 JavaScript `text.length`와 같은 UTF-16 code unit 기준임을 도움말에 표시한다.
- 500,000 초과는 Worker로 보내지 않고 `text-too-long` 오류를 표시한다.

### Replacement

- 최대 길이: 100,000 UTF-16 code units.
- 빈 replacement는 정상이며 match를 제거한다.
- replacement를 HTML이나 JavaScript 코드로 평가하지 않고 native `text.replace(regex, replacement)`의 문자열 인수로만 전달한다.

### 결과 제한

- Worker match iteration 상한: 10,000.
- UI match detail 렌더 상한: 첫 200개.
- highlight 상한: 첫 1,000개 match.
- replacement result 최대 전송/렌더 길이: 2,000,000 UTF-16 code units. 초과하면 전체 결과를 전송하지 않고 `replacement-too-large`로 안내한다.
- 제한에 도달한 match count는 정확한 총수로 가장하지 않고 `10,000+` 및 결과 일부 생략으로 표시한다.

## 6. Architect 결정 1 — 실행 위치와 Worker lifecycle

### 결정

모든 `new RegExp`, match iteration과 replace 실행은 **전용 Web Worker**에서 수행한다. pattern을 메인 스레드에서 “먼저 검증”하지 않는다. compile 자체도 느려질 가능성과 일관된 timeout 경계를 위해 Worker에 둔다.

예정 구조:

```text
components/tools/regex-tester/regex-tester.tsx
lib/tools/regex-tester/protocol.ts
lib/tools/regex-tester/regex-engine.ts
lib/tools/regex-tester/regex-worker.ts
lib/tools/regex-tester/worker-client.ts
```

- Client Component에서 `new Worker(new URL(..., import.meta.url), {type:"module"})` 형태를 우선 사용한다.
- Next.js production build에서 worker URL/bundle이 지원되지 않으면 inline Blob worker로 우회하지 않고 Architect 재검토한다. CSP·번들 추적·TypeScript 테스트가 가능한 정적 worker 경계를 유지한다.
- worker request에는 증가하는 `requestId`, pattern, 정렬된 flags, text, replacement를 보낸다.
- response는 같은 requestId, `success | syntax-error | limit-error | runtime-error` discriminated union이다.
- 최신 requestId가 아닌 response는 폐기한다.
- pattern/text/flags/replacement 변경, Clear, locale route unmount에서 pending timer를 취소한다.
- timeout 또는 Worker error 후 해당 Worker는 `terminate()`하고 새 instance를 만든다.
- 사용자가 입력을 변경하기 전까지 timeout 요청을 동일 값으로 자동 재시도하지 않는다.

Web Worker는 메인 UI event loop를 분리하지만 느린 regex를 안전하게 만드는 것은 아니다. timeout 시 Worker를 종료할 수 있다는 점이 실제 방어 경계다.

## 7. Architect 결정 2 — ReDoS timeout

- debounce: 마지막 입력 변경 후 300ms.
- Worker timeout: postMessage 시점부터 1,000ms.
- timeout 시 메인 스레드는 즉시 Worker를 `terminate()`하고 `regex-timeout` 상태를 표시한다.
- 안내: “정규식 실행 시간이 너무 깁니다. 패턴을 단순화하거나 테스트 문자열을 줄이세요.”
- timeout을 pattern이 악성이라는 확정 판정으로 표현하지 않는다. 장치 성능·입력 크기의 영향도 있다.
- timeout 이후 이전 match/replace 결과를 현재 결과로 유지하지 않고 숨긴다.
- 명시적 `다시 실행`은 한 번 허용하지만 timeout 값을 늘리지 않는다.
- 자동 실행 중 새로운 입력이 생기면 이전 Worker를 terminate하고 새 debounce를 시작한다. ReDoS 요청이 Worker thread를 점유한 채 누적되지 않는다.
- 동시에 살아 있는 regex Worker는 최대 하나다.
- 정적 “위험 패턴 감지”는 보조 경고로도 넣지 않는다. false positive/negative로 안전을 오해시킬 수 있다.

## 8. Architect 결정 3 — JavaScript 호환 범위와 flags

### 지원

- 현재 배포 대상 최신 안정 Chrome 계열의 ECMAScript `RegExp` constructor 결과를 기준으로 한다.
- UI flags는 `g`, `i`, `m`, `s`, `u`, `y`만 제공한다.
- flags는 항상 `gimsuy` 순서로 정렬해 Worker에 보낸다.
- 기본값은 `g`만 활성화다.
- duplicate flag 상태는 checkbox 모델에서 생성할 수 없다.
- `g`가 없으면 `exec()` 한 번만 수행해 첫 match만 반환한다.
- `g`가 있으면 반복한다.
- `y`는 native sticky semantics를 그대로 유지한다. `g+y`는 현재 `lastIndex`에서 연속 성공하는 동안만 진행한다.
- index는 JavaScript가 반환하는 UTF-16 code unit offset이다. Emoji 앞뒤 index를 code point index로 변환하지 않는다.
- captures는 `match.slice(1)` 순서, named groups는 `match.groups` own entries를 사용한다.
- unmatched capture의 wire value는 `null`로 정규화하고 UI는 `—`로 표시한다.

### 제외/보류

- `d`는 캡처별 indices에 유용하지만 minimum flags 범위를 넘어 UI 복잡도가 늘어 Could Have다.
- `v`는 최신 문법이나 `u`와 상호 배타적이고 실행 환경 검증이 추가되어 Could Have다.
- inline modifier 등 엔진이 지원하는 pattern 문법은 별도로 차단하지 않는다. 현재 Worker의 `new RegExp`가 수용하면 동작한다.
- 브라우저 간 SyntaxError 문구가 다를 수 있으므로 exact 번역을 추측하지 않는다.

## 9. Architect 결정 4 — match iteration과 zero-length

Worker의 논리적 실행은 다음과 같다.

```ts
const regex = new RegExp(pattern, flags);
const repeated = regex.global;
do {
  const match = regex.exec(text);
  if (!match) break;
  collect(match);
  if (!repeated) break;
  if (match[0] === "") regex.lastIndex = advanceStringIndex(text, regex.lastIndex, regex.unicode);
} while (count < 10_000);
```

`advanceStringIndex` 계약:

- non-`u`: UTF-16 code unit 1개 전진.
- `u`: 현재 index의 lead surrogate 뒤에 valid trail surrogate가 있으면 2, 아니면 1 전진.
- end-of-string zero match 뒤에는 `text.length + 1`로 전진해 다음 exec가 종료되게 한다.
- `lastIndex`가 이전보다 증가하지 않으면 방어적으로 같은 함수를 적용한다.

이는 JavaScript global match의 zero-length 진행 규칙과 일치시키기 위한 것이며 `matchAll`만 맹목적으로 사용하지 않는다. `y`가 실패하면 native exec처럼 즉시 종료한다.

각 match wire model:

```ts
type MatchRecord = {
  value: string;
  start: number;
  end: number;
  captures: Array<string | null>;
  named: Record<string, string | null>;
  zeroLength: boolean;
};
```

## 10. Architect 결정 5 — highlight

Textarea 위 mirrored layer 대신 **별도 Match Preview**를 사용한다.

- textarea는 편집만 담당한다.
- preview는 `text.slice(cursor, start)`, `<mark>match</mark>`, 다음 slice를 React text node로 렌더한다.
- `dangerouslySetInnerHTML`을 사용하지 않는다.
- whitespace와 줄바꿈은 `white-space: pre-wrap`, 긴 token은 `overflow-wrap:anywhere`로 보존한다.
- match value를 HTML로 해석하지 않는다.
- 서로 겹치지 않는 native full match 범위만 highlight한다.
- zero-length match는 문자를 감싸지 않고 해당 위치에 접근 가능한 번호 marker/caret를 삽입한다.
- 첫 1,000 match만 highlight하고 나머지 원문은 평문으로 유지하며 생략 안내를 표시한다.
- highlight 색상만으로 상태를 전달하지 않고 match 번호와 총수/목록을 함께 제공한다.
- preview DOM이 커져도 test input은 그대로 유지한다.

## 11. 자동 실행과 상태 모델

상태:

`idle → debouncing → running → valid-no-match | success | syntax-error | timeout | limit-error | runtime-error`

- 첫 진입의 빈 pattern/text는 JavaScript 규칙상 계산 가능하지만, 사용자가 아직 입력하지 않은 초기 상태에서는 결과 대신 시작 안내를 표시한다.
- pattern 또는 test 중 하나라도 사용자가 수정하면 300ms debounce를 시작한다.
- 빈 pattern + 입력 text는 zero-length 결과를 정상 표시한다.
- 빈 test도 pattern에 따라 zero-length match 0/1개가 가능하므로 native 결과를 따른다.
- running 중 모든 입력을 막지 않는다. 이전 result/download copy는 현재 입력 결과처럼 보이지 않게 숨긴다.
- compile 성공은 `올바른 JavaScript 정규식` status로, match 0은 별도 정상 상태로 표시한다.
- `SyntaxError.message`는 text node로만 출력하고 stack, worker URL, 소스 코드 위치는 노출하지 않는다.
- 오류를 한국어로 확실히 분류할 수 있는 제한된 경우에도 추정 번역을 단정하지 않는다. locale 안내와 원본 메시지를 병기한다.

## 12. Match 정보 UI

- summary: `Matches: N`, flags, global/first-only 설명, truncation 여부.
- 각 card: `Match #`, Value, `start – end`, zero-length label.
- Value가 빈 문자열이면 빈 box가 아니라 `빈 문자열 (길이 0)`로 표시한다.
- numbered groups는 `Group 1`, `Group 2` 순서다.
- named group은 이름과 값을 별도 definition list로 표시한다.
- undefined/unmatched는 `—`; 실제 문자열 `"undefined"`와 구분한다.
- match detail은 첫 200개만 DOM에 렌더하고 나머지 생략 수를 표시한다.
- 긴 value/group은 wrap하며 페이지 가로 overflow를 만들지 않는다.

## 13. Replace

- replacement input은 별도 field이며 test string을 수정하지 않는다.
- Worker는 match 수집에 사용한 것과 동일한 pattern/flags로 새 `RegExp`를 만들어 `text.replace(regex, replacement)`를 실행한다. Stateful `lastIndex`를 공유하지 않는다.
- `g` 없음은 첫 replacement, `g` 있음은 전체 replacement로 native 동작을 따른다.
- `$&`, `$1`~`$99`, `$<name>`, `$$`, ``$` ``, `$'`를 별도 parser로 재구현하지 않는다.
- replacement result는 원본과 분리된 read-only preview로 표시한다.
- 결과가 원본과 같아도 정상이며 `변경 없음`을 표시한다.
- result가 2,000,000 code units를 초과하면 문자열을 메인 thread로 보내지 않고 크기 제한 안내를 표시한다.
- replacement copy는 현재 success response와 requestId가 일치할 때만 enabled다.

## 14. Copy

- `Pattern 복사`: pattern만 정확히 복사.
- `정규식 전체 복사`: `/` + pattern의 literal slash를 `\/`로 표시용 escape + `/` + flags. 이는 JavaScript source 표현 도움용이며 원본 pattern을 변경하지 않는다.
- `치환 결과 복사`: 전체 replacement result만 복사.
- Clipboard API 없음·거부는 입력과 결과를 유지하고 복구 안내를 표시한다.
- 성공 status timer는 unmount와 재실행에서 정리한다.

## 15. Examples와 Quick Reference

### 예제

| 이름 | pattern | 권장 flags | 표현 |
|---|---|---|---|
| 이메일 | `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b` | `g` | 간단한 이메일 패턴 예제 |
| 숫자 | `\d+` | `g` | 연속된 ASCII 숫자 찾기 |
| 날짜 | `\d{4}-\d{2}-\d{2}` | `g` | 형식 예제이며 실제 날짜 유효성 보장 아님 |
| URL | `https?://[^\s]+` | `g` | 간단한 http/https URL 예제 |
| 휴대전화 | `01[016789]-?\d{3,4}-?\d{4}` | `g` | 한국 휴대전화 형식 예제 |

- 예제를 선택해도 test string과 replacement는 덮어쓰지 않는다.
- 완벽한 이메일·URL·전화번호 검증이라고 표현하지 않는다.

### Quick Reference

- 문자: `.`, `\d`, `\D`, `\w`, `\W`, `\s`, `\S`, `[abc]`, `[^abc]`
- 수량자: `*`, `+`, `?`, `{n}`, `{n,}`, `{n,m}`, lazy `?`
- 앵커: `^`, `$`, `\b`, `\B`
- 그룹: `(...)`, `(?:...)`, `(?<name>...)`, backreference `\1`, `\k<name>`
- lookaround: `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`
- escape: `\.`, `\\`, `\t`, `\n`, `\u{...}` with `u`
- reference는 현재 JavaScript 엔진 문법이며 다른 regex 엔진에 그대로 적용된다고 말하지 않는다.

## 16. 오류 계약

| 코드 | 조건 | 사용자 안내 |
|---|---|---|
| `pattern-too-long` | pattern > 10,000 | pattern 축소 |
| `text-too-long` | text > 500,000 | 테스트 문자열 축소 |
| `replacement-too-long` | replacement > 100,000 | replacement 축소 |
| `replacement-too-large` | result > 2,000,000 | 결과가 너무 커 preview/copy 생략 |
| `syntax-error` | `new RegExp` SyntaxError | 올바르지 않은 정규식 + 안전한 원본 message |
| `regex-timeout` | 1,000ms 무응답 | pattern 단순화 또는 text 축소 |
| `result-truncated` | 10,000 match 도달 | 10,000+ 및 일부 결과만 표시 |
| `worker-error` | Worker load/message/runtime 오류 | 다시 실행 또는 최신 브라우저 안내 |
| `copy-failed` | Clipboard 없음·거부 | 권한 확인·직접 선택 안내 |

- expected error는 console error와 unhandled rejection을 만들지 않는다.
- timeout은 Worker를 종료한 뒤 상태를 확정한다.
- 오류 시 stale matches/highlight/replacement를 모두 숨긴다.

## 17. 개인정보·보안

- pattern, flags, test string, replacement, matches는 Worker memory와 현재 React state에서만 처리한다.
- fetch/XHR/form/server action/API route/WebSocket/Beacon/analytics로 보내지 않는다.
- localStorage, sessionStorage, IndexedDB, cookie, Cache API, URL query/hash, history에 저장하지 않는다.
- Worker script 정적 chunk 요청에는 사용자 입력을 포함하지 않는다.
- preview, error, group names/value는 React text node로만 렌더하고 HTML로 삽입하지 않는다.
- page에 “입력 내용은 브라우저 안에서만 처리되며 서버로 전송되거나 저장되지 않습니다”를 표시한다.
- QA는 고유 marker가 request URL/body/header, storage, current URL에 나타나지 않는지 검증한다.

## 18. UI·반응형·접근성

### Desktop

- 상단: Pattern과 flags.
- 다음 2열: 왼쪽 Test String, 오른쪽 summary/match detail.
- 아래: Match Preview → Replace → Examples/Quick Reference.
- 입력 영역이 설명 콘텐츠보다 먼저 온다.

### Mobile

`Pattern → Flags → Test String → status → Match Preview → Match Info → Replace → Examples → Quick Reference`

- 320/375/768/1024/1440px에서 가로 scroll·잘림·겹침 0.
- pattern/test/result의 긴 무공백 문자열은 container 밖으로 넘지 않는다.
- Pattern, Test String, Replacement에 visible label과 help/error 연결.
- flags는 checkbox와 visible 문자·설명을 묶고 44px touch target을 목표로 한다.
- running/success는 `role=status`, syntax/timeout/limit/copy error는 `role=alert`.
- match highlight는 색상 외 `<mark>` semantics, 번호, summary로 전달한다.
- keyboard로 examples, flags, copy, 재실행, detail을 모두 사용할 수 있다.
- Clear 후 Pattern field로 focus를 복원한다.

## 19. SEO와 콘텐츠

- locale별 title/description, canonical, `ko/en/ja/x-default`, Open Graph/Twitter metadata를 기존 helper로 제공한다.
- H1과 첫 설명에서 JavaScript 정규식 테스트, 브라우저 처리, match/group/replace를 자연스럽게 설명한다.
- 본문에서 정규표현식 테스트, Regex Tester, JavaScript flags, capture group, 치환 사용법을 실제 기능과 연결한다.
- 키워드만 바꾼 중복 문단을 만들지 않는다.
- 홈 카드와 Header `개발자` category, sitemap에 연결한다.

## 20. 구현 구조

```text
app/[locale]/tools/regex-tester/page.tsx
components/tools/regex-tester/regex-tester.tsx
components/tools/regex-tester/regex-tester.test.tsx
lib/tools/regex-tester/protocol.ts
lib/tools/regex-tester/regex-engine.ts
lib/tools/regex-tester/regex-worker.ts
lib/tools/regex-tester/worker-client.ts
lib/tools/regex-tester/*.test.ts
tests/regex-tester-browser.mjs
messages/{ko,en,ja}.json
```

- page·metadata·reference content는 Server Component로 유지한다.
- interactive UI와 Worker client만 Client Component다.
- Worker 안에서 쓰는 `regex-engine.ts`는 DOM 의존성 없는 순수 함수로 두어 같은 JavaScript runtime에서 직접 unit test한다.
- protocol은 structured-clone 가능한 primitive/object만 사용한다.
- 제품 runtime 신규 dependency는 추가하지 않는다.

## 21. 수용 기준

1. 기본 `g` flag와 pattern/test 입력 후 300ms에 결과가 갱신된다.
2. `hello` / `hello world`가 value `hello`, index 0–5를 반환한다.
3. `test` + `g`에서 `test test test`가 3 match다.
4. `hello` + `gi`에서 `Hello HELLO hello`가 3 match다.
5. `g/i/m/s/u/y` 각각이 native JavaScript 결과와 같다.
6. `g` 없음은 첫 match만이며 UI가 그 이유를 설명한다.
7. capture, optional unmatched, non-capturing, named capture가 native 결과와 같다.
8. named group 이름과 실제 문자열 `undefined`와 unmatched `—`가 구분된다.
9. lookahead, negative lookahead, `^`, `$`, `\b`가 정상이다.
10. zero-length global match가 UTF-16/Unicode 규칙으로 전진하며 무한 반복하지 않는다.
11. Emoji는 `u` 유무에 따른 match value/index 차이가 native 결과와 같다.
12. invalid class, quantifier, group은 page crash 없이 syntax error를 표시한다.
13. 빈 pattern과 빈 test는 native JavaScript 동작을 따르고 초기 untouched 상태와 구분된다.
14. highlight text와 line breaks가 원본과 같고 HTML-like 입력을 실행하지 않는다.
15. match summary/detail/highlight 제한은 정확한 총수처럼 오해시키지 않는다.
16. replacement의 `$&`, `$1`, `$2`, `$<name>`, `$$`, ``$` ``, `$'`가 native replace와 같다.
17. replace는 원본 Test String을 수정하지 않는다.
18. `(a+)+$`와 긴 near-miss 입력이 1,000ms 내 timeout 처리되고 메인 UI 조작이 유지된다.
19. timeout Worker가 terminate되고 동일 요청이 자동 반복되지 않는다.
20. 500,000 text 경계는 실행 가능하고 초과는 Worker에 보내지 않는다.
21. pattern/replacement/result/match 제한이 정해진 상한에서 종료된다.
22. 빠른 입력·flags/example 변경에서 stale response가 최신 결과를 덮지 않는다.
23. Pattern, literal, replacement copy와 clipboard 거부가 정상이다.
24. Clear가 timer, Worker request, input/result/error/copy status를 초기화하고 focus를 복원한다.
25. 320/375/768/1024/1440px에서 핵심 흐름·replace·copy가 가능하고 overflow·겹침이 없다.
26. `ko/en/ja` 기능·문구·metadata·홈/메뉴가 동일하다.
27. 정상·invalid·timeout·limit 흐름에서 Console Error와 unhandled rejection이 0이다.
28. 고유 입력 marker가 서버·외부 요청·storage·URL에 나타나지 않는다.

## 22. QA 필수 계획

### 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 신규 dependency가 생긴 경우에만 `npm audit --audit-level=high`
- 필수 테스트의 fail, skip, todo는 0이어야 한다.

### 도메인 정확도

동일 pattern/flags/text에 대해 tool engine과 독립적으로 만든 native `RegExp` expectation의 다음 필드를 비교한다.

- match value
- start/end UTF-16 index
- numbered captures
- named groups
- replacement result

필수 case:

1. `hello` / `hello world`
2. `test` / `test test test` + g
3. `hello` / `Hello HELLO hello` + gi
4. `\d+`
5. 이메일 예제
6. multiline anchors + m
7. dot/newline + s
8. 한글, 일본어
9. Emoji with/without u
10. `(\d{4})-(\d{2})-(\d{2})`
11. `(?<year>\d{4})`
12. optional unmatched group
13. non-capturing group
14. positive/negative lookahead
15. zero-length `^`, `$`, `\b`, `(?=...)`, empty pattern
16. sticky y and gy success/failure
17. invalid `[abc`, invalid quantifier, invalid group
18. empty test
19. 500,000 boundary and 500,001 rejection
20. 10,000 match cap and replacement 2,000,000 cap
21. date replacement `$1/$2/$3`
22. named replacement `$<year>`
23. special tokens `$$`, `$&`, ``$` ``, `$'`

### Worker/ReDoS

- 실제 Worker에 `(a+)+$`와 충분한 `a...!` near-miss를 보낸다.
- main thread heartbeat timer 또는 button interaction이 timeout 중 계속 작동하는지 확인한다.
- 1,000ms 전후에 timeout state, Worker termination, stale result 0을 확인한다.
- timeout 후 safe pattern 입력이 새 Worker에서 성공하는지 확인한다.
- 빠른 20회 입력에서 살아 있는 Worker 1개 이하, 최종 response만 반영되는지 확인한다.

### 실제 Chrome

- latest stable Chrome, production build
- 320×800, 375×812, 768×1024, 1024×768, 1440×900
- `ko`, `en`, `ja`, 직접 URL/reload/back/forward, 홈 카드·menu
- keyboard-only pattern/flags/test/replace/examples/copy/Clear
- long lines, multiline, HTML-like string, Emoji
- Console Error, page error, unhandled rejection, horizontal overflow, control overlap 0
- unique private marker가 requests/storage/current URL에 포함되지 않음
- worker chunk는 정적 GET만 수행하고 payload를 URL에 포함하지 않음

## 23. Critic 필수 질문

Critic은 결과를 보기 전에 최소 10개 질문을 작성하며 다음을 반드시 포함한다.

1. 초보자가 Pattern과 Flags의 관계를 이해하는가?
2. match 위치와 zero-length 위치를 즉시 찾을 수 있는가?
3. numbered/named/unmatched capture를 구분할 수 있는가?
4. invalid regex에서 원인과 복구 방향을 알 수 있는가?
5. `g`가 없을 때 첫 match만 나오는 이유가 명확한가?
6. 긴 text와 많은 match에서도 UI가 사용 가능한가?
7. 위험한 regex가 main UI를 멈추지 않는가?
8. 원본과 replacement preview가 명확히 구분되는가?
9. Unicode와 index가 JavaScript 기준임을 오해하지 않는가?
10. 예제를 완전한 이메일/URL 검증식으로 오해하지 않는가?
11. 모바일에서 pattern, preview, match detail, replace 흐름이 자연스러운가?
12. 민감한 test data가 전송·저장되지 않는다는 설명과 실제 동작이 일치하는가?

## 24. 완료 조건

다음을 모두 충족해야 Product Owner가 `DONE`으로 기록할 수 있다.

- Critic 90/100 이상
- 통합 Critical 0, High 0
- lint, type-check, 전체 자동 테스트, build PASS
- TypeScript 오류 0
- Console Error와 unhandled rejection 0
- native JavaScript RegExp 정확도 matrix PASS
- `g/i/m/s/u/y`, captures, named groups, zero-length, invalid regex PASS
- replacement와 special replacement token PASS
- 500,000 text 경계와 결과 cap PASS
- 실제 Worker ReDoS timeout 및 main UI responsiveness PASS
- 모바일과 ko/en/ja PASS
- 입력 서버·외부 API·storage 비전송·비저장
- 모든 수용 기준에 QA 증거 연결
- 최대 개선 반복 5회

5회차 후 하나라도 미달이면 `NEEDS HUMAN REVIEW`로 기록한다. Worker timeout 또는 ReDoS QA가 `NOT TESTED`면 PASS가 아니다. Builder, Architect, Critic, QA, Optimizer는 자신의 결과를 최종 승인하지 않는다.

## 25. Architect 검토 결과

### 기존 구조와의 충돌

- `/{locale}/tools/regex-tester`는 기존 slug와 충돌하지 않는다.
- Server page + Client UI + `lib/tools` 순수 engine + browser QA 구조를 그대로 따른다.
- `개발자` category, 홈 카드와 sitemap path 추가가 필요하다. 총 11개 도구가 되므로 메뉴 link count와 320~1440px 회귀 값을 갱신한다.
- 입력·결과 처리에 server/API route는 필요하지 않다.
- 새 production dependency는 필요하지 않다.

### 확정 결정

1. 실행 위치: compile/match/replace 전부 dedicated module Web Worker
2. ReDoS: 300ms debounce, 요청당 1,000ms timeout, terminate/recreate, 동시 Worker 최대 1
3. Highlight: 별도 React text-node preview, match 1,000개까지만 강조
4. Test String: 최대 500,000 UTF-16 code units
5. 자동 실행 debounce: 300ms
6. zero-length: non-u code unit 1, u code point 1만큼 명시적 전진
7. 호환 범위: 현재 브라우저 ECMAScript `RegExp`, UI flags gimsuy, index는 UTF-16 offset
8. match cap: 10,000, detail 200, replacement result 2,000,000 code units

### 주요 위험과 통제

- ReDoS: main thread 실행 금지, 1초 terminate가 필수 경계다.
- Worker bundling: production build와 실제 Chrome에서 worker script load를 구현 초기에 먼저 검증한다.
- zero-length 무한 반복: 명시적 AdvanceStringIndex와 10,000 cap을 이중 적용한다.
- stale response: requestId와 Worker 교체로 폐기한다.
- 대량 DOM: preview 1,000, detail 200으로 제한한다.
- replacement 폭증: 2,000,000 이전에 worker 내부 길이 확인. native replace가 결과를 먼저 할당할 수 있는 잔여 위험은 text/replacement 입력 제한과 timeout으로 통제한다.
- index 오해: UTF-16 offset을 UI에 명시하고 code point index로 변환하지 않는다.
- error 번역 오류: 원본 SyntaxError message를 안전한 text로 표시하고 추정 설명을 단정하지 않는다.
- privacy: worker static GET 외 입력 포함 network 0을 실제 Chrome에서 검증한다.

### 공식 근거

- MDN JavaScript Regular Expressions: ECMAScript 문법과 flags
- MDN `RegExp.prototype.exec` / `lastIndex`: global·sticky state와 zero-length 반복 주의
- MDN `RegExp.prototype[Symbol.match]`: Unicode-aware zero-length AdvanceStringIndex 동작
- MDN `String.prototype.replace`: g 유무와 `$&`, `$n`, `$<name>` 등 replacement token
- MDN `Worker.terminate`: 장시간 작업을 완료 기회 없이 즉시 종료하는 timeout 경계

### Architect 판정

- 구조 충돌: 없음
- 기술적 구현 가능성: 있음
- 서버·외부 API: 불필요
- 신규 production dependency: 없음
- 가장 큰 위험: Worker bundling과 실제 ReDoS timeout 검증
- Builder 인계 상태: `COMPLETED`
- 구현 승인: 사용자 승인에 따라 구현 및 품질 게이트 완료
