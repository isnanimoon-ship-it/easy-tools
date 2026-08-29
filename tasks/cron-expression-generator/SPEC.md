# Cron 표현식 생성기 / Cron Expression Generator SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- 예정 URL: `/{locale}/tools/cron-expression-generator`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P0
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현 → Critic → QA → Optimizer 1 → Critic·QA 재검증 완료
- 구현 상태: 완료 (`PROGRESS.md`의 Cron 표현식 생성기 완료 기록 참조)

## 1. 목적과 성공 기준

Cron 문법을 모르는 사용자는 실행 주기를 선택해 일반적인 Unix 5필드 Cron을 만들고, Cron을 아는 사용자는 표현식을 직접 입력해 검증·설명·다음 실행 시각을 확인한다. 모든 계산은 브라우저 메모리에서 수행하며 입력을 서버, 외부 API, URL 또는 저장소로 보내지 않는다.

첫 버전의 성공 기준은 다음과 같다.

1. 생성기와 직접 입력이 같은 5필드 표현식과 실행 의미를 가진다.
2. 지원 문법의 유효성·범위 오류가 필드 단위로 정확히 표시된다.
3. 고정 기준 시각과 선택한 IANA timezone에 대한 다음 실행 결과가 검증된 라이브러리 결과와 같다.
4. 복잡한 표현식을 억지로 단순한 자연어로 단정하지 않는다.
5. 320px 모바일에서 생성·직접 입력·복사·초기화가 가능하다.

## 2. 호환성 선언

- 기준: Unix/Vixie 계열의 `분 시 일 월 요일` 5필드 Cron.
- 필드: Minute `0-59`, Hour `0-23`, Day of Month `1-31`, Month `1-12`, Day of Week `0-7`.
- Day of Week의 `0`과 `7`은 모두 일요일이다.
- 지원 연산자: `*`, `,`, `-`, `/`와 10진 정수.
- 공백은 필드 사이에서 하나 이상 허용하고 정규화 출력은 단일 ASCII space를 사용한다.
- DOM과 DOW가 모두 `*`가 아니면 Unix/Vixie 관례에 따라 **OR**로 실행한다. 예: `0 9 1 * 1`은 매월 1일 또는 월요일 오전 9시다. UI에 경고를 항상 표시한다.
- Cron 표현식 자체에는 timezone이 포함되지 않는다. 화면의 timezone은 미리보기 계산 기준일 뿐 실제 서버 설정을 변경하지 않는다.

다음은 첫 버전에서 지원하지 않는다: 6·7필드, 초·연도, `?`, `L`, `W`, `#`, `H`, `+`, 월·요일 영문 별칭, `@daily` 같은 macro, 환경변수, command가 붙은 crontab 전체 줄, Quartz, Spring, AWS EventBridge Cron. 라이브러리가 내부적으로 인식하더라도 제품 검증기가 거부한다.

## 3. 사용자와 대표 흐름

- 일반 사용자: Preset 또는 실행 주기 선택 → 시간·요일·날짜 설정 → 표현식·설명·다음 5회 확인 → 복사.
- 개발자: 표현식 직접 입력 → 300ms debounce 검증 → 필드별 의미·다음 실행 확인 → 복사.
- 직접 입력이 단순한 생성기 형태와 일치하면 UI를 역동기화한다. 완전하고 손실 없는 역변환이 불가능하면 `사용자 지정`으로 전환하고 표현식은 변경하지 않는다.

## 4. Product Owner 범위 결정

| 기능 | 분류 | 첫 버전 결정 |
|---|---|---|
| 5필드 Cron 생성 | Must | 매분, 매 N분, 매시간, 매 N시간, 매일, 매주, 매월, 특정 요일·시간·날짜, 사용자 지정 |
| 직접 입력·검증 | Must | 300ms debounce와 즉시 검증 버튼 |
| 다음 실행 | Must | 기본 5회, 선택 timezone 기준 |
| Timezone | Must | 브라우저 timezone, UTC, Asia/Seoul |
| Preset | Must | 요구된 10개 preset |
| 자연어·필드 설명 | Must | 확실한 template은 자연어, 그 외는 필드별 의미 중심 |
| 요일 다중 선택 | Must | 일~토 toggle, 0 또는 7 직접 입력은 일요일 |
| 월 선택 | Must | 특정 월 다중 선택을 숫자 목록으로 생성 |
| Copy | Must | Cron과 자연어 설명을 별도 복사 |
| 다음 실행 5/10/20 선택 | Should | 첫 구현에 포함. 기본 5, 최대 20 |
| Vercel Cron 안내 | Should | 짧은 별도 안내만 제공하며 엔진 로직과 분리. 정책 수치는 넣지 않음 |
| crontab 전체 줄 | Could | command quoting·`%` 규칙까지 필요하므로 별도 승인 |
| GitHub Actions 안내 | Could | 플랫폼 문서 변경 가능성이 있어 별도 콘텐츠 |
| 월·요일 영문 이름 | Could | 숫자 기반 안정화 후 검토 |
| 6필드·Quartz·Spring·AWS | Do Not Build | 다른 dialect를 같은 입력창에서 혼합하지 않음 |
| 자연어 → Cron 자유 입력 | Do Not Build | 추론 오류 위험. 구조화된 생성기만 제공 |
| 실행 스케줄 등록 | Do Not Build | 이 도구는 표현식 생성·검증만 수행 |

## 5. 생성기 계약

### 모드와 입력

| 모드 | 필수 입력 | 생성 규칙 예시 |
|---|---|---|
| 매분 | 없음 | `* * * * *` |
| 매 N분 | N: 1~59 | `*/10 * * * *` |
| 매시간 | minute 0~59 | `0 * * * *` |
| 매 N시간 | N: 1~23, minute | `0 */2 * * *` |
| 매일 | hour 0~23, minute 0~59 | `30 9 * * *` |
| 매주 | 요일 1개 이상, hour, minute | `0 8 * * 1` |
| 매월 | 날짜 1~31, hour, minute | `0 0 1 * *` |
| 특정 요일 | 요일 1개 이상, hour, minute | `0 9 * * 1,3,5` |
| 특정 시간 | hour, minute | `30 18 * * *` |
| 특정 날짜 | 날짜 1개 이상, 월 1개 이상, hour, minute | `0 0 1 1 *` |
| 사용자 지정 | 직접 입력 | 생성기 control로 손실 없이 표현할 수 없는 식 |

- 숫자 입력은 빈 값·소수·지수 표기·부호·범위 초과를 거부한다.
- 요일과 월 다중 선택은 숫자 오름차순과 comma로 직렬화한다.
- 선택한 월에 존재하지 않을 수 있는 날짜(예: 2월 31일)는 문법상 허용하되 “일부 월에는 실행되지 않을 수 있음”을 경고한다. 다음 실행 계산 실패 시 유효하다고 가장하지 않는다.
- 설정 변경은 즉시 Cron 입력을 갱신하고 검증·설명·다음 실행 계산을 다시 수행한다.

### Preset

| 이름 | 표현식 |
|---|---|
| 매분 | `* * * * *` |
| 5분마다 | `*/5 * * * *` |
| 10분마다 | `*/10 * * * *` |
| 30분마다 | `*/30 * * * *` |
| 매시간 | `0 * * * *` |
| 매일 자정 | `0 0 * * *` |
| 매일 오전 9시 | `0 9 * * *` |
| 매주 월요일 오전 9시 | `0 9 * * 1` |
| 매월 1일 자정 | `0 0 1 * *` |
| 평일 오전 9시 | `0 9 * * 1-5` |

Preset 선택은 직접 입력을 즉시 교체하는 명시적 사용자 동작이다.

## 6. 직접 입력과 검증 계약

- 입력 최대 길이 1,000 UTF-16 code units. 선행·후행 whitespace는 검증 시 제거하고 원본 입력 자체는 사용자가 편집하는 동안 보존한다.
- 빈 입력은 초기 상태이며 빨간 오류로 표시하지 않는다. 설명·필드·다음 실행을 비운다.
- 비어 있지 않으면 정확히 5필드여야 한다. 부족·초과는 “5개의 필드가 필요합니다”로 표시한다.
- 각 필드는 comma item으로 나눈 뒤 `*`, 정수, `start-end`, `*/step`, `start-end/step`만 허용한다.
- comma의 빈 item, 중복 연산자, 역방향 range, 0 이하 step, 해당 range보다 큰 step, 필드 범위 초과를 거부한다.
- 정수는 ASCII digits만 허용한다. 음수, 소수, 지수, hexadecimal, Unicode 숫자는 거부한다.
- 오류는 `필드명 + 허용 범위/문법 + 문제 token`을 사용자 문구로 보여 주고 라이브러리 exception 원문을 그대로 노출하지 않는다.
- 자체 검증 통과 후에만 Croner로 parse·next-run을 계산한다. 예상 가능한 오류는 console에 기록하지 않는다.

### 역동기화

검증된 정규화 표현식을 다음 우선순위로 인식한다.

1. 정확한 Preset.
2. `* * * * *`, `*/N * * * *`, `M * * * *`, `M */N * * *`, `M H * * *`.
3. `M H * * DOW` → 매주/특정 요일.
4. `M H DOM * *` → 매월.
5. `M H DOM MONTH *` → 특정 날짜.
6. 그 외 → 사용자 지정.

역동기화는 표현식의 의미를 바꾸지 않는다. range를 임의로 list로 풀거나 `7`을 `0`으로 바꾸지 않는다. 생성기에서 사용자가 다시 조작한 시점부터 정규화된 생성기 출력으로 전환한다.

## 7. 자연어와 필드별 설명

- locale별 deterministic template을 직접 관리한다. 자유 문장 생성이나 외부 번역 API를 사용하지 않는다.
- 다음 canonical 형태는 전용 자연어를 제공한다: 매분, `*/N`분, 매시간, 매 N시간, 매일 특정 시각, 매주 단일·복수 요일, 평일, 매월 특정 날짜, 특정 월·날짜, DOM list.
- 시간 표현은 locale에 맞추되 24시간 값을 보존한다. 애매한 오전/오후 경계(0시·12시)를 테스트한다.
- 복잡한 range+step 등 전용 template이 없는 식은 “사용자 지정 일정”이라고 표시하고 다섯 필드의 해석을 함께 제공한다. 정확하지 않은 요약을 만들지 않는다.
- DOM과 DOW가 모두 제한되면 자연어에 “둘 중 하나가 일치할 때(OR)”를 명시한다.
- 필드 카드 순서는 Minute, Hour, Day of Month, Month, Day of Week이며 원본 token과 확실한 의미를 함께 표시한다.

## 8. Architect 결정

### 8.1 라이브러리 선택

`croner` 안정 버전 `10.0.1`을 exact pin으로 production dependency에 추가한다. 실제 구현 시 설치 전 lockfile과 npm 배포 정보를 다시 확인하며, major/minor 자동 갱신은 하지 않는다.

| 후보 | 브라우저·TS | timezone·next N | 크기·의존성 | 라이선스·상태 | 결정 |
|---|---|---|---|---|---|
| Croner 10.0.1 | Browser ESM, 내장 typings | 지원, `nextRuns` | 공식 비교 기준 minified 약 22.7KB/minzip 6.8KB, 의존성 0 | MIT, 2026년에도 release 활동 확인 | 선택 |
| cron-parser 5.x | TypeScript, browser bundling은 별도 검증 필요 | `tz`, iterator 지원 | Luxon 기반이라 본 기능에는 상대적으로 큼 | MIT, 활발한 유지보수 | 대안 |
| 직접 구현 | 가능 | IANA timezone·DST 탐색을 모두 직접 구현 | dependency 0이나 검증 비용 큼 | 내부 책임 | 제외 |

Croner가 더 넓은 문법을 지원하는 것은 제품 지원 범위를 넓히는 근거가 아니다. 자체 validator가 5필드 숫자형 subset을 강제한다.

### 8.2 다음 실행 계산

- `new Cron(expression, { timezone, paused: true })` 형태로 timer를 실행하지 않는 parse-only 객체를 만들고 `nextRuns(count, referenceDate)`를 사용한다.
- 반환 Date는 absolute instant로 보관하고, 표시할 때 선택 timezone을 지정한 `Intl.DateTimeFormat`으로 변환한다.
- 기본 5회, 선택 5/10/20회, 최대 20회다.
- 테스트는 `referenceDate`를 필수 주입해 시스템 현재 시각과 분리한다.
- 가능한 다음 실행을 라이브러리가 찾지 못하면 사용자 오류로 변환하고 무한 탐색하지 않는다.

### 8.3 Timezone

- UI option: `브라우저 시간대`, `UTC`, `Asia/Seoul`.
- 브라우저 시간대 값은 `Intl.DateTimeFormat().resolvedOptions().timeZone`에서 얻고 실제 IANA ID를 함께 표시한다. 얻지 못하면 UTC로 fallback하고 안내한다.
- 지원 여부는 `Intl.DateTimeFormat(..., {timeZone})`으로 검증한다.
- 선택 timezone은 설명과 다음 실행 모두에 동일하게 전달한다.
- 실제 서버·서비스 timezone과 다를 수 있으며 Cron 식 자체에는 timezone이 없다는 경고를 결과 근처에 고정 표시한다.
- DST 검증용 `America/New_York`은 자동 테스트에만 사용하고 첫 UI option에는 넣지 않는다.

### 8.4 DOM/DOW 규칙과 요일 0/7

- Croner의 기본 `domAndDow: false`, 즉 DOM OR DOW를 사용한다. `+`나 AND option은 노출하지 않는다.
- 둘 다 제한된 식은 유효하지만 고가시성 warning을 표시한다.
- `0`과 `7`은 모두 Sunday로 match되어야 한다. 직접 입력의 원형 token은 보존하며, 생성기 Sunday 출력은 canonical `0`을 사용한다.

### 8.5 5필드 호환성 경계

- 제품 validator가 필드 수와 subset 문법을 먼저 검사하므로 Croner의 optional seconds·year·alias·확장자는 입력될 수 없다.
- 이 도구는 “모든 Cron 구현과 동일”을 주장하지 않고 “Unix/Vixie-style 5-field subset”으로 표기한다.
- 플랫폼별 scheduler 제한, 최소 간격, timezone 정책은 이 엔진의 유효성 결과에 섞지 않는다.

### 8.6 양방향 상태 모델

- 단일 source of truth는 Cron expression string이다.
- 생성기 action은 설정을 serialize해 expression을 갱신한다.
- 직접 입력은 parse 결과를 discriminated union `{valid, normalized, fields, generatorMode, warnings}`로 만든다.
- 인식 가능한 형태만 generator state를 채우며, 나머지는 `custom`으로 표시한다.
- parse·serialize·describe·next-runs는 `lib/tools/cron-expression-generator/`의 순수 함수로 분리하고 UI 문구는 messages에 둔다.

### 8.7 프로젝트 구조와 충돌 검토

```text
app/[locale]/tools/cron-expression-generator/page.tsx
components/tools/cron-expression-generator/cron-expression-generator.tsx
lib/tools/cron-expression-generator/{validate,generate,describe,next-runs}.ts
messages/{ko,en,ja}.json
tests/cron-expression-generator-browser.mjs
```

- 기존 Next.js App Router, TypeScript, Tailwind, next-intl, 독립 URL 규칙과 충돌 없음.
- 계산은 Client Component 경계 안에서 수행하고 route page는 metadata를 제공하는 Server Component로 유지한다.
- Worker는 필요 없다. 최대 20회 계산은 가볍고 입력 한도가 작다.
- 신규 server route, external API, storage는 만들지 않는다.
- 새 production dependency 하나가 필요하지만 zero-dependency·소형·브라우저 지원이라는 아키텍처 기준을 충족한다.

## 9. UI/UX 계약

위에서 아래 순서는 다음과 같다.

1. 제목과 5필드 Unix Cron 범위 안내.
2. 생성기/직접 입력을 같은 화면에서 전환하는 tab 또는 segmented control.
3. Preset.
4. 생성기 control 또는 Cron input.
5. 읽기 전용 결과 expression과 Copy.
6. validation status, 자연어 설명, DOM/DOW warning.
7. Timezone 선택과 실제 적용 timezone, 다음 실행 5/10/20회.
8. 필드별 설명.
9. Quick Reference, 예제, timezone·Vercel 주의사항.

- 현재 모드, timezone, 유효/오류 상태를 색상만으로 전달하지 않는다.
- 모든 input/select/toggle에 visible label을 둔다. 요일·월 toggle은 native button과 `aria-pressed`를 사용한다.
- 오류는 `role="alert"`, 검증·복사 상태는 적절한 live region으로 알린다.
- 긴 expression과 locale 문장은 `overflow-wrap:anywhere` 또는 수평 스크롤 가능한 code 영역으로 제한하고 페이지 가로 overflow를 만들지 않는다.
- 초기화는 `* * * * *`, 생성기 매분, 브라우저 timezone, 다음 5회로 되돌리고 복사 상태를 지운다.

## 10. 개인정보·성능·SEO

- expression, 설정, timezone 선택은 메모리에서만 유지한다. local/sessionStorage, cookie, history/query/hash에 기록하지 않는다.
- 외부 API와 telemetry로 입력을 보내지 않는다.
- 사용자 입력을 HTML로 삽입하지 않는다.
- 다음 실행은 최대 20회이고 300ms debounce한다. 같은 expression/timezone/count 결과는 필요 시 component lifetime 안에서만 memoize한다.
- metadata와 본문에서 크론 표현식, Cron 생성기·해석·사용법, Linux Cron, crontab, 5분마다·매시간·매일·매주·매월 검색 의도를 자연스럽게 다룬다. keyword stuffing은 하지 않는다.
- 홈 카드, 개발자 도구 메뉴, sitemap, canonical과 ko/en/ja hreflang을 추가한다.

## 11. QA 필수 테스트

### Parser·validator

다음을 각각 parse, field token, validity, natural description, next run까지 검증한다.

1. `* * * * *`
2. `*/5 * * * *`
3. `0 * * * *`
4. `0 9 * * *`
5. `30 18 * * *`
6. `0 9 * * 1`
7. `0 9 * * 1-5`
8. `0 0 1 * *`
9. `0 0 1 1 *`
10. `0 9 1,15 * *`
11. `0 9 * 1,6,12 *`
12. `*/10 9-18 * * 1-5`
13. `60 * * * *` minute 오류
14. `0 24 * * *` hour 오류
15. `0 0 32 * *` DOM 오류
16. `0 0 1 13 *` month 오류
17. `0 0 * * 8` DOW 오류
18. `0 9 * *` 필드 부족
19. `0 9 * * * extra` 필드 초과
20. 빈 문자열은 neutral
21. 여러 공백은 `0 9 * * *`로 정규화
22. DOW `0`과 `7`이 같은 Sunday 실행
23. `1-10/2`와 `*/10` step
24. 역방향 range, step 0, empty comma token 오류
25. `?`, `L`, `W`, `#`, `H`, `+`, 이름, macro, 6필드 거부
26. DOM+DOW `0 9 1 * 1`의 OR 실행과 warning

### 결정적 시간대 테스트

- 기준 instant를 고정한다. 시스템 clock을 직접 읽는 함수는 test subject 안에 숨기지 않는다.
- `2026-08-28T23:00:00Z`(Asia/Seoul 2026-08-29 08:00)에서 `0 9 * * *`의 다음 실행은 `2026-08-29 09:00 Asia/Seoul`이다.
- 같은 기준 instant·식에서 UTC 결과와 Asia/Seoul 결과가 다르다.
- `America/New_York` DST 시작·종료 경계에서 결과가 유효한 instant이고 중복·존재하지 않는 local time을 라이브러리 정책대로 처리하는지 고정 fixture로 검증한다.
- next count 5/10/20과 최대 제한을 검증한다.

### 생성기·양방향

- 요구된 10개 Preset이 정확한 표현식을 만든다.
- 매 N분·매 N시간 경계, 날짜·월·요일 다중 선택을 검증한다.
- `매주 월요일 09:00 → 0 9 * * 1 → parse → 매주 월요일 09:00` 의미가 같다.
- 복잡한 `*/10 9-18 * * 1-5`는 원문을 유지하고 `custom`으로 전환한다.
- 직접 입력 → preset → 직접 수정 → 초기화에서 stale 설명·시간이 남지 않는다.

### 브라우저·접근성·통합

- 실제 Chrome에서 생성, 직접 입력, 오류 복구, timezone 전환, next runs, Cron/설명 Copy, 초기화를 실행한다.
- viewport 320, 375, 768, 1440px에서 가로 overflow·잘린 버튼·겹침 0.
- ko/en/ja 직접 URL, 새로고침, 홈·메뉴 이동을 검증한다.
- keyboard만으로 mode, preset, 시간, 요일, 월, timezone, Copy를 조작한다.
- label, `aria-pressed`, alert/live 상태를 자동 점검하고 실제 screen reader 청취는 수동 항목으로 기록한다.
- Console Error 0, page error 0, hydration error 0, 사용자 expression을 포함한 외부 요청 0, storage 기록 0.
- lint, type-check, 전체 unit/component test, production build, menu/SEO browser regression을 실행한다.

## 12. Critic 필수 질문

Critic은 결과를 보기 전에 최소 다음 14개를 질문으로 확정하고 답과 증거를 기록한다.

1. Cron을 모르는 사용자가 “매일 오전 9시”를 쉽게 만들 수 있는가?
2. Cron을 아는 개발자가 표현식을 바로 입력할 수 있는가?
3. 다섯 필드와 각 범위를 즉시 확인할 수 있는가?
4. 생성기와 직접 입력의 전환이 값 손실을 일으키지 않는가?
5. Preset 적용 후 직접 수정하기 쉬운가?
6. 오류 필드·token·해결 방법이 구체적인가?
7. 자연어가 복잡한 식을 잘못 단순화하지 않는가?
8. DOM/DOW OR 의미가 오해되지 않는가?
9. timezone은 표현식 자체가 아니라 미리보기 기준임이 분명한가?
10. 다음 실행 시간이 선택 timezone과 일치하는가?
11. Sunday 0/7이 동일하게 처리되는가?
12. 모바일에서 요일·월 선택과 긴 결과가 사용 가능한가?
13. 키보드·스크린리더가 상태와 control을 이해할 수 있는가?
14. 입력이 외부로 전송·저장되지 않는가?

## 13. 완료 게이트

다음이 모두 충족될 때만 Product Owner가 `DONE`을 기록한다.

- Critic 평가 90/100 이상
- Critical Issue 0, High Issue 0
- TypeScript 오류 0, lint 오류·경고 0
- 필수 테스트 fail·skip·todo 0
- 5필드 생성·parse·validation·자연어·preset·양방향 동기화 PASS
- 고정 기준 시각의 Asia/Seoul·UTC와 DST timezone 계산 PASS
- Console Error·page error·hydration error 0
- 320/375/768/1440px 모바일·반응형 PASS
- ko/en/ja, 메뉴, sitemap, metadata 회귀 PASS
- 사용자 입력 외부 전송·저장 0
- 개선 반복 최대 5회

5회 재검증 후에도 하나라도 충족하지 못하면 강제로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 기록한다.

## 14. Architect 검토 결론

- 결과: `APPROVED FOR BUILD`
- 기존 폴더·라우팅·다국어·SEO 구조와 충돌 없음.
- 신규 서버와 Worker는 불필요하다.
- 구현 시 허용되는 신규 production dependency는 exact pin의 `croner@10.0.1` 하나다.
- 가장 큰 위험은 라이브러리의 확장 문법이 제품 지원 범위로 새는 것, DOM/DOW OR 오해, timezone 표시 불일치다. 자체 validator, 상시 warning, 결정적 timezone test로 차단한다.
- Builder 인계 상태: `COMPLETED`
- 구현 승인: 사용자 승인에 따라 구현 및 품질 게이트 완료.

## 15. 조사 근거

- Croner 공식 저장소: Browser ESM, TypeScript typings, timezone, next/next N, DOM-OR-DOW, zero dependencies, MIT를 확인. <https://github.com/Hexagon/croner>
- Croner npm: 2026-08-29 기준 안정 버전 10.0.1과 브라우저·timezone 지원 확인. <https://www.npmjs.com/package/croner>
- cron-parser 공식 저장소: TypeScript, timezone/DST, 5필드 parse와 iterator를 대안으로 비교. <https://github.com/harrisiirak/cron-parser>

외부 자료의 기능·버전 정보는 구현 직전에 다시 확인한다. 플랫폼별 Vercel Cron 정책은 이 SPEC의 엔진 계약이 아니며 실제 콘텐츠 작성 시 Vercel 공식 문서를 별도 확인한다.
