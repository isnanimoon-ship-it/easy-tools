# IP 정보 확인 / IP Address Lookup SPEC

## 문서 상태

- 기능명: IP 정보 확인 / IP Address Lookup
- 상태: `DONE`
- 우선순위: 일반 웹 유틸리티 / P0
- Product Owner 승인일: 2026-08-27
- 개선 회차: 3/5
- 예정 URL: `/{locale}/tools/ip-info`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현, Critic 평가, QA 및 Optimizer 3회 개선 완료

## 1. 목적과 사용자 가치

사용자가 별도 로그인이나 네트워크 지식 없이 현재 접속에 사용 중인 공인 IP 주소와 대략적인 네트워크·지역 정보를 빠르게 확인하고, 필요하면 다른 공인 IPv4 또는 IPv6 주소도 직접 조회할 수 있게 한다.

이 도구는 IP 기반 위치가 GPS 위치가 아니며 실제 거주지나 정확한 현재 위치를 보장하지 않는다는 점을 명확히 알린다. VPN, 프록시, 이동통신망, 회사망, ISP 라우팅 때문에 결과가 실제 위치와 다를 수 있다.

## 2. 대상 사용자

- 자신의 공인 IP를 빠르게 확인하려는 일반 사용자
- ISP, ASN, 시간대 등 기본 네트워크 정보를 확인하려는 개발자·운영자
- 특정 공인 IPv4/IPv6의 대략적인 등록·지리 정보를 확인하려는 사용자

## 3. 범위와 우선순위

### Must Have — 첫 버전

- 페이지 진입 시 현재 공인 IP 자동 조회
- 현재 조회 결과를 화면에서 가장 눈에 띄게 표시
- 임의의 단일 IPv4 또는 IPv6 직접 조회
- 조회 버튼과 현재 IP 다시 조회 버튼
- 공인 IP 복사 및 명확한 성공·실패 피드백
- 다음 결과 필드:
  - 공인 IP 주소
  - IP 버전(IPv4/IPv6)
  - 국가
  - 지역/주
  - 도시
  - ISP
  - 조직(Organization)
  - ASN
  - 시간대
- 제공자가 안정적으로 반환하는 경우 다음 보조 필드:
  - 대륙 및 대륙 코드
  - 국가 코드
  - 우편번호
  - 위도·경도(근사값)
  - 국가 전화 코드
- IP 입력 전후 공백 제거, 형식 검증 및 표준화된 표시
- 잘못된 입력에서는 외부 API 요청 금지
- localhost, 사설망, 링크 로컬, 예약·특수 목적 주소를 외부 요청 전에 로컬 분류
- 로딩, 성공, 빈 값, 재조회, 검증 오류, 네트워크 오류, 타임아웃, 호출 한도 초과, 제공자 오류, 응답 형식 오류를 서로 구분
- 외부 제공자 사용 및 개인정보 처리 안내
- `ko`, `en`, `ja`, 독립 URL, metadata, canonical, hreflang, 공통 메뉴 등록
- 320px 이상 모바일 정상 작동

### Should Have — 후속 검토

- 키보드 Enter로 직접 조회 실행
- 현재 결과의 조회 시각 표시(사용자 브라우저 시간, 저장하지 않음)
- API가 제공하는 `Retry-After`를 이용한 재시도 가능 시점 안내
- 국가 코드, 대륙, 우편번호, 위도·경도를 접을 수 있는 보조 정보로 표시
- IP 주소 전체 결과 복사와 별도로, 주요 텍스트 정보를 사람이 읽을 수 있는 형식으로 복사

### Could Have — 별도 SPEC 필요

- 네트워크/CIDR 정보
- Reverse DNS/hostname
- 국가 통화 정보
- 결과 JSON 보기 또는 다운로드
- Query parameter를 통한 조회 대상 공유
- 별도 유료 제공자 또는 로컬 DB 기반 fallback

### Do Not Build — 첫 버전 제외

- 지도 표시
- VPN·프록시·Tor·위협 탐지
- 도메인 이름 조회 또는 DNS 도구
- IP 대역 일괄 조회
- 조회 기록, 최근 검색, 즐겨찾기
- localStorage, sessionStorage, IndexedDB, cookie에 IP 저장
- 자체 IP 데이터베이스 구축
- 사용자의 정확한 위치라고 단정하는 표현
- 브라우저 위치 권한 요청

후속 항목은 Product Owner 승인과 별도 SPEC 없이는 구현하지 않는다.

## 4. 핵심 사용자 흐름

### 현재 IP 자동 조회

1. 사용자가 `/{locale}/tools/ip-info`에 진입한다.
2. 결과 영역에 명확한 로딩 상태를 표시한다.
3. 브라우저가 선택된 외부 제공자의 현재 IP HTTPS endpoint를 한 번 호출한다.
4. 런타임 검증을 통과한 응답을 내부 `IpInfo` 형식으로 정규화한다.
5. 공인 IP를 우선 표시하고 나머지 정보를 그룹화한다.
6. 실패 시 기존 결과를 사실처럼 남기지 않고 원인별 오류와 `다시 시도`를 제공한다.

개발 모드 React Strict Mode의 effect 재실행, locale 이동, 빠른 재마운트로 중복 요청이 폭증하지 않도록 동일 마운트 요청을 취소·무효화하고 테스트한다. 전역·영구 캐시에는 IP 응답을 저장하지 않는다.

### 다른 IP 직접 조회

1. 사용자가 단일 IP를 입력한다.
2. 앞뒤 공백을 제거한다. 내부 공백, 포트, CIDR suffix, URL, 도메인은 허용하지 않는다.
3. 로컬 parser로 IPv4/IPv6 형식과 주소 범주를 판정한다.
4. 잘못된 형식 또는 조회 불가 범주라면 외부 요청 없이 설명을 표시한다.
5. 유효한 공인 IP만 provider adapter에 전달한다.
6. 최신 요청만 결과를 갱신한다. 이전 요청은 `AbortController`로 취소하거나 request id로 무효화한다.

현재 IP 결과와 직접 조회 결과는 같은 카드 형식을 사용하되, 제목에 `현재 IP` 또는 `조회한 IP`를 표시해 출처를 혼동하지 않게 한다.

## 5. 입력 규칙과 로컬 주소 분류

- 입력은 한 번에 하나의 IP 주소만 허용한다.
- IPv4는 4개 10진수 octet 각각 0~255여야 한다. 모호한 8진수·16진수·축약 표기는 허용하지 않는다.
- IPv6는 압축 표기 `::`, 대소문자 16진수, IPv4-mapped 형식을 표준 parser가 검증한다.
- 최대 입력 길이는 IPv6 zone identifier 등을 제외한 단일 주소에 충분한 64자로 제한한다.
- `%eth0` 같은 zone identifier, `:port`, `/prefix`, scheme, path, domain은 첫 버전에서 거부한다.
- 검증과 분류는 `ipaddr.js`의 parse/range 결과를 얇은 순수 함수로 감싸 사용한다. IPv6를 정규식만으로 임의 구현하지 않는다.
- parser가 인식한 공인 `unicast`만 API로 전송한다. IPv4-mapped IPv6는 원래 의미를 유지해 정규화하고 테스트로 고정한다.

최소 다음 범주를 로컬에서 분류하고 provider를 호출하지 않는다.

| 범주 | 대표 예 | 처리 |
|---|---|---|
| 루프백/localhost | `127.0.0.1`, `::1` | 로컬 주소라는 안내 |
| 사설/Unique Local | `10.0.0.1`, `172.16.0.1`, `192.168.0.1`, `fc00::/7` | 공인 IP 정보 조회 불가 안내 |
| 링크 로컬 | `169.254.0.0/16`, `fe80::/10` | 동일 링크 전용 안내 |
| 미지정 | `0.0.0.0`, `::` | 조회 대상이 아님을 안내 |
| Carrier-grade NAT | `100.64.0.0/10` | 공유 주소 공간 안내 |
| 멀티캐스트 | `224.0.0.0/4`, `ff00::/8` | 조회 대상이 아님을 안내 |
| 문서·시험용 | `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 문서 예시용 주소 안내 |
| 벤치마크·예약·미래용 | parser가 해당 범주로 판정한 주소 | 외부 조회하지 않고 특수 목적 안내 |

주소 범위의 최종 분류는 구현 시 고정한 `ipaddr.js` 버전과 IANA special-purpose registry를 기준으로 테스트한다. 라이브러리가 `unicast`로 분류하더라도 별도 최신 IANA 목록에서 조회 금지인 범위가 있으면 명시적 allow/deny 테이블로 보완한다.

## 6. 결과 데이터 계약

외부 응답 객체를 UI에서 직접 사용하지 않는다. provider adapter가 런타임 검증 후 다음 내부 타입으로 정규화한다.

```ts
type IpVersion = "IPv4" | "IPv6";
type LookupSource = "current" | "manual";

interface IpInfo {
  ip: string;
  version: IpVersion;
  source: LookupSource;
  country: string | null;
  countryCode: string | null;
  continent: string | null;
  continentCode: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  organization: string | null;
  asn: string | null;
  timezone: string | null;
  callingCode: string | null;
  retrievedAt: string;
  provider: "ipwhois";
}
```

- 외부 값은 `unknown`에서 시작해 필드별 타입·범위·길이를 검증한다.
- `success !== true`, 누락되거나 유효하지 않은 `ip/type`, 비정상 JSON은 성공으로 간주하지 않는다.
- 위도는 -90~90, 경도는 -180~180, country code는 대문자 ASCII 2자, ASN은 숫자 또는 `AS` 접두 숫자로 정규화한다.
- 선택 필드가 비어 있으면 `알 수 없음`을 표시하되, 필수 identity 필드가 불완전하면 `invalid-response` 오류로 처리한다.
- UI, analytics, 로그가 원본 provider response를 보존하거나 출력하지 않는다.

## 7. 외부 API 제공자 비교와 선정

### 조사 기준과 시점

- 조사일: 2026-08-27
- 공식 문서, 공식 가격, 공식 약관·개인정보 정책만 근거로 사용했다.
- 가격, 무료 한도, 필드, 약관은 변경될 수 있으므로 Builder 착수일과 실제 배포 직전에 Architect가 다시 확인한다.

| 후보 | HTTPS / CORS | IPv4·IPv6 / 현재·임의 조회 | 첫 버전 필수 데이터 | 무료 한도·키 | 상업·운영 조건 | 결정 |
|---|---|---|---|---|---|---|
| `ipwho.is` (IPWHOIS.IO Free) | HTTPS 지원. 공식 문서가 브라우저 CORS 요청의 도메인별 집계를 명시 | 모두 지원 | 도시·지역·국가·우편번호·좌표·ISP·조직·ASN·시간대 제공 | 키 없음, 도메인당 1,000회/일, 초과 시 429와 `Retry-After` | 무료 상업 이용 허용, SLA 없음 | **선정** |
| `ipapi.co` free trial | HTTPS, client integration 지원 | 모두 지원 | 대부분 제공하나 ISP와 조직 분리가 불명확 | 1,000회/일 | 공식 가격표가 무료를 테스트/개발용이며 production용이 아니라고 명시, query logging 명시 | production 후보에서 제외 |
| IPinfo Lite | HTTPS, CORS, dual stack | 모두 지원 | 무료 Lite는 국가·대륙·기본 ASN만 제공해 도시·지역·ISP·시간대 부족 | token 필수, 인증 요청 무제한 | 공개 token 노출 금지를 위해 server proxy가 필요 | 필수 필드 부족으로 제외 |
| IPinfo Legacy public | HTTPS, CORS | IPv4/IPv6와 현재·임의 조회 | 도시급 필드 제공 가능 | 무계정 1,000회/일, 같은 client IP 공유 | legacy endpoint이며 무작위 rate limit 가능 | 신규 구현 주 제공자로 부적합 |
| `ip-api.com` free | 무료 endpoint는 HTTPS 미지원 | IPv4/IPv6 지원 | 필수 데이터 다수 제공 | 키 없음, 45회/분 | 무료 endpoint 상업 이용 금지 | 보안·약관 기준 미달로 제외 |

### 선정 결정

첫 버전 provider는 `https://ipwho.is/`로 정한다.

선정 이유:

- API key를 브라우저에 노출하거나 이를 숨기기 위한 자체 서버가 필요 없다.
- HTTPS, CORS, 현재 IP, 임의 IPv4/IPv6 조회를 하나의 단순 endpoint에서 지원한다.
- 첫 버전 필수 필드인 ISP, 조직, ASN, 도시, 지역, 시간대를 무료 응답에서 제공한다.
- 무료 endpoint의 상업 이용이 공식 문서상 허용된다.
- provider 고유 response는 adapter 한 곳에 격리해 교체 가능하게 한다.

제약과 운영 조건:

- 무료 CORS 한도 1,000회/일은 방문자별이 아니라 도메인 전체가 공유한다. 트래픽이 늘면 빠르게 소진될 수 있으므로 429는 정상 운영 상태로 설계한다.
- 무료 endpoint에는 SLA가 없다. 이 도구는 provider 장애 시 기능이 제한될 수 있음을 오류 UI에서 설명한다.
- 무료 응답에는 통화 및 보안 데이터가 없으므로 첫 버전에서 표시하지 않는다.
- 제공자 privacy policy는 사용 시 IP·브라우저·OS·방문 정보가 로그에 저장될 수 있다고 밝힌다. 사용 전 화면에 외부 제공자 전송을 명확히 고지한다.
- production 예상 사용량이 일 700회를 지속적으로 넘거나 429가 관측되면 배포 전에 유료 plan 또는 대체 provider를 Architect가 재검토한다. 사용자 모르게 fallback 제공자에 중복 전송하지 않는다.

### 공식 근거

- IPWHOIS.IO 문서: `https://ipwhois.io/documentation`
- IPWHOIS.IO 가격: `https://ipwhois.io/pricing`
- IPWHOIS.IO 약관: `https://ipwhois.io/terms`
- IPWHOIS.IO 개인정보 정책: `https://ipwhois.io/privacy`
- ipapi 문서·가격·약관·개인정보: `https://ipapi.co/api/`, `https://ipapi.co/pricing/`, `https://ipapi.co/terms/`, `https://ipapi.co/privacy/`
- IPinfo 개발 문서: `https://ipinfo.io/developers`
- IPinfo Legacy 비교: `https://support.ipinfo.io/hc/en-us/articles/34121895556242-Legacy-Free-API-vs-IPinfo-Lite`
- ip-api 무료 JSON 문서: `https://ip-api.com/docs/api:json`

## 8. API 호출·키·서버 경계

- 첫 버전은 브라우저에서 `https://ipwho.is/` 또는 `https://ipwho.is/{encodedIp}`를 직접 GET한다.
- API key, 환경변수, Route Handler, Server Action, proxy를 만들지 않는다.
- 현재 IP 자동 조회를 Next.js 서버에서 실행하면 사용자 대신 서버의 IP가 조회될 수 있으므로 Server Component에서 호출하지 않는다.
- 임의 IP는 반드시 parser가 생성한 canonical string만 URL path에 넣고 `encodeURIComponent`를 적용한다.
- 요청 timeout은 8초이며 `AbortController`로 종료한다.
- 자동 재시도는 하지 않는다. 실패 후 사용자가 `다시 시도`를 선택해야 새 요청을 보낸다.
- 같은 입력을 연속 클릭할 때 진행 중인 요청을 중복 생성하지 않는다.
- provider 교체를 위해 endpoint, fetch, runtime schema, normalization, error mapping을 `lib/tools/ip-info/provider.ts` adapter에 격리한다.
- 향후 유료 key가 필요해지면 client에 넣지 않는다. 그때 별도 Architect 승인 후 최소 필드만 반환하고 IP를 기록하지 않는 Route Handler를 설계한다.

## 9. 개인정보와 보안

- 사용자의 현재 IP와 직접 조회한 대상 IP는 `ipwho.is` 및 그 인프라 제공자에게 HTTPS 요청으로 전송된다.
- 사이트 자체 서버, 자체 DB, 로그, analytics, URL query/hash, localStorage, sessionStorage, IndexedDB, cookie에 조회 IP나 결과를 저장하지 않는다.
- 전체 IP, 전체 외부 응답, stack trace를 `console.log/error`, telemetry, analytics event로 남기지 않는다.
- 오류 관측이 추후 필요하면 IP를 제외한 오류 코드, provider, 대략적 시각만 별도 개인정보 검토 후 허용한다.
- UI에 `조회 시 IP 주소가 외부 IP 정보 제공자(IPWHOIS.IO)로 전송됩니다`와 provider privacy link를 조회 전부터 보이게 표시한다.
- 위치는 `대략적인 IP 기반 위치`로만 표현하며 거주지, 정확한 현재 위치, 신원으로 사용하지 않는다.
- 결과 텍스트는 React 기본 escaping으로 렌더링하고 `dangerouslySetInnerHTML`을 사용하지 않는다.

## 10. 상태와 오류 계약

```ts
type LookupErrorCode =
  | "invalid-input"
  | "non-public-ip"
  | "offline"
  | "timeout"
  | "rate-limited"
  | "provider-unavailable"
  | "provider-rejected"
  | "invalid-response"
  | "copy-failed";
```

| 상태/오류 | 판정 기준 | 사용자 안내와 복구 |
|---|---|---|
| 초기 자동 조회 | 첫 client mount | 로딩 skeleton 또는 status, 중복 호출 금지 |
| 빈 직접 입력 | trim 후 빈 값 | 오류 없음, 입력 안내 유지 |
| `invalid-input` | parser 실패 | 올바른 IPv4/IPv6 예시, API 요청 없음 |
| `non-public-ip` | 특수/사설 범주 | 범주명과 공인 IP만 조회 가능함을 안내, API 요청 없음 |
| `offline` | `navigator.onLine === false` 또는 명백한 network failure | 연결 확인 후 다시 시도 |
| `timeout` | 8초 초과 | 제공자 응답 지연, 다시 시도 |
| `rate-limited` | HTTP 429 | 호출 한도 초과, `Retry-After`가 유효하면 재시도 가능 시각 표시 |
| `provider-unavailable` | 5xx | 외부 서비스 일시 장애, 다시 시도 |
| `provider-rejected` | success=false 또는 지원 불가 응답 | 조회할 수 없는 주소라는 안전한 안내 |
| `invalid-response` | JSON/type/schema 불일치 | 결과를 표시하지 않고 잠시 후 다시 시도 안내 |
| `copy-failed` | Clipboard API 없음·거부 | 결과 유지, 직접 선택 복사 안내 |

- 개발자 예외 원문, provider stack, 원본 response를 사용자에게 노출하지 않는다.
- 오류는 `role="alert"`, 로딩·복사 성공은 적절한 `role="status"` live region으로 알린다.
- 사용자 취소나 unmount의 `AbortError`는 오류로 표시하거나 console error로 남기지 않는다.

## 11. UI/UX 요구사항

- 페이지 상단: H1, 한 문장 설명, 외부 provider 개인정보 안내
- 첫 결과 카드: `현재 공인 IP`, 큰 IP 텍스트, 복사, 상태/새로고침
- 직접 조회: visible label이 있는 단일-line input, 조회 버튼, 간단한 IPv4/IPv6 예시
- 결과 상세: 위치와 네트워크 정보를 시각적으로 구분한 definition list
- 보조 정보는 핵심 IP·국가·ISP보다 시각적으로 약하게 표시
- 값이 없을 때 레이아웃을 제거해 의미가 바뀌지 않도록 `알 수 없음`을 일관되게 사용
- 긴 IPv6, 긴 ISP/조직명이 줄바꿈되어 가로 overflow를 만들지 않아야 한다.
- 로딩 중 버튼의 중복 실행을 막되 다른 독립 영역의 조작까지 불필요하게 막지 않는다.
- 현재 IP 재조회는 직접 입력을 지우거나 덮어쓰지 않는다.
- Copy는 IP 주소만 복사하며 버튼 label을 `IP 주소 복사`로 명확히 한다.

모바일 DOM 순서:

1. 설명·개인정보 안내
2. 현재 공인 IP 카드
3. 다른 IP 조회 입력과 버튼
4. 결과 상세
5. 위치 정확도·개인정보 설명

## 12. 접근성

- 입력, 조회, 재조회, 복사에 명확하고 locale별로 번역된 accessible name을 제공한다.
- placeholder만 label로 사용하지 않는다.
- 키보드만으로 입력→조회→결과→복사 흐름이 가능해야 한다.
- focus가 로딩 중 임의로 이동하지 않는다. 직접 조회 성공 시 결과 heading에 programmatic focus를 강제하지 않고 live region으로 알린다.
- 오류는 입력과 `aria-describedby`로 연결하고 색상만으로 구분하지 않는다.
- loading 상태는 `aria-busy`, 상태 문구는 live region을 사용한다.
- 표 대신 작은 화면에서도 의미 순서를 보존하는 `dl/dt/dd`를 우선한다.
- IP 문자열에는 `dir="ltr"`을 적용해 RTL 확장 시에도 읽기 순서를 보존한다.
- 주요 버튼은 모바일에서 최소 44×44px 목표를 만족한다.

## 13. 반응형 요구사항

- 필수 viewport: 320×800, 375×812, 768×1024, 1024×768, 1280×900
- 320px에서도 IP 주소, copy, refresh, lookup 버튼이 잘리거나 겹치지 않는다.
- IPv6와 긴 조직명은 `overflow-wrap:anywhere` 또는 동등한 처리로 문서 가로 스크롤을 만들지 않는다.
- 입력과 조회 버튼은 좁은 화면에서 세로 배치, 충분한 폭에서 가로 배치할 수 있다.
- 국가·지역·네트워크 정보는 좁은 화면 1열, 넓은 화면 2열을 허용한다.
- zoom 200%에서 핵심 조작과 결과를 사용할 수 있어야 한다.

## 14. 다국어와 SEO

- message namespace: `Tools.ipInfo`
- `ko`, `en`, `ja`에 기능·오류·개인정보·위치 정확도 문구를 모두 제공한다. key 누락이나 다른 locale fallback을 허용하지 않는다.
- 고유 title과 description에 무료 IP 확인, IPv4/IPv6, ISP/지역 정보의 실제 범위만 포함한다.
- canonical: `/{locale}/tools/ip-info`
- alternates/hreflang: `ko`, `en`, `ja`, 필요 시 기존 프로젝트 규칙의 `x-default`
- H1은 locale별 하나이며 현재 IP 결과는 client hydration 후 표시해도 설명 콘텐츠는 서버 렌더링한다.
- 본문에 `공인 IP란?`, `IP 위치 정보의 한계`, `VPN/프록시 사용 시 차이`, `개인정보와 외부 제공자`를 과장 없이 설명한다.
- `정확한 주소`, `신원 확인`, `완벽한 VPN 탐지` 같은 보장 표현을 금지한다.

## 15. 구현 구조

```text
app/[locale]/tools/ip-info/page.tsx
components/tools/ip-info/ip-info.tsx
components/tools/ip-info/ip-info.test.tsx
lib/tools/ip-info/ip-address.ts
lib/tools/ip-info/ip-address.test.ts
lib/tools/ip-info/provider.ts
lib/tools/ip-info/provider.test.ts
tests/ip-info-browser.mjs
messages/{ko,en,ja}.json                 # Tools.ipInfo
```

- page/metadata/설명 콘텐츠는 Server Component로 유지한다.
- 자동 조회, 입력, fetch, clipboard, live state만 Client Component에 둔다.
- 주소 parse/classification과 response normalization은 React와 분리한 순수 함수로 구현한다.
- `ipaddr.js`는 production dependency로 정확한 버전을 lockfile에 고정한다. 구현 전에 최신 유지보수 상태와 license(MIT)를 재확인한다.
- 기존 `Button`, `Container`, 복사 패턴을 우선 재사용한다. IP 결과 전용 카드 때문에 범용 `ResultPanel` API를 과도하게 확장하지 않는다.
- provider adapter에는 fetch 함수를 주입할 수 있게 하여 실제 외부 API 없이 deterministic 단위 테스트가 가능해야 한다.

## 16. 수용 기준

1. 첫 진입 시 `https://ipwho.is/` 현재 IP 조회가 정확히 한 번의 유효 요청으로 시작되고 로딩·성공·실패가 명확하다.
2. 현재 IP, IP 버전, 국가, 지역, 도시, ISP, 조직, ASN, 시간대가 올바르게 정규화되어 표시된다.
3. 제공되지 않은 선택 필드는 잘못 추정하지 않고 `알 수 없음`으로 표시된다.
4. 직접 입력한 공인 IPv4와 IPv6를 모두 조회할 수 있다.
5. 빈 직접 입력은 오류가 아니며 API를 호출하지 않는다.
6. 잘못된 IPv4/IPv6, URL, 도메인, port, CIDR, 여러 값은 사용자용 오류를 표시하고 API를 호출하지 않는다.
7. localhost, 사설망, link-local, CGNAT, multicast, documentation, reserved 주소를 로컬 분류하고 provider로 전송하지 않는다.
8. provider response를 `unknown`에서 런타임 검증하며 잘못된 JSON·누락 필드·잘못된 타입을 성공으로 표시하지 않는다.
9. offline, timeout, 429, 5xx, success=false, invalid response가 각각 정의된 오류로 매핑된다.
10. `Retry-After`가 유효한 429는 재시도 가능 정보를 표시하고 자동 재시도하지 않는다.
11. 빠른 연속 조회, locale 이동, unmount 뒤 stale response가 최신 결과를 덮어쓰지 않는다.
12. IP 주소 복사는 정확한 현재 표시값만 복사하며 성공·거부가 접근 가능하게 안내된다.
13. 결과 위치는 근사치임을 상시 표시하고 사용자 위치나 신원으로 단정하지 않는다.
14. 외부 제공자와 전송 데이터 안내가 최초 API 요청이 일어나는 화면에 보인다.
15. 사이트 자체 저장소·로그·analytics·URL에 조회 IP 또는 전체 응답을 저장하지 않는다.
16. 320/375/768/1024/1280px에서 기능 완료, 문서 가로 overflow·겹침·잘림 0이다.
17. keyboard, label, focus, `aria-busy`, status/alert, 200% zoom 요구를 만족한다.
18. `ko`, `en`, `ja` 기능·오류·privacy 문구, metadata, canonical, hreflang과 공통 메뉴가 완전하다.
19. 정상·오류·취소 흐름에서 Console Error와 unhandled rejection이 0이다.
20. 외부 provider 장애나 무료 한도 초과에서 앱 전체가 깨지지 않고 복구 가능한 상태를 유지한다.

## 17. QA 필수 테스트

### 로컬 parser와 분류

1. 공인 IPv4: `8.8.8.8`
2. 공인 IPv4: `1.1.1.1`
3. 공인 IPv6: `2001:4860:4860::8888`
4. 잘못된 IPv4: `999.999.999.999`
5. 불완전 IPv4: `192.168.1`
6. 잘못된 IPv6: `2001:::1`
7. 빈 입력과 공백 입력
8. 앞뒤 공백이 있는 유효 IP
9. URL: `https://8.8.8.8`
10. port 포함: `8.8.8.8:53`, `[2001:4860:4860::8888]:443`
11. CIDR: `8.8.8.8/24`
12. domain: `example.com`
13. localhost: `127.0.0.1`, `::1`
14. 사설망: `10.0.0.1`, `172.16.0.1`, `192.168.0.1`, `fc00::1`
15. link-local: `169.254.1.1`, `fe80::1`
16. CGNAT: `100.64.0.1`
17. documentation: `192.0.2.1`, `198.51.100.1`, `203.0.113.1`, `2001:db8::1`
18. multicast·unspecified·reserved 대표값
19. IPv4-mapped IPv6 대표값

각 비공인·무효 입력에서 fetch 호출 횟수가 0인지 검증한다.

### provider와 상태

- 현재 IP endpoint 및 임의 IPv4/IPv6 endpoint URL
- 정상 full response, 선택 필드 null/누락, `success:false`
- malformed JSON, HTML response, 필수 필드 누락, 잘못된 필드 타입·좌표 범위
- HTTP 400/403/404/429/500/503와 유효·무효 `Retry-After`
- offline, network reject, 7,999ms 성공, 8,000ms timeout 경계
- 사용자 재시도, 진행 중 중복 클릭, 이전 요청 지연 후 최신 요청 성공, unmount abort
- 자동 조회가 서버가 아닌 browser provider endpoint로 향하는지 검증
- console·analytics·storage에 marker IP와 response marker가 남지 않는지 검증

### UI·접근성·다국어

- 로딩 skeleton/status, 현재/직접 조회 heading, 결과 definition list
- 복사 성공, 권한 거부, Clipboard API 미지원
- Enter 조회, keyboard tab 순서, visible label, focus ring, alert/status announcement
- `ko`, `en`, `ja` 모든 문구와 metadata
- 긴 IPv6, 200자 ISP/조직명, 긴 localized city/region
- viewport 320/375/768/1024/1280px와 200% zoom
- direct URL, reload, back/forward, 공통 메뉴 진입
- 문서 가로 overflow, control clipping, text collision 0

### 필수 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- 기능 전용 실제 Chrome QA

자동 테스트에는 fail, skip, todo가 없어야 한다. 외부 API에 의존하는 단위·컴포넌트 테스트는 mock adapter로 수행한다. 실제 provider smoke test는 rate limit을 보호하기 위해 QA 세션당 현재 IP 1회, 대표 IPv4 1회, IPv6 1회 이내로 제한하고 응답에 실제 IP를 artifact나 로그로 남기지 않는다.

## 18. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 issue Critical 0, High 0
- lint, type-check, 전체 자동 테스트, build, audit PASS
- TypeScript 오류 0
- Console Error 및 unhandled rejection 0
- 현재 IP 자동 조회 PASS
- 공인 IPv4/IPv6 직접 조회 PASS
- 로컬 IP·사설망·예약 주소의 외부 요청 차단 PASS
- provider 오류·timeout·rate limit·invalid response 복구 PASS
- 모바일 및 접근성 PASS
- `ko`, `en`, `ja`와 SEO PASS
- 외부 provider 고지 및 사이트 자체 비저장 검증 PASS
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 억지로 승인하지 않고 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 자신의 결과를 최종 승인하지 않는다. Critic이 점수와 issue를 결정하고 QA가 객관적 증거를 제공한 뒤 Product Owner만 최종 상태를 기록한다.

## 19. Architect 검토

### 기존 구조와의 충돌

- `/{locale}/tools/{slug}` 라우팅, Server page + 필요한 최소 Client Component, `lib/tools/{slug}` 순수 로직, `next-intl` message 구조와 일치한다.
- 고유 slug `ip-info`는 기존 route와 충돌하지 않는다.
- 기존 프로젝트의 브라우저 우선 원칙과 대체로 일치하지만, 기능 본질상 외부 API 전송이 필수다. 이 예외를 UI와 SPEC에 공개했으므로 architecture 규칙을 위반하지 않는다.
- 현재 공인 IP는 서버 proxy로 조회하면 배포 서버 IP가 될 위험이 있으므로 브라우저 직접 호출이 더 정확하고 불필요한 서버를 만들지 않는다.
- 공통 `Button`, `Container`, copy feedback 패턴을 재사용할 수 있다. 결과 필드 구조가 기존 text result와 달라 전용 결과 컴포넌트를 두는 것이 적절하다.

### Product Owner 결정

- 임의 IPv4/IPv6 조회: 도구명과 QA 요구에 직접 부합하므로 **Must Have**.
- 새로고침/재시도: 자동 조회 실패 복구에 필요하므로 **Must Have**.
- 위도·경도, 우편번호, 대륙, 국가 코드, 전화 코드: provider 무료 응답이 안정적으로 제공할 때 **Must Have 보조 필드**. null은 허용.
- 통화, CIDR/network, reverse DNS: 선정 provider 무료 응답에 없으므로 **Could Have**.
- VPN·proxy 탐지: 정확도·비용·오해 위험 때문에 **Do Not Build**.
- 지도: 외부 지도 API·추가 tracking·정확한 위치라는 오해를 늘리므로 **Do Not Build**.
- 결과 JSON/다운로드·조회 기록: 핵심 목표와 무관하므로 첫 버전 제외.

### 기술 위험과 완화

- 도메인 공유 1,000회/일: 429 전용 상태, 수동 재시도, 자동 재시도 금지, 배포 전 조건 재검토.
- 외부 SLA 없음: timeout, provider 장애 UI, 결과를 stale success로 유지하지 않음.
- 개인정보: 요청 전 고지, HTTPS, 직접 provider 1회 호출, 자체 저장·로그·analytics 금지.
- IPv6 검증 복잡성: `ipaddr.js` 사용과 IANA 특수 범위 보완, 정규식 단독 구현 금지.
- provider schema 변경: `unknown` runtime 검증과 adapter 격리.
- race/Strict Mode: abort/request id 및 자동 조회 호출 횟수 테스트.
- 도시급 정확도 오해: 근사치 안내를 결과 가까이에 상시 표시.

### 의존성과 배포 판단

- runtime dependency 후보: `ipaddr.js` 하나. 구현 시작 시 최신 안정 버전, package 상태, MIT license, bundle 영향을 다시 확인하고 exact version을 lockfile에 고정한다.
- IP provider SDK는 설치하지 않고 native `fetch`를 사용한다.
- API key와 서버 환경변수는 없다.
- Route Handler, Server Action, 자체 proxy는 첫 버전에서 만들지 않는다.
- 외부 host `ipwho.is`만 기능상 허용한다. 국기 CDN 이미지 등 provider response에 포함된 외부 asset URL은 사용하지 않는다.

### Architect 판정

- 구조 충돌: 없음
- 구현 가능성: 있음
- 개인정보 예외: 외부 provider 전송을 명확히 고지하는 조건으로 허용
- 무료 한도 위험: 알려진 운영 위험으로 수용, 429 및 배포 전 재검토 필수
- Builder 인계 상태: `READY`
- 구현 허가: 아직 사용자 요청 범위 밖이므로 미착수
