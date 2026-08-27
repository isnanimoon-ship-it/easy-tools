# QR Code Generator / QR 코드 생성기 SPEC

## 문서 상태

- 기능명: QR Code Generator / QR 코드 생성기
- 상태: `DONE`
- 우선순위: 일곱 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-27
- 개선 회차: 0/5
- 예정 URL: `/{locale}/tools/qr-code-generator`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 설치·로그인·외부 API 없이 텍스트 또는 URL을 스캔 가능한 QR 코드로 만들고 PNG로 저장하고 싶다. 단순히 QR 모양을 그리는 것만으로는 충분하지 않다. Unicode 원문 보존, 오류 복원 수준, Quiet Zone, 출력 크기와 데이터 용량을 함께 통제하고 독립 디코더로 원문 복원 가능성을 검증해야 한다.

## 2. 대상 사용자와 가치

- URL, 안내 문구, 한글·일본어·Emoji가 포함된 텍스트를 QR로 공유하려는 일반 사용자
- 오류 복원 수준과 크기를 선택해 인쇄·화면 표시용 PNG를 만들려는 사용자
- 입력을 서버에 보내거나 기록으로 남기지 않는 도구가 필요한 사용자

한 화면에서 원문을 입력하면 잠시 후 자동으로 QR이 갱신되고, 현재 설정과 입력 유형을 확인한 뒤 안전한 기본 파일명으로 PNG를 저장할 수 있게 한다.

## 3. 범위와 우선순위

### Must Have — 첫 버전

- 일반 텍스트와 URL을 구분 없이 입력하고 입력 원문 그대로 UTF-8 QR 생성
- 한글, 영어, 일본어, 숫자, 특수문자, 여러 줄과 Emoji 지원
- 입력 변경 후 250ms debounce 자동 재생성; 옵션 변경은 즉시 재생성
- 빈 입력은 오류·QR 없이 초기 상태 유지
- QR 미리보기와 현재 출력 크기, 오류 복원 수준, Quiet Zone, 입력 유형 표시
- 출력 크기 128/256/512/1024px, 기본 256px
- 오류 복원 L/M/Q/H, 기본 M과 복원 비율 설명
- Quiet Zone 4/6/8 modules, 기본·최솟값 4 modules
- 고정 전경 검정 `#000000`, 배경 흰색 `#ffffff`
- 용량 초과와 선택 크기에서 module이 지나치게 작아지는 경우의 복구 가능한 오류
- 긴 데이터의 스캔 난이도 경고
- `qr-code.png` PNG 다운로드
- `입력값 복사`로 명확히 표시한 원문 복사와 성공·실패 피드백
- Clear 시 입력·QR·오류·경고를 지우고 옵션을 기본값으로 복원한 뒤 입력 focus
- `ko/en/ja`, 모바일, 독립 URL·SEO, 홈과 공통 메뉴 등록
- 입력 비전송·비저장 개인정보 안내

### Should Have — 후속 SPEC 후보

- SVG 다운로드: 선택 라이브러리가 안정적으로 생성하지만 첫 버전의 필수 PNG·Round Trip 검증 이후 추가한다.
- 전경색·배경색 변경: 기본 라이브러리는 지원하지만 대비·색 순서·투명도 검증이 별도 제품 계약을 요구하므로 첫 버전은 가장 안정적인 검정/흰색으로 고정한다.
- URL 형식 표시 외에 `입력값 복사` 제공은 첫 버전 Must Have로 승격했다. QR 이미지 복사로 오해할 `결과 복사` 문구는 사용하지 않는다.

### Could Have — 현재 제외

- Wi-Fi, 연락처 vCard, 이메일, 전화번호, SMS, 위치 전용 입력 도우미
- QR 스캔 기능

### Do Not Build

- 로고 삽입과 장식 dot/eye 스타일
- 여러 QR 일괄 생성·ZIP 다운로드
- 최근 생성 기록, 즐겨찾기, localStorage·IndexedDB·cookie 저장
- 서버 API, Server Action, proxy, 외부 QR 생성 API, 분석용 입력 로그
- URL 자동 보정·단축·추적 parameter 추가

후속 항목은 승인 없이 구현하지 않고 필요하면 `IDEAS.md`에 기록한다.

## 4. 입력과 자동 생성 상태

- 입력은 항상 보이는 label·설명·예시가 있는 textarea다. 최소 모바일 높이 144px이며 긴 입력은 내부 줄바꿈되어 문서 폭을 늘리지 않는다.
- 입력값은 trim·정규화하지 않는다. 선행·후행 공백, 줄바꿈, Unicode normalization form과 URL 문자열을 사용자가 입력한 그대로 QR에 넣는다.
- 최초 상태와 정확히 빈 문자열 `""`은 QR·오류·경고가 없다. 공백만 있는 입력은 유효한 일반 텍스트이므로 공백 자체를 인코딩한다.
- 입력 변경 시 이전 생성 timer와 진행 중 결과 token을 무효화한다. 250ms 동안 추가 입력이 없으면 현재 snapshot으로 생성한다.
- 크기·오류 복원·Quiet Zone 변경은 debounce 없이 현재 입력으로 즉시 재생성한다. 새 결과가 확정되기 전 이전 QR을 새 설정 결과처럼 표시하지 않고 processing 상태를 알린다.
- 같은 입력·옵션 반복, 빠른 입력 변경과 Clear에서 stale QR·오류가 돌아오면 안 된다.
- URL 판정은 표시용일 뿐 생성 데이터에 영향을 주지 않는다. `http:` 또는 `https:` absolute URL로 URL API parsing에 성공한 값만 `URL`, 나머지는 `텍스트`로 표시한다. `example.com`은 텍스트이며 `https://example.com`으로 바꾸지 않는다.

## 5. QR 생성 규칙

- 생성 엔진은 승인된 `qrcode` 라이브러리를 Client Component에서만 동적 import한다.
- 문자열은 라이브러리의 기본 자동 mode segmentation과 UTF-8 multibyte 처리를 사용한다. `btoa`, 임의 Latin-1 변환, 문자열 손실·replacement는 금지한다.
- version과 mask pattern은 고정하지 않고 라이브러리가 데이터와 오류 복원 수준에 맞춰 선택한다. version 1~40 밖으로 임의 확장하지 않는다.
- 미리보기와 PNG는 동일한 입력 snapshot 및 동일한 options에서 생성한다.
- 예상 가능한 capacity/renderer 오류는 locale 독립 error code로 변환하며 exception 원문·stack을 UI나 console에 노출하지 않는다.

### 데이터 용량

- 실제 수용 가능성은 `qrcode.create(input, {errorCorrectionLevel})`의 성공 여부를 최종 기준으로 한다. 문자 수만으로 임의 잘라내지 않는다.
- QR version 40의 이론적 최대 용량은 mode와 오류 복원 수준에 따라 달라진다. 라이브러리 문서의 Byte mode 기준은 L 2953, M 2331, Q 1663, H 1273 bytes이며 numeric/alphanumeric 자동 segmentation은 더 많이 담을 수 있다.
- 생성기가 capacity overflow를 반환하면 `현재 오류 복원 수준에서는 데이터가 너무 깁니다. 내용을 줄이거나 더 낮은 오류 복원 수준을 선택하세요.`에 해당하는 안내를 표시한다.
- 데이터가 성공하더라도 선택된 출력 크기에서 `(출력 px / (module count + Quiet Zone 양쪽))`의 정수 module 크기가 2px 미만이면 결과·다운로드를 만들지 않고 더 큰 크기를 선택하도록 안내한다. 이는 표준 최대 용량이 아니라 화면·PNG 스캔 안정성을 위한 보수적 제품 기준이라고 도움말에 밝힌다.
- QR version 25 이상 또는 UTF-8 byte length 800 이상은 생성은 허용하되 `데이터가 길어 스캔이 어려울 수 있습니다. 더 큰 크기와 낮은 오류 복원 수준을 고려하세요.` 경고를 텍스트로 표시한다.

## 6. 옵션

### 크기

| 값 | 용도 안내 |
|---:|---|
| 128px | 짧은 데이터의 작은 화면용 |
| 256px | 기본, 일반 공유용 |
| 512px | 긴 데이터·큰 화면·인쇄 보조 |
| 1024px | 큰 이미지·인쇄용 |

- select 또는 동등한 단일 선택 control을 사용한다. 미리보기 canvas의 intrinsic width/height는 선택값과 정확히 같아야 한다.
- 512/1024px도 화면에서는 `max-width: 100%`로 축소 표시하되 다운로드 PNG는 선택한 실제 크기를 유지한다.

### 오류 복원 수준

| 값 | UI 설명 | 라이브러리 option |
|---|---|---|
| L | 낮음 · 손상된 영역 약 7% 복원 | `L` |
| M | 보통 · 약 15% 복원 | `M` |
| Q | 높음 · 약 25% 복원 | `Q` |
| H | 매우 높음 · 약 30% 복원 | `H` |

- 비율은 손상 허용 능력의 근사치이며 데이터 자체의 정확도나 성공률을 보장하는 수치로 표현하지 않는다.
- 높은 수준일수록 손상에는 강하지만 데이터 용량이 줄고 QR이 복잡해질 수 있음을 같은 옵션 영역에서 설명한다.

### Quiet Zone

- 4/6/8 modules를 지원하고 기본값은 4다.
- 4 modules 미만, 0, 음수와 임의 직접 입력은 제공하지 않는다. Quiet Zone은 module 단위임을 표시한다.
- 흰색 Quiet Zone을 포함한 전체 canvas가 선택된 px 크기 안에 렌더되어야 한다.

### 색상

- Product Owner 결정: 첫 버전에는 color picker를 넣지 않는다. 검정 전경·흰 배경을 고정해 핵심 스캔 안정성과 단순한 UI를 우선한다.
- 후속 색상 SPEC은 전경이 배경보다 어두워야 하며, 불투명 색만 허용하고, 보수적 대비 임계값·실제 Round Trip을 함께 정의해야 한다. WCAG 텍스트 대비를 QR 표준이라고 오표현하지 않는다.

## 7. 결과와 미리보기 UI

- 모바일 순서: 입력 → 미리보기/상태 → 간결한 옵션 → 다운로드·입력값 복사 → 도움말·개인정보. Desktop에서는 입력·미리보기를 2열로 둘 수 있지만 DOM/키보드 순서는 모바일 흐름을 유지한다.
- empty 결과 영역에는 생성 전 안내를 제공하고 QR 이미지인 것처럼 빈 box를 노출하지 않는다.
- processing은 `role=status` 또는 live region으로 알리고 control 전체를 불필요하게 잠그지 않는다.
- 성공 결과에는 `QR 코드 미리보기`, `{size} × {size}px`, `오류 복원: {level}`, `Quiet Zone: {margin} modules`, `입력 유형: 텍스트/URL`을 표시한다.
- canvas에는 접근 가능한 이름 또는 바로 인접한 텍스트 설명을 제공한다. QR의 원문 전체를 시각적으로 결과 아래 반복 노출하지 않는다.
- 오류는 `role=alert`와 입력·관련 option의 `aria-describedby`로 연결하고 복구 방법을 포함한다. 색상만으로 warning/error를 구분하지 않는다.

## 8. 다운로드와 입력값 복사

### PNG 다운로드

- 성공한 현재 canvas에서 `canvas.toBlob("image/png")`을 사용한다. null Blob, security error와 object URL/download 실패를 처리한다.
- Blob URL → 임시 anchor → `download="qr-code.png"` → anchor 제거 → URL revoke 순서를 사용한다.
- 파일명에는 입력 텍스트·URL·시간·random 값을 포함하지 않는다.
- 입력·옵션이 바뀌어 재생성 중이면 이전 QR 다운로드를 disabled한다.

### 입력값 복사

- 버튼명은 locale별로 `입력값 복사`와 같은 의미여야 하며 `QR 복사`, `결과 복사`로 표시하지 않는다.
- `navigator.clipboard.writeText(input)`로 현재 입력을 정확히 복사한다. 실패 시 QR과 입력은 유지하고 권한을 확인하도록 안내한다.
- 빈 입력에서는 disabled이며 성공 피드백은 일시적 status로 제공하고 timer를 정리한다.

## 9. 오류 코드와 복구

| 오류 코드 | 조건 | 사용자 안내 의미 |
|---|---|---|
| `empty` | 정확히 빈 문자열 | 오류 표시 없음, QR 없음 |
| `capacity-exceeded` | library version 40에서도 현재 level로 encode 불가 | 내용을 줄이거나 L/M 등 낮은 level 선택 |
| `size-too-small` | 계산된 정수 module px가 2 미만 | 512/1024px 등 더 큰 크기 선택 |
| `generation-failed` | 그 밖의 예상하지 못한 생성/Canvas 실패 | 입력·옵션 확인 후 재시도 |
| `download-failed` | PNG Blob/object URL/download 실패 | 다른 브라우저에서 재시도 안내 |
| `copy-failed` | Clipboard API 없음·거부 | 권한 확인 또는 직접 선택 복사 |

- library 오류 문자열은 분류에만 사용하고 사용자에게 그대로 보여주지 않는다.
- 모든 예상 오류·capacity 실패·clipboard 거부는 Console Error와 unhandled rejection을 만들지 않는다.

## 10. 개인정보·보안·외부 의존성

- 입력과 QR 결과는 메모리에서만 처리한다. 사이트 서버, 외부 API, analytics, 현재 URL query/hash, cookie, local/session storage, IndexedDB에 넣지 않는다.
- 입력을 HTML로 해석하거나 `dangerouslySetInnerHTML`로 렌더하지 않는다. SVG가 후속 도입되면 library output을 임의 DOM 삽입하지 않고 안전한 Blob download 경계를 별도 검토한다.
- 생성 중 네트워크 요청은 0이어야 한다. 동적 import chunk 요청은 기능 코드 로드이며 입력값을 포함하지 않아야 한다.
- Object URL, debounce/copy timer와 비동기 결과 token은 교체·Clear·unmount에서 정리한다.

## 11. 라이브러리 후보 비교와 Architect 결정

조사 기준일은 2026-08-27이다. 버전·배포 크기는 npm registry metadata, 기능·라이선스는 각 공식 README/저장소를 기준으로 했으며 구현 시 lockfile에 정확한 resolved version을 고정한다. `dist.unpackedSize`는 설치 압축 해제 크기이며 실제 client gzip chunk와 같지 않으므로 빌드 후 별도 측정한다.

| 후보 | Browser/TS | 유지보수·크기 참고 | PNG/SVG·L/M/Q/H | Unicode | 라이선스 | 판정 |
|---|---|---|---|---|---|---|
| `qrcode` 1.5.4 | browser Canvas API, Promise API. 자체 type은 없어 `@types/qrcode` 필요 | registry 수정 2025-11-13, unpacked 약 135KB + 의존성. 실제 client chunk 측정 필요 | Canvas/Data URL PNG, SVG string, margin·color·L/M/Q/H | multibyte·Emoji와 자동 mixed segments 명시 | MIT | **선택** |
| `qrcode-generator` 2.0.4 | browser, 내장 `.d.ts`, 0 dependency | registry 수정 2025-08-07, unpacked 약 556KB | SVG tag/Data URL·L/M/Q/H. low-level API 비중이 큼 | UTF-8 예제·구현 제공 | MIT | 기능 가능하지만 출력/크기 이점 부족 |
| `qr-code-styling` 1.9.2 | browser, 내장 types | registry 수정 2025-04-11, unpacked 약 516KB + `qrcode-generator` | PNG/SVG와 다양한 스타일·logo | 기반 생성기 사용 | MIT | 스타일·logo 중심으로 첫 범위에 과함 |

### 선택 이유와 사용 경계

- `qrcode`는 첫 버전에 필요한 Canvas PNG, 네 가지 오류 복원 수준, margin, Unicode와 자동 segmentation을 하나의 검증된 API에서 제공하며 스타일링 전용 기능을 강제하지 않는다.
- production dependency는 `qrcode` 하나, type-check용 dev dependency는 `@types/qrcode`로 제한한다. 브라우저용 import가 `pngjs`, CLI의 `yargs` 같은 Node 전용 코드를 client chunk에 포함하는지 production bundle analyzer 또는 빌드 chunk 크기로 확인한다.
- package의 브라우저 build가 Next.js Client Component에서 Node polyfill 없이 동작하지 않거나 client initial chunk가 gzip 60KB를 초과하면 구현을 강행하지 않고 Architect 재검토로 돌려 `qrcode-generator`의 ESM core를 대안으로 측정한다.
- library는 해당 도구 Client Component에서 동적 import해 다른 도구와 홈 초기 번들에 포함하지 않는다.
- 공식 근거: `https://github.com/soldair/node-qrcode/blob/master/README.md`, `https://github.com/soldair/node-qrcode/blob/master/license`
- 비교 근거: `https://www.npmjs.com/package/qrcode-generator`, `https://github.com/kazuhikoarase/qrcode-generator/blob/master/LICENSE`, `https://github.com/kozakdenys/qr-code-styling/blob/master/README.md`

### Round Trip 디코더

- QA 전용 dev dependency로 `jsqr` 1.4.0을 사용한다. 브라우저 ImageData의 QR을 읽는 독립 디코더이며 built-in types, Apache-2.0이고 제품 runtime bundle에는 import하지 않는다.
- 생성기와 다른 구현으로 원문 복원을 확인해 생성 함수가 성공했다는 사실만 검사하는 자기검증을 피한다.
- 설치 전 lockfile 변화와 `npm audit --audit-level=high`를 확인한다. 디코더 도입이 제품 번들에 포함되면 FAIL이다.

## 12. 구현 구조

```text
app/[locale]/tools/qr-code-generator/page.tsx
components/tools/qr-code-generator/qr-code-generator.tsx
components/tools/qr-code-generator/qr-code-generator.test.tsx
lib/tools/qr-code-generator/qr-code.ts
lib/tools/qr-code-generator/qr-code.test.ts
tests/qr-code-generator-browser.mjs
messages/{ko,en,ja}.json                    # Tools.qrCodeGenerator
```

- page·metadata·도움말은 Server Component, 입력·debounce·Canvas·download·clipboard만 Client Component다.
- QR options, input type 판정, module px와 긴 데이터 경고 판단은 React와 무관한 순수 함수로 둔다.
- library import/Canvas renderer는 adapter 경계로 감싸 capacity·renderer 오류를 locale 독립 결과로 변환하고 테스트에서 주입 가능하게 한다.
- 기존 `Button`, `Container`를 재사용한다. canvas preview와 option panel은 도구 전용이며 공통 gallery를 만들지 않는다.

## 13. 접근성·반응형·성능

- textarea, size, error correction, Quiet Zone은 각각 명시적 label과 도움말을 갖는다. error correction select option에는 `M - 보통 · 약 15%`처럼 의미를 포함한다.
- 모든 동작은 키보드로 가능하고 focus ring을 유지한다. Clear 후 입력 focus, 동적 processing/success/error를 보조기기가 인지한다.
- 320/375/768/1024/1280px에서 canvas 잘림, option overflow, 문서 가로 스크롤, 버튼 잘림·겹침이 0이어야 한다.
- 1024px canvas도 CSS box는 container 이내로 축소하고 intrinsic resolution은 보존한다. 긴 입력은 textarea 밖으로 넘치지 않는다.
- debounce 만료 후 짧은 입력의 QR 생성·미리보기 갱신은 QA 장비에서 100ms 목표다. 1024 PNG Blob 생성은 500ms 목표다. 초과는 측정 근거와 사용자 영향을 평가한다.
- 동적 import 전에는 loading 상태를 제공하고 중복 import·생성 요청을 만들지 않는다.

## 14. SEO와 사용자 안내

- locale별 고유 title·description, canonical과 `ko/en/ja` hreflang을 제공한다.
- H1과 설명에는 무료 QR 생성, 브라우저 처리, PNG 저장을 과장 없이 포함한다.
- 도구 아래에 사용법, 오류 복원·Quiet Zone 설명, 긴 데이터와 실제 스캔 환경 안내, 개인정보 FAQ를 제공한다.
- 카메라·조명·인쇄 품질 등 통제할 수 없는 환경 때문에 `항상 스캔 가능`, `100% 인식`을 보장하지 않는다.

## 15. 수용 기준

1. 초기 상태와 정확히 빈 입력에서 QR·오류가 없고 download/copy가 disabled다.
2. 공백만 있는 값, 선행·후행 공백, 여러 줄을 포함해 입력 원문을 변경·trim하지 않고 인코딩한다.
3. 입력 변경 후 250ms debounce로 자동 생성되며 stale timer/result가 현재 결과를 덮지 않는다.
4. 옵션 변경은 즉시 같은 원문으로 재생성하고 processing 동안 이전 결과를 새 설정으로 표시하지 않는다.
5. Hello World, 한글, 일본어, 숫자·특수문자, Emoji, 여러 줄, URL과 query URL을 생성한다.
6. URL 판정은 표시만 바꾸며 `example.com`과 `https://example.com` 어느 쪽도 정규화하지 않는다.
7. 128/256/512/1024px 성공 결과와 PNG intrinsic 크기가 선택값과 같다.
8. L/M/Q/H가 라이브러리에 정확히 전달되고 UI에 수준·근사 복원 비율·capacity trade-off가 표시된다.
9. Quiet Zone 4/6/8이 정확히 반영되고 4 미만은 UI/API 상태에서 선택할 수 없다.
10. black/white 고정 색과 Quiet Zone을 포함한 QR을 독립 디코더가 원문으로 복원한다.
11. capacity 초과는 앱·console을 깨뜨리지 않고 내용 축소 또는 낮은 level 선택을 안내한다.
12. module당 2px 미만인 size/data 조합은 생성·download하지 않고 더 큰 크기를 안내한다.
13. version 25 이상 또는 UTF-8 800 bytes 이상에서 스캔 난이도 경고가 텍스트로 제공된다.
14. 미리보기에는 현재 size, level, margin, 입력 유형이 있고 canvas는 accessible name/설명과 연결된다.
15. PNG는 현재 QR snapshot과 같은 내용·옵션, 정확한 크기로 `qr-code.png`에 저장된다.
16. `입력값 복사`가 원문을 정확히 복사하고 clipboard 거부를 QR 손실·console error 없이 안내한다.
17. Clear는 timer/result/input/options/feedback을 초기화하고 입력 focus를 복원한다.
18. 빠른 반복 입력, 옵션 연속 변경, 같은 값 반복에서 stale 결과·object URL·timer 누수가 없다.
19. 320/375/768/1024/1280px에서 핵심 흐름 완료, canvas·option·긴 입력 overflow와 잘림·겹침 0, 터치 대상 조작 가능이다.
20. label, keyboard, focus, status/alert, 색상 외 텍스트 상태가 접근성 요구를 만족한다.
21. `ko/en/ja` 번역, metadata, canonical, hreflang, 홈·공통 메뉴가 정확하다.
22. 정상·capacity·size·download·copy 오류에서 Console Error와 unhandled rejection이 0이다.
23. 입력·결과가 서버·외부 API·URL·브라우저 저장소·analytics로 전송·저장되지 않고 생성 중 입력 포함 네트워크 요청이 0이다.
24. `qrcode`는 도구 client chunk에만 있고 Node polyfill 없이 동작하며 실제 추가 gzip chunk가 60KB 이하다.
25. 필수 Round Trip 문자열 모두 원본과 byte-for-byte 동일하게 복원된다.

## 16. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- 필수 테스트에 fail, skip, todo가 없어야 한다.

### 단위·컴포넌트 테스트

- 입력 유형 판정: absolute http/https, `example.com`, 일반 텍스트, malformed URL
- 정확히 빈 값과 공백만 있는 값 구분, 원문 공백·줄바꿈·Unicode 보존
- size 128/256/512/1024, level L/M/Q/H, margin 4/6/8 option mapping
- module px 경계 1/2, long warning version/UTF-8 bytes 경계
- capacity overflow와 예상하지 못한 renderer 오류 분류
- debounce 249/250ms, 빠른 연속 변경, option 즉시 재생성, stale result, Clear/unmount timer cleanup
- PNG Blob null/성공/실패, object URL 생성·revoke, 안전 filename
- clipboard 성공·거부·API 없음, copy timer cleanup
- `ko/en/ja` label/message key와 홈·메뉴 연결

### 필수 입력

1. `Hello World`
2. `안녕하세요`
3. `こんにちは`
4. `Hello 😀🚀`
5. `https://example.com`
6. `https://example.com/search?q=hello&sort=new`
7. 여러 줄 텍스트
8. `!@#$%^&*()`
9. 긴 문자열
10. 정확히 빈 문자열
11. 현재 level의 최대 허용 용량 근처와 초과 값
12. L/M/Q/H 각각
13. 128/256/512/1024px 각각
14. option 변경 후 재생성
15. PNG 다운로드와 decode

### Round Trip — 필수

`원본 → qrcode Canvas/PNG 생성 → jsQR decode → 원본`을 다음 값과 L/M/Q/H에서 확인한다.

- `Hello World`
- `안녕하세요`
- `こんにちは`
- `https://example.com`
- `Emoji 😀🚀`

- 최소 256px, margin 4의 기본 조합에서 전부 통과해야 한다. 각 size는 스캔 가능 조건을 충족하는 짧은 문자열로 별도 decode한다.
- 실패를 생성기·디코더 중 어느 쪽 탓이라고 추정해 PASS하지 않는다. 재현 이미지와 options를 남기고 원인을 확인한다.

### 실제 Chrome QA

- production build, 최신 안정 Chrome
- viewport 320×800, 375×812, 768×1024, 1024×768, 1280×900
- `ko`, `en`, `ja`
- 직접 URL, reload, back/forward, 홈 카드·공통 메뉴 진입
- 실제 입력과 option keyboard 조작, 250ms 자동 갱신, processing/status/alert
- canvas intrinsic/CSS size, PNG download filename·MIME·dimensions와 독립 decode
- 긴 입력, warning, capacity, size-too-small, 빠른 연속 변경과 Clear/focus
- 문서 overflow·잘림·겹침 0, 주요 터치 대상 44px 목표
- Console Error, page error, unhandled rejection 0
- 고유 입력 marker가 network request, 현재 URL, cookie, local/session storage, IndexedDB에 포함되지 않는지 확인
- 홈/다른 도구 route에서 QR runtime chunk를 선로드하지 않는지와 production chunk gzip 크기 측정

## 17. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 Critical 0, High 0
- lint, type-check, 전체 자동 테스트, build, audit PASS
- TypeScript 오류 0
- Console Error와 unhandled rejection 0
- 주요 문자열·한글·일본어·Emoji 생성 PASS
- L/M/Q/H, size, Quiet Zone 재생성 PASS
- PNG 다운로드·독립 디코더 Round Trip PASS
- 모바일 PASS
- 입력 데이터 서버·외부 API·브라우저 저장소 비전송·비저장
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.

## 18. Architect 검토

### 기존 구조와의 충돌

- `/{locale}/tools/qr-code-generator`는 기존 slug와 충돌하지 않으며 `Tools.qrCodeGenerator` namespace를 병렬 추가할 수 있다.
- Server Component page와 작은 Client Component 경계, 순수 `lib/tools` 함수, Vitest/Testing Library/실제 Chrome QA 구조를 그대로 따른다.
- Canvas·Clipboard·Blob은 browser-only 경계에 두므로 정적 locale page와 metadata 생성을 방해하지 않는다.
- 홈 카드와 Header에 여섯 번째 이후 항목을 추가하면 desktop locale 문구가 좁아질 수 있다. 기존 `lg` nav에서 1024/1280px의 실제 bounding box 겹침을 QA하고 필요하면 nav breakpoint/표현을 공통 범위에서 조정한다.

### 주요 위험과 통제

- Unicode 손실: library multibyte 경로와 독립 jsQR byte-for-byte Round Trip으로 통제한다.
- 너무 긴 데이터: library capacity 판정, module px 기준, 장문 경고를 서로 다른 상태로 처리한다.
- 자동 생성 경쟁 상태: debounce cleanup과 request token으로 stale 결과를 차단한다.
- 1024px canvas 모바일 overflow·메모리: intrinsic/CSS 크기 분리, 하나의 canvas 재사용과 Blob URL 즉시 정리.
- 낮은 인식률: margin 최소 4, black/white 고정, module 최소 2px, 장문 안내. 실제 카메라 환경을 보장하지 않는다.
- 번들 증가: 도구 전용 dynamic import, 60KB gzip budget, Node polyfill 검사.
- decoder 자기검증: 생성기와 다른 jsQR을 dev/test에서만 사용하고 제품 bundle 포함을 금지한다.

### 의존성·서버 판정

- production 신규 의존성 예정: `qrcode@1.5.4`와 호환 범위가 아니라 구현 시 정확한 version을 lockfile에 기록
- TypeScript dev dependency 예정: 호환되는 `@types/qrcode` 정확한 version 고정
- QA dev dependency 예정: `jsqr@1.4.0` 정확한 version 고정
- 외부 API·사이트 서버·API key·로그인: 없음
- 런타임 외부 요청: 없음
- license: `qrcode` MIT, `jsQR` Apache-2.0; 배포 고지 요구는 설치 후 실제 package license 파일로 재검증

### Architect 판정

- 구조 충돌: 없음
- 기술적 구현 가능성: 있음
- QR 표준 옵션·Unicode: 선택 라이브러리로 지원 가능
- PNG: Must Have로 안정적
- SVG: 기술적으로 가능하나 첫 버전 Should Have로 보류
- 색상: 기술적으로 가능하나 스캔 안정성과 범위 통제를 위해 보류
- Round Trip: 독립 dev-only 디코더로 필수화 가능
- 개인정보 원칙: 완전한 client-only 생성으로 충족 가능
- Builder 인계 상태: `READY`
