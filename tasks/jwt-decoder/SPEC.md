# JWT 디코더 / JWT Decoder SPEC

## 문서 상태

- 상태: `SPEC 작성 + Architect 검토 완료` — 구현 전 (`APPROVED FOR BUILD`)
- 작성일: 2026-08-30
- URL: `/{locale}/tools/jwt-decoder`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P1 개발자 유틸리티
- 유일한 구현 기준: 이 문서
- 브리핑: 사용자가 목적·UI·Claim 처리·보안 원칙·QA 42개·Critic 질문 10개·완료 조건까지 이미 매우 상세히 지정했다(§1~§39). 이 문서는 그 브리핑을 프로젝트 SPEC 형식으로 정리하고, §40이 Architect에게 위임한 11개 결정과 그로부터 파생되는 추가 기술 결정을 확정한 것이다.

## 1. 목적과 성공 정의

사용자가 JWT를 입력하면 Header와 Payload를 브라우저에서 즉시 디코딩하고, 주요 Registered Claim(`exp`/`iat`/`nbf`/`iss`/`sub`/`aud`/`jti`)을 사람이 읽기 쉬운 형태로 보여준다.

V1의 성공은 다음 흐름을 빠르고 안전하게 완료하는 것으로 정의한다.

`JWT 붙여넣기 → (디바운스) 구조 검사 → Header/Payload 독립 디코딩 → Claim 분석 → 만료 상태 표시 → 필요한 부분만 복사`

- 이 도구는 **디코더**이지 **검증기**가 아니다. 서명 검증·Secret/Key 입력·JWKS 요청은 V1에 없다.
- Header/Payload가 성공적으로 디코딩됐다는 사실을 "유효한 토큰"이라는 뜻으로 표시하지 않는다. `docs/EVALUATION.md`의 완료 게이트와 별개로, 이 원칙 위반은 그 자체로 Critical 이슈로 취급한다(§8 보안 QA).
- 100% 브라우저 처리, 서버 전송·외부 API 호출 없음.

## 2. 대상 사용자와 주요 사용 사례

- 백엔드/프론트엔드 개발자가 로컬에서 발급받은 토큰의 Payload를 빠르게 확인
- API 디버깅 중 `exp`가 지났는지, `aud`가 올바른지 확인
- QA/지원 담당자가 사용자가 보낸 토큰의 Claim을 눈으로 확인(서명 검증은 별도 백엔드 도구가 담당한다는 전제)

## 3. 기능 범위

### Must Have

- JWT 입력, 3-part 구조 검사
- Base64URL decode, UTF-8 처리
- Header JSON 표시, Payload JSON 표시, Signature segment 표시(디코딩 대상 아님)
- `exp`/`iat`/`nbf` 처리, `iss`/`sub`/`aud`/`jti` 표시
- 만료 여부, Local/UTC 시간 동시 표시
- Header 복사·Payload 복사·JWT 전체 복사, Clear
- 브라우저 전용 처리, "디코딩 ≠ 검증" 안내

### Should Have

- 예제 JWT 불러오기(고정 fixture, 실제 서비스 토큰 아님)
- JSON syntax highlight(경량, 라이브러리 없이)
- Algorithm 간단 설명(HS256 등)
- 만료까지/만료 후 상대 시간(`Intl.RelativeTimeFormat`)
- `aud` array 처리
- `alg: none` 안내

### Could Have (V1 제외)

- Claim 검색/필터
- Token/Header/Payload 크기 표시
- 특정 Claim 값 개별 복사
- JSON 접기/펼치기

### Do Not Build (V1)

- JWT 서명 검증(HS256 Secret, RSA/EC Public Key, JWKS URL)
- JWE Decryption
- JWT 생성·재서명
- URL Query 기반 JWT 공유(`?token=...`)
- 서버 저장

## 4. Architect 결정 1 — Base64URL → UTF-8 디코딩 구현 방식(외부 dependency 없음)

`atob()`만 그대로 문자열로 쓰면 UTF-8 멀티바이트 문자(한글·일본어·이모지)가 깨진다(브리핑 §6/§36의 핵심 우려). `atob()`은 각 문자를 0~255 바이트 값으로 반환하므로, 그 바이트를 `Uint8Array`로 모아 `TextDecoder`에 넘겨야 정확하다.

```ts
function base64UrlToBytes(segment: string): Uint8Array {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded); // may throw DOMException on invalid base64
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegmentToJson(segment: string): unknown {
  const bytes = base64UrlToBytes(segment); // throws on invalid base64
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); // throws on invalid UTF-8
  return JSON.parse(text); // throws on invalid JSON
}
```

- `TextDecoder("utf-8", { fatal: true })`를 사용한다 — `fatal` 옵션 없이는 잘못된 UTF-8 바이트 시퀀스가 조용히 `�`(U+FFFD)로 치환되어, 손상된 페이로드를 "정상 디코딩된 이상한 문자열"처럼 보이게 만든다. `fatal: true`로 명시적 에러를 던지게 해 §18의 "4. Base64URL decode 실패" 케이스로 명확히 분류한다.
- 세 단계(`atob` → `TextDecoder` → `JSON.parse`)는 각각 독립적으로 실패할 수 있고, 실패 지점에 따라 사용자에게 보여줄 메시지가 달라야 한다(§8 파이프라인 참고).
- 전부 표준 Web API(`atob`, `TextDecoder`, `JSON`)만 사용하며 외부 라이브러리는 추가하지 않는다(Architect 결정 2와 동일한 결론).

## 5. Architect 결정 2 — 외부 dependency: 전부 불필요

- JWT 파싱: 표준 문자열/Web API만으로 충분(위 §4).
- 날짜 계산: `Date`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` 표준 API만으로 충분(§7). `dayjs`/`date-fns` 등 날짜 라이브러리를 추가하지 않는다.
- Syntax highlight: 경량 정규식 토크나이저로 충분(§6). CodeMirror/Monaco 등 에디터 라이브러리를 추가하지 않는다.
- 결론: 이 기능은 `korean-initial-converter`와 마찬가지로 런타임 dependency 추가 없이 구현한다.

## 6. Architect 결정 3 — JSON syntax highlight 방식과 XSS 방지(보안 핵심 결정)

**요구사항과 위험이 정면으로 충돌하는 지점이다.** 브리핑 §37.5/§37.6은 "Payload를 unsafe HTML로 삽입하지 않는다"와 "`<script>alert(1)</script>` 같은 문자열이 실행되지 않는다"를 Security QA로 명시한다. Syntax highlight를 `dangerouslySetInnerHTML` + 문자열 조합으로 구현하면 이 두 요구사항을 정면으로 위반할 수 있는 가장 흔한 실수 패턴이다(이스케이프를 빠뜨리면 즉시 XSS).

**결정: `dangerouslySetInnerHTML`을 절대 사용하지 않는다.** 대신:

1. `JSON.stringify(value, null, 2)`로 이미 유효성이 보장된 pretty-printed JSON 문자열을 만든다(이 문자열을 만드는 시점에 이미 `JSON.parse`를 통과한 값이므로 별도 검증이 필요 없다).
2. 다음과 같은 정규식으로 그 문자열을 토큰 배열로 분해한다(문자열/숫자/불리언/null만 매칭하고, 나머지 — 중괄호·대괄호·쉼표·공백·들여쓰기 — 는 매칭 사이 구간을 그대로 "punctuation" 토큰으로 채운다).

```ts
const TOKEN_PATTERN =
  /"(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

type JsonToken = { text: string; type: "key" | "string" | "number" | "boolean" | "null" | "punctuation" };

function tokenizeJson(pretty: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;
  for (const match of pretty.matchAll(TOKEN_PATTERN)) {
    if (match.index! > lastIndex) {
      tokens.push({ text: pretty.slice(lastIndex, match.index), type: "punctuation" });
    }
    const raw = match[0];
    const type =
      raw.endsWith(":") ? "key" :
      raw.startsWith('"') ? "string" :
      raw === "true" || raw === "false" ? "boolean" :
      raw === "null" ? "null" : "number";
    tokens.push({ text: raw, type });
    lastIndex = match.index! + raw.length;
  }
  if (lastIndex < pretty.length) tokens.push({ text: pretty.slice(lastIndex), type: "punctuation" });
  return tokens;
}
```

3. 렌더링은 React 엘리먼트로만 한다: `tokens.map((token, i) => <span key={i} className={styleFor(token.type)}>{token.text}</span>)`. `{token.text}`는 JSX 텍스트 자식이므로 React가 항상 자동으로 이스케이프한다 — Payload 값이 `<script>alert(1)</script>` 같은 문자열이어도 화면에 텍스트 그대로 표시될 뿐 DOM에 실제 엘리먼트로 삽입되지 않는다.
4. 이 규칙(HTML 문자열 조립 금지, JSX 텍스트 자식만 사용)은 Header/Payload/Signature/개별 Claim 값 등 **디코딩된 모든 내용**에 예외 없이 적용되는 이 기능 전체의 아키텍처 불변식이다. Builder는 이 원칙을 어기는 코드를 작성하지 않는다.

## 7. Architect 결정 4·5·6 — exp/iat/nbf 시간 표시: 형식·Local+UTC 동시 표시·상대 시간

세 결정이 서로 얽혀 있어 하나로 묶어 정리한다.

- **NumericDate 해석**: JWT의 `exp`/`iat`/`nbf`는 RFC 7519 정의상 **초 단위** Unix Timestamp다. `new Date(value * 1000)`로 변환한다(밀리초 단위로 착각해 1970년 근처로 계산하는 실수를 QA #12~#18에서 반드시 확인한다).
- **타입 가드**: 값이 `typeof value === "number" && Number.isFinite(value)`가 아니면(문자열 등 비표준 값), 날짜로 해석하지 않고 "claim 값이 올바른 숫자 형식이 아닙니다"라는 별도 안내만 보여준다 — 절대 `NaN`/`Invalid Date`를 화면에 그대로 노출하지 않는다.
- **표시 형식(결정 4)**: `YYYY-MM-DD HH:mm:ss` 고정 포맷을 Local과 UTC 각각에 사용하고, 모호함을 없애기 위해 뒤에 오프셋/타임존을 명시한다.
  - Local: `2026-08-30 21:00:00 (UTC+09:00)` — 오프셋은 `-date.getTimezoneOffset()`으로 계산한다.
  - UTC: `2026-08-30 12:00:00 UTC`
- **동시 표시(결정 5): 항상 둘 다 보여준다.** 옵션으로 감추지 않는다 — 발급 시간대와 사용자 브라우저 시간대가 다른 경우(개발자의 흔한 디버깅 상황)를 별도 조작 없이 바로 비교할 수 있어야 한다는 게 이 도구의 핵심 가치 중 하나다.
- **상대 시간(결정 6)**: `Intl.RelativeTimeFormat(locale, { numeric: "auto" })`를 사용한다. 표준 Web API이며 ko/en/ja 각각 "2시간 후"/"in 2 hours"/"2時間後" 형태를 자동으로 만들어 준다. 초·분·시간·일 단위 중 값이 1 이상인 가장 큰 단위를 선택하는 일반적인 humanize 규칙을 그대로 쓴다(별도 라이브러리 없이 20줄 내외의 순수 함수로 충분).
- **테스트 가능성**: 브리핑 §35가 "고정 기준 시간을 주입할 수 있게 설계"를 명시적으로 요구한다. Claim 분석 함수는 `analyzeClaims(payload: unknown, nowMs: number = Date.now())` 형태로 `nowMs`를 옵션 인자로 받는다. UI 컴포넌트는 인자를 생략해 실제 시각을 쓰고, 유닛 테스트는 고정 `nowMs`를 넘겨 결정적으로 검증한다(`Date.now()`를 mock하지 않는다 — 더 간단하고 실수 여지가 적다).
- **out-of-range 방어**: `new Date(value * 1000)`의 결과가 `Number.isNaN(date.getTime())`이면(비정상적으로 큰 값 등) "표시할 수 없는 시간 값입니다"로 안전하게 대체한다.

## 8. Architect 결정 7 — 처리 파이프라인과 오류 분류(Invalid JSON 처리 방식 포함)

구조 검사·JWE 감지·Header/Payload 독립 디코딩(결정 항목 7·9)을 하나의 순서로 확정한다.

1. **빈 입력**: 오류가 아니라 대기(idle) 상태다. "JWT를 입력하세요" 같은 placeholder만 보이고 오류 배너는 띄우지 않는다.
2. **입력 크기 검사**(§9): 1MB 초과 시 즉시 "너무 긴 토큰입니다" 오류, 이후 단계로 진행하지 않는다.
3. **세그먼트 개수 검사**: `.`으로 split.
   - 1~2개: "JWT는 일반적으로 3개의 영역으로 구성됩니다."
   - 3개: 정상 JWT/JWS로 간주하고 4단계로.
   - 5개: JWE로 간주(§10), 그 외 단계 진행하지 않는다.
   - 4개 또는 6개 이상: 브리핑에 없는 케이스이므로 Architect가 보강 — "지원하지 않는 토큰 형식입니다({N}개 영역 감지됨)."로 일반화 처리하고 종료.
4. **Header/Payload를 서로 독립적으로 디코딩한다.** 한쪽이 실패해도 다른 쪽 결과는 그대로 보여준다 — 예를 들어 Payload JSON이 깨져 있어도 Header는 정상 표시된다. 각 단계 실패는 다음처럼 구체적으로 구분한다(§4의 3단계와 매핑).
   - `atob` 실패(잘못된 Base64URL 문자) → "Header/Payload를 Base64URL로 디코딩할 수 없습니다."
   - `TextDecoder` fatal 실패(잘못된 UTF-8) → 같은 메시지로 묶는다(사용자 입장에서 구분할 실익이 적다).
   - `JSON.parse` 실패 → "Header/Payload가 올바른 JSON 형식이 아닙니다."
5. **Signature는 디코딩하지 않는다.** 원본 Base64URL 문자열을 그대로 보여주고 "서명 데이터(검증하지 않음)"로 라벨링한다.
6. **Payload가 JSON object로 성공 파싱된 경우에만** Claim 분석(§7)을 실행한다. Payload가 배열이거나 원시값이면("JWT Payload는 보통 JSON object입니다" 정도의 안내만 하고) Claim 분석은 건너뛴다 — 크래시 대신 조용히 스킵.
7. 어떤 단계에서 발생한 예외도 컴포넌트 최상위로 전파되지 않는다 — 모든 디코딩 함수는 값 또는 명시적 에러 결과(`{ ok: false, reason }`류의 반환 타입)를 돌려주고, `throw`는 함수 내부에서만 `try/catch`로 소비한다. React Error Boundary에 기대지 않는다(더 예측 가능하고 QA하기 쉽다).

## 9. Architect 결정 8 — 입력 크기 정책

- 하드 리밋: **1MB**(1,048,576 UTF-16 code unit). 실제 JWT는 임베디드 인증서를 포함해도 이 범위를 넘는 경우가 거의 없다 — `text-cleaner`의 10MB 일반 텍스트 리밋보다 훨씬 작게 잡아, "너무 긴 token" 케이스(§18-7, QA #34)를 현실적인 값으로 재현 가능하게 한다.
- 별도 "성능 경고" 구간은 두지 않는다 — 디코딩 자체가 `atob`+`TextDecoder`+`JSON.parse` 각 1회 호출뿐이라 1MB 입력도 한 프레임 안에 끝난다(`text-cleaner`처럼 문자 단위 반복 처리가 없다).
- **Debounce**: §5는 "붙여넣기 중간 상태에서 오류가 과도하게 깜빡이지 않도록 검토"를 요구한다. 성공/실패 경로를 분리하지 않고 **입력 → 재계산 전체에 균일한 200ms debounce**를 적용한다 — 사람이 지연으로 느끼기엔 짧고, 여러 문자가 한 번에 붙여넣기(paste)될 때의 중간 상태 깜빡임은 확실히 없앤다. `korean-initial-converter`가 "가벼운 계산은 debounce 없음"을 택한 것과 다른 결론이지만, 이 도구는 이유가 다르다 — 성능이 아니라 **붙여넣기 도중의 오류 메시지 플리커 방지**가 목적이므로, 계산이 가벼워도 짧은 debounce를 둔다.

## 10. Architect 결정 9 — JWE(5-part) 감지 UX

- 세그먼트 개수만으로 구조적으로 판별한다(§8 파이프라인 3단계) — 어떤 세그먼트도 디코딩을 시도하지 않는다. JWE의 각 세그먼트는 JWT/JWS와 의미가 완전히 달라(암호화된 키·IV·암호문·인증 태그), 시도해도 무의미한 에러만 만든다.
- 메시지 톤은 "오류"가 아니라 "지원 범위 안내"로 둔다 — 사용자의 입력 실수가 아니라 이 도구가 다루지 않는 형식일 뿐이므로 붉은 오류 배너보다는 중립적인 안내 톤(정보성 배경색)을 쓴다.
- **부분 디코딩을 시도하지 않는다.** JWE의 첫 세그먼트가 기술적으로 유효한 JSON Header일 수 있지만, "3-part JWT/JWS 디코더"라는 단순한 정신 모델을 지키기 위해 5-part 입력은 안내 메시지만 보여주고 그 이상 진행하지 않는다.

## 11. Architect 결정 10 — 결과 영역 모바일 overflow 처리

- Header/Payload/Signature 코드 블록은 `white-space: pre` + `overflow-x: auto`를 컨테이너에 적용한다(줄바꿈으로 들여쓰기 정렬을 깨뜨리지 않기 위해 `pre-wrap`을 쓰지 않는다 — JSON의 들여쓰기 가독성이 이 도구의 핵심 가치 중 하나다).
- 페이지 본문 자체는 어떤 경우에도 가로로 넘치지 않는다 — 코드 블록만 자기 안에서 스크롤한다(프로젝트 전반의 관례와 동일, `document.documentElement.scrollWidth <= clientWidth` QA로 검증).
- 매우 긴 Signature 문자열(줄바꿈 지점이 없는 단일 토큰)도 같은 규칙을 따른다 — `break-all`로 강제로 끊지 않고 가로 스크롤을 허용한다(끊으면 원본 값을 그대로 복사하기 어려워진다).

## 12. Architect 결정 11 — Sample JWT 생성과 관리 방식

- 고정된 fixture를 코드에 상수로 둔다(런타임에 외부에서 가져오지 않는다). 실제 서비스 토큰·Secret은 절대 사용하지 않는다.
- Header는 고정: `{"alg":"HS256","typ":"JWT"}`.
- Payload는 대부분 고정 값을 쓰되(`sub`, `iss`, `aud`(array로 만들어 §14 케이스도 같이 시연), 한글 `name`으로 §36 Unicode QA를 예제 자체로도 보여줌), **`iat`/`exp`만 "예제 JWT 불러오기" 클릭 시점에 동적으로 계산**한다(`iat = 현재 시각`, `exp = iat + 3600`). 이렇게 해야 시간이 지나도 예제가 "이미 만료된 예제"로 고정되지 않고 항상 "아직 만료되지 않음" 상태를 보여준다.
- 위 Header/Payload를 실제로 Base64URL 문자열로 만들려면 인코딩 함수가 필요하다 — `base64UrlToBytes`의 역방향인 소규모 `encodeBase64Url(json: unknown): string` 헬퍼를 **이 샘플 생성 전용**으로 하나 추가한다. 이것은 "JWT 생성 기능"을 새로 만드는 게 아니라(Do Not Build 위반 아님) 데모용 문자열 하나를 만드는 내부 구현 디테일이며, 공개 UI로 노출되는 범용 인코더가 아니다.
- Signature 세그먼트는 검증하지 않으므로 실제 서명일 필요가 없다 — 고정 placeholder 문자열(Base64URL 형태만 맞으면 됨)을 그대로 이어붙인다.
- "이 값은 예제(fixture)이며 실제 서비스 토큰이 아닙니다"라는 라벨을 버튼 또는 결과 영역 근처에 항상 노출한다.

## 13. 처리 파이프라인 요약(Architect 결정 3·4·7·9 종합)

```
빈 입력 → 대기 상태(오류 아님)
   │
   ▼
1MB 초과 → "너무 긴 토큰" 오류, 종료
   │
   ▼
"." split
   │
   ├─ 1~2 segments → "3개 영역 구성" 오류, 종료
   ├─ 5 segments   → JWE 안내(중립 톤), 종료
   ├─ 4 / 6+       → "지원하지 않는 형식" 안내, 종료
   └─ 3 segments   → 계속
        │
        ├─ Header  독립 디코딩(성공/실패 각각 표시)
        ├─ Payload 독립 디코딩(성공/실패 각각 표시)
        │      └─ 성공 + object인 경우만 → Claim 분석(exp/iat/nbf/iss/sub/aud/jti)
        └─ Signature 원문 그대로 표시(디코딩 안 함)
```

## 14. UI 구성

- 상단 히어로: 제목 "JWT 디코더", 설명 한 줄(SEO 키워드 자연 포함, §17).
- 입력 영역: `<textarea>`, placeholder "JWT 토큰을 붙여넣으세요". 200ms debounce 후 아래 결과가 갱신된다(§9).
- 결과 영역(입력이 비어 있지 않을 때만 표시):
  - **Token Status**: 구조(3-part 정상/오류), Payload(JSON decode 성공/실패), Expiration(exp 있으면 상태, 없으면 "exp 없음"), Signature("검증하지 않음" 고정 문구). `docs/EVALUATION.md`와 §17 원칙에 따라 "Valid JWT"라는 표현은 어디에도 쓰지 않는다 — "구조 정상", "디코딩 성공"만 사용한다.
  - **HEADER**: pretty JSON(§6 토큰화 렌더링) + `alg`/`typ`/`kid`/`cty`가 있으면 보기 좋은 필드로 별도 요약. `alg`가 알려진 값이면 짧은 설명(HS256 → "HMAC + SHA-256" 등)을 덧붙이고, `alg: "none"`이면 "서명 알고리즘이 none으로 설정되어 있습니다." 안내를 추가한다(위험 단정 문구는 쓰지 않는다).
  - **PAYLOAD**: pretty JSON(§6). 아래 **CLAIMS** 요약: `iss`/`sub`/`aud`(string 또는 array)/`jti`를 사람이 읽기 좋은 라벨로, `exp`/`iat`/`nbf`는 §7의 Local+UTC+상대시간 형식으로.
  - **SIGNATURE**: 원본 Base64URL 문자열, "서명 데이터 — 검증하지 않음" 라벨.
- 보안 안내: 결과 영역 바로 위/아래에 "JWT를 디코딩하는 것은 서명을 검증하는 것이 아닙니다. Header와 Payload는 누구나 디코딩할 수 있습니다." 한 문단(§10 Critical 원칙과 동일 문구, 경고창 스타일은 아님).
- 버튼: `[JWT 전체 복사]` `[Header 복사]` `[Payload 복사]` `[예제 JWT 불러오기]` `[초기화]`. 복사 성공 시 라벨이 일시적으로 "복사되었습니다"로 바뀐다(다른 도구와 동일 패턴).
- 하단 설명(§32): Header/Payload/Signature 3영역 설명 + "디코딩과 검증은 다른 작업"이라는 문장을 다시 한 번 명시.

## 15. Privacy

- 입력 JWT는 서버로 전송하지 않는다. 외부 API 호출 없음. analytics에 JWT 원문·디코딩된 Payload를 포함하지 않는다.
- `localStorage`/`sessionStorage` 자동 저장 없음. URL query/hash에 토큰을 반영하지 않는다(§28, Do Not Build).
- 페이지에 "입력한 JWT는 브라우저에서만 처리됩니다." 안내를 둔다.

## 16. SEO

- 목표 검색 의도: JWT 디코더, JWT Decoder, JWT 토큰 확인, JWT 해석, JWT Payload 확인, JWT 만료시간 확인, JWT exp 확인, JWT Header, JWT Payload.
- 도구 자체가 페이지 최상단에 위치하고, 설명 콘텐츠는 하단에 짧게 배치한다(§32).
- 다른 도구와 동일하게 `createPageMetadata`로 locale별 canonical/hreflang을 생성하고 `registry.ts` 등록으로 사이트맵에 포함시킨다.

## 17. 파일 구조와 등록

`korean-initial-converter`보다 책임이 뚜렷이 여러 개(구조 파싱, Claim/시간 분석, 하이라이트, 샘플 생성)라 파일을 그 경계대로 나눈다. 그렇다고 `types.ts`/`validation.ts` 같은 군더더기 파일은 만들지 않는다.

```
app/[locale]/tools/jwt-decoder/page.tsx
components/tools/jwt-decoder/jwt-decoder.tsx
lib/tools/jwt-decoder/decode.ts       # base64url<->bytes, 세그먼트 분리, Header/Payload/Signature 디코딩, 에러 분류
lib/tools/jwt-decoder/claims.ts       # 등록 claim 추출, exp/iat/nbf 시간 분석(now 주입 가능), 상대시간
lib/tools/jwt-decoder/highlight.ts    # JSON 토크나이저(§6)
lib/tools/jwt-decoder/sample.ts       # 샘플 JWT 생성(encodeBase64Url 포함)
lib/tools/jwt-decoder/jwt-decoder.test.ts
tests/jwt-decoder-browser.mjs
```

- Web Worker는 사용하지 않는다 — 1MB 이하 입력에 대한 `atob`/`TextDecoder`/`JSON.parse` 각 1회 호출은 메인 스레드에서 체감 지연이 없다.
- `lib/tools/registry.ts`에 `category: "developer"`로 등록한다(`json-formatter`, `base64-converter`, `regex-tester`, `cron-expression-generator`와 같은 카테고리). 아이콘은 lucide-react `KeyRound`를 기본 제안한다 — `ShieldCheck`류의 "검증됨"을 연상시키는 아이콘은 이 도구의 "검증 아님" 메시지와 상충하므로 의도적으로 피한다.
- i18n은 3곳 모두 갱신한다: `Common.toolsNav.jwtDecoder`, `Home.tools.jwtDecoder`, `Tools.jwtDecoder.*`.

## 18. QA 목록

브리핑 §34의 42개 시나리오를 그대로 채택한다.

1. 정상적인 HS256 JWT
2. 정상적인 RS256 Header를 가진 JWT(서명 자체는 검증하지 않음)
3. Header `{"alg":"HS256","typ":"JWT"}` 표시
4. Payload String 값
5. Payload Number 값
6. Payload Boolean 값
7. Nested Object
8. Array
9. 한글 Payload(`{"name":"홍길동"}`)
10. 일본어 Payload
11. Emoji Payload
12. `exp` 존재
13. `exp` 없음
14. 만료된 `exp`
15. 미래 `exp`
16. `iat`
17. `nbf`
18. 현재보다 미래의 `nbf`
19. `iss`
20. `sub`
21. `aud` string
22. `aud` array
23. `jti`
24. `alg: none`
25. `kid` Header
26. 빈 문자열
27. segment 1개
28. segment 2개
29. segment 4개
30. JWE 5-part
31. 잘못된 Base64URL
32. Header JSON invalid
33. Payload JSON invalid
34. 매우 긴 JWT(1MB 초과)
35. Header 복사
36. Payload 복사
37. Clear
38. 예제 JWT 불러오기
39. Mobile 320px
40. Mobile 375px
41. Tablet 768px
42. Desktop 1440px

Architect가 다음 2개를 보강한다(§8 파이프라인의 4/6-segment 케이스, 프로젝트 공통 관례).

43. segment 4개 또는 6개 이상 — "지원하지 않는 형식" 일반화 처리
44. ko/en/ja 3개 locale에서 문구·안내·metadata가 자연스럽게 번역되어 있는가, Console Error 0

## 19. 시간 테스트 정책

§7에서 확정한 대로 `analyzeClaims(payload, nowMs)`가 `nowMs`를 선택적으로 받는다. 유닛 테스트는 실제 `Date.now()`에 의존하지 않고 고정 `nowMs`(예: `2026-08-30T12:00:00Z`)를 명시적으로 넘겨 다음을 검증한다.

- `exp`가 `nowMs` 이후 1시간 → "아직 만료되지 않음", 상대 시간 "1시간 후"
- `exp`가 `nowMs` 이전 1시간 → "만료됨", 상대 시간 "1시간 전"
- `nbf`가 `nowMs` 이후 → "아직 사용 가능 시간이 아닙니다"

## 20. Unicode QA(§36)

Payload 안에 한글·일본어·이모지가 포함된 Base64URL을 디코딩했을 때 `�`(U+FFFD)가 절대 나타나지 않아야 한다(정상 UTF-8인 경우). 반대로 Base64URL 자체가 손상돼 있으면 §4의 `fatal: true`가 명시적 에러를 던지므로, 깨진 문자를 보여주는 대신 "디코딩할 수 없습니다" 오류로 귀결되는지 확인한다 — 두 상황(정상 유니코드/손상된 바이트)을 혼동하지 않는 것이 QA의 핵심이다.

## 21. Security QA(§37)

반드시 실제 Chrome에서 확인한다.

1. JWT가 어떤 네트워크 요청에도 포함되지 않는다(요청 URL·body 전체 검사).
2. Payload가 analytics/로깅 호출에 포함되지 않는다(애초에 이 프로젝트에 analytics 연동이 없으므로, 향후 추가되더라도 이 페이지가 예외가 되도록 설계 원칙으로 남긴다).
3. JWT가 `localStorage`/`sessionStorage`에 저장되지 않는다.
4. JWT가 URL query/hash에 자동 반영되지 않는다.
5. 디코딩된 내용이 `dangerouslySetInnerHTML`/`innerHTML`로 삽입되지 않는다(§6 아키텍처 불변식).
6. Payload 값에 `<script>alert(1)</script>` 문자열을 넣어도 실행되지 않고 텍스트 그대로 표시된다(§6으로 구조적으로 보장되지만 QA로 실측 확인).
7. 결과 화면 어디에도 "Valid JWT"/"검증됨"류의 표현이 없다.

## 22. Critic 필수 질문

`docs/EVALUATION.md`는 최소 10개, 핵심 성공·첫 사용자 이해·입력 오류·결과 신뢰·모바일·키보드/스크린리더·느린/실패 상태·다국어·개인정보·재사용 흐름을 포함하도록 요구한다. 브리핑의 10개에 3개를 보강한다.

1. JWT를 붙여넣자마자 Header와 Payload를 쉽게 확인할 수 있는가? (핵심 성공)
2. Header / Payload / Signature 구분이 명확한가? (첫 사용자 이해)
3. `exp` 값을 Unix Timestamp를 모르는 사람도 이해할 수 있는가? (결과 신뢰)
4. 만료 여부를 빠르게 확인할 수 있는가? (핵심 성공)
5. 디코딩과 서명 검증을 혼동할 가능성이 없는가? (결과 신뢰/개인정보)
6. JWT에 민감정보가 들어갈 수 있다는 점을 고려한 UX인가? (개인정보)
7. 복사 기능이 빠르고 직관적인가? (핵심 성공)
8. 오류가 있는 토큰에서도 페이지가 깨지지 않는가? (입력 오류/느린·실패 상태)
9. 모바일에서도 긴 JWT와 JSON을 확인하기 쉬운가? (모바일)
10. 단순한 기능인데 UI가 과도하게 복잡하지 않은가? (첫 사용자 이해)
11. 키보드만으로 입력·복사·초기화·예제 불러오기까지 완료할 수 있고, 스크린 리더가 Token Status 갱신과 복사 성공을 인지할 수 있는가? (키보드/스크린리더)
12. ko/en/ja 전환 시 Claim 라벨과 안내 문구가 자연스러운가? (다국어)
13. Clear 후 새 토큰을 바로 붙여넣어 다시 확인하는 흐름이 매끄러운가? (재사용 흐름)

## 23. 완료 조건

`docs/EVALUATION.md` 100점 배점(핵심기능 25·사용성 20·모바일 15·접근성 15·성능 10·다국어 5·SEO 5·개인정보 5)과 PASS 게이트(점수 90 이상, Critical 0, High 0, 자동 테스트 PASS, Console Error 0, 모바일 PASS)를 그대로 적용한다. 추가로:

- TypeScript 오류 0, lint 오류·warning 0
- §18 QA 44개 항목 전부 PASS(특히 #9~#11 Unicode, #24 alg none, #30 JWE, #34 대용량, #43 4/6-segment)
- §19 시간 테스트(고정 `nowMs` 기반) PASS
- §21 Security QA 7개 전부 PASS
- Header/Payload/JWT 전체 복사, Clear, 예제 JWT 불러오기 실제 Chrome에서 PASS
- ko/en/ja 및 SEO(canonical/hreflang/sitemap)·홈 카드·메뉴 회귀 PASS
- JWT의 서버 전송·저장소 저장·URL 반영 0
- 화면 어디에도 "Valid JWT" 등 검증을 암시하는 표현 없음

## 24. Architect 최종 검토

### 기존 구조와의 충돌

- Next.js App Router, TypeScript, Tailwind, next-intl 구조와 완전히 일치한다. Server page + Client 컴포넌트 + 순수 domain 함수라는 기존 패턴을 그대로 따른다.
- 서버 route·DB·외부 API가 필요 없다. `json-formatter`/`base64-converter`/`regex-tester`와 같은 "developer" 카테고리의 순수 클라이언트 유틸리티다.

### 확정된 결정 요약(§40 대응)

1. Base64URL→UTF-8: `atob` + `Uint8Array` + `TextDecoder(fatal:true)`(§4)
2. 외부 dependency: 전부 불필요, 표준 Web API만 사용(§5)
3. Syntax highlight: 정규식 토크나이저 + React 텍스트 자식만 렌더링, `dangerouslySetInnerHTML` 절대 금지(§6, 보안 핵심 결정)
4. 시간 표시 형식: `YYYY-MM-DD HH:mm:ss` + 명시적 오프셋/UTC 라벨(§7)
5. Local+UTC 동시 표시: 항상 둘 다, 옵션 없음(§7)
6. 상대 시간: `Intl.RelativeTimeFormat`, `nowMs` 주입 가능한 순수 함수로 테스트 가능하게(§7)
7. Invalid JSON 처리: Header/Payload 독립 디코딩, 실패 지점별(base64/UTF-8/JSON) 메시지 구분, 예외는 함수 내부에서 소비(§8)
8. 입력 크기: 1MB 하드 리밋, 균일 200ms debounce(성능이 아니라 붙여넣기 플리커 방지 목적)(§9)
9. JWE 5-part: 세그먼트 개수만으로 구조적 감지, 부분 디코딩 시도 안 함, 중립 톤 안내(§10)
10. 모바일 overflow: 코드 블록만 `overflow-x-auto`, 페이지 본문은 절대 가로 스크롤 없음(§11)
11. Sample JWT: 고정 fixture + `iat`/`exp`만 클릭 시점에 동적 계산, 전용 `encodeBase64Url` 헬퍼(공개 기능 아님)(§12)

### 남은 구현 위험과 통제

- Syntax highlight 정규식이 JSON 문자열 내부의 이스케이프된 따옴표(`\"`)를 잘못 다루면 토큰 경계가 깨질 수 있다 — `TOKEN_PATTERN`의 문자열 매칭 부분(`"(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"`)이 이를 고려하도록 이미 반영했다. Builder는 이스케이프가 포함된 문자열 값(QA 추가 권장)으로 반드시 실측한다.
- `TextDecoder`의 `fatal` 옵션 브라우저 지원은 사실상 보편적이나(모든 evergreen 브라우저), Builder는 실제 Chrome QA로만 검증하고 폴리필을 추가하지 않는다(불필요한 dependency 회피 원칙과 일치).
- 200ms debounce가 QA 자동화 스크립트의 타이밍과 충돌하지 않도록, 테스트는 값 변경 후 폴링(`waitForFunction`)으로 결과를 기다리고 고정 `waitForTimeout`에만 의존하지 않는다(`text-cleaner`/`korean-initial-converter` QA에서 이미 쓰인 패턴).

### 판정

- Product Owner 범위: `APPROVED`(Must/Should/Could/Do Not Build 경계 포함)
- Architect 기술 검토: `APPROVED FOR BUILD`
- Builder 시작 조건: 이 문서 §4~§21을 그대로 구현하고, §18 QA 44개·§19 시간 테스트·§21 Security QA 7개·§23 완료 조건을 실제 Chrome 브라우저 테스트로 통과시킬 것. 구현 전 이 SPEC을 변경할 필요가 생기면 Architect 재검토를 먼저 받는다.
