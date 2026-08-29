# 이미지 압축기 / Image Compressor SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- 예정 URL: `/{locale}/tools/image-compressor`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P0
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현, Critic 평가, QA, Optimizer 2회 및 재검증 완료
- 구현 상태: 완료

## 1. 목적과 사용자 가치

사용자가 JPEG, PNG 또는 WebP 이미지 한 장을 올리고 브라우저 안에서 용량을 줄인 뒤, 원본과 결과의 크기·용량 차이를 확인하고 결과 파일을 내려받게 한다. 일반 사용자는 품질 값을 직접 조절하거나 100KB, 200KB, 500KB, 1MB 이하 목표를 선택할 수 있다.

핵심 성공은 결과 Blob 생성 자체가 아니라 다음 세 조건이다.

1. 결과가 정상 이미지로 다시 decode된다.
2. 품질 모드에서는 결과가 원본보다 작거나, 더 커진 사실을 명확히 알린다.
3. 목표 용량 모드에서는 가능한 가장 높은 품질로 목표 이하를 달성하거나 달성 불가를 명확히 설명한다.

이미지는 서버·외부 API·분석 도구·브라우저 저장소로 보내거나 저장하지 않는다. 원본 File 객체는 수정하지 않는다.

## 2. 대상 사용자와 대표 작업

- 웹사이트나 문서에 올릴 사진 용량을 줄이려는 일반 사용자
- JPG·PNG·WebP의 파일 크기를 줄이려는 사용자
- 업로드 제한에 맞춰 이미지를 100KB/200KB/500KB/1MB 이하로 만들려는 사용자
- 원본과 결과를 직접 비교하고 내려받으려는 모바일 사용자

대표 흐름은 `업로드 → 원본 확인 → 압축 방식 선택 → 결과 확인 → 다운로드`다.

## 3. 범위와 우선순위

### Must Have

- 단일 JPEG/JPG, PNG, WebP 파일
- 파일 선택과 Drag & Drop
- MIME, signature, 실제 decode, dimensions 검증
- 품질 기준 압축: 10~100, 기본 80, slider와 숫자 표시
- 목표 용량 압축: 100KB/200KB/500KB/1MB preset과 10~10240KB 직접 입력
- 출력 형식: 원본 유지, JPEG, PNG, WebP
- 최대 가로 크기: 원본 유지, 1920, 1600, 1280, 1024, 800px
- 종횡비 유지 및 원본보다 확대 금지
- 원본·결과 미리보기, 파일명·형식·dimensions·byte 크기
- 결과 용량, 감소량, 절감률 또는 증가 안내
- 목표 달성 여부와 실제 사용 품질 표시
- 투명 PNG/WebP의 alpha 유지; JPEG 출력 시 흰 배경 합성 및 사전 경고
- EXIF Orientation이 적용된 정상 방향 출력
- 결과 metadata 제거 안내
- 안전한 파일명으로 다운로드
- 같은 파일 재업로드, 반복 압축, 새 이미지 선택, Clear
- Object URL, ImageBitmap, Canvas 메모리 정리
- `ko`, `en`, `ja`, 독립 URL, metadata, canonical/hreflang, 홈 카드와 메뉴 연결
- 320px 이상 모바일, 키보드, label, live status/error
- 입력 이미지 데이터 네트워크 전송 0

### Should Have — 첫 구현에 포함

- 원본과 결과를 desktop 2열, mobile 세로로 비교
- 400ms debounce 후 품질 설정 재압축
- 목표 preset 선택 시 목표 용량 모드 자동 전환
- PNG의 제한적 압축 효과와 WebP/JPEG 전환 안내
- 목표 달성 불가 시 해상도 축소 제안. 자동 축소는 하지 않음

### Could Have — 별도 승인 필요

- Clipboard 이미지 붙여넣기
- 다중 이미지 일괄 압축 및 ZIP 다운로드
- AVIF 출력
- 사용자 선택 JPEG 배경색
- Before/After drag slider
- EXIF 보존 선택
- Worker/OffscreenCanvas 경로
- 전문 PNG palette quantization

### Do Not Build — 첫 버전

- GIF 및 애니메이션 보존
- SVG
- 이미지 URL 불러오기
- 이미지 회전·자르기·임의 width/height 편집
- 원본보다 큰 해상도로 확대
- 계정, 업로드, 공유 URL, 최근 기록
- 서버 압축, 외부 이미지 API

## 4. Product Owner 결정

| 항목 | 분류 | 결정 |
|---|---|---|
| Drag & Drop | Must | 파일 선택을 항상 병행한다. |
| 다중 압축/ZIP | Could | 단일 이미지 안정화와 독립된 큐·메모리 범위가 필요하다. |
| Clipboard | Could | permission과 여러 clipboard item 범위를 후속 검토한다. |
| 목표 KB 압축 | Must | 일반 사용자의 대표 목적이며 preset과 직접 입력을 제공한다. |
| 최대 가로 제한 | Must | 목표 용량과 대형 이미지 메모리 문제를 해결하는 단순한 축소 방식이다. |
| PNG/JPG → WebP | Must | PNG 사진과 JPG에서 실질적인 용량 감소 선택지를 제공한다. |
| AVIF | Could | Canvas 인코딩 지원이 브라우저별로 일정하지 않아 MVP 출력 계약에서 제외한다. |
| Before/After slider | Could | 두 미리보기만으로 첫 버전 비교 목적을 달성한다. |
| EXIF 보존 선택 | Could | 기본 제거가 개인정보와 단순성에 유리하다. |
| 회전·자르기 | Do Not Build | 별도 이미지 편집기 범위다. |

## 5. 입력 파일 계약과 제한

### 허용 형식

| 형식 | MIME | signature | 입력 alpha | 출력 |
|---|---|---|---|---|
| JPEG/JPG | `image/jpeg` | `FF D8 FF` | 없음 | JPEG/PNG/WebP |
| PNG | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | 가능 | PNG/JPEG/WebP |
| WebP | `image/webp` | `RIFF` + bytes 8~11 `WEBP` | 가능 | WebP/JPEG/PNG |

- 확장자와 input `accept`는 편의 정보일 뿐 허용 근거가 아니다.
- MIME allowlist와 첫 12 byte signature가 모두 맞아야 한다.
- signature가 맞아도 `createImageBitmap(file, {imageOrientation: "from-image"})` decode와 양의 dimensions 검증을 통과해야 한다.
- 손상, decode 실패, 비정상 dimensions는 결과 없이 복구 가능한 오류로 처리한다.

### 자원 제한

- 파일 상한: 25 MiB
- decoded pixel 상한: 24,000,000 pixels
- 한 변 상한: 12,000 pixels
- 출력 canvas pixel 상한도 24,000,000 pixels
- `width`, `height`, `width * height`는 양의 안전한 정수여야 한다.
- 제한 초과 시 압축을 시작하지 않고 더 작은 원본을 선택하도록 안내한다.

24MP RGBA bitmap 하나는 약 96MB이며 decode source, canvas, 결과 preview가 겹치면 훨씬 커질 수 있다. 구현은 원본용 별도 full-resolution canvas를 유지하지 않고 하나의 작업 canvas를 재사용한다.

## 6. Architect 결정 1 — 압축 엔진

### 후보 비교

| 후보 | 장점 | 한계 | 판정 |
|---|---|---|---|
| `createImageBitmap` + `HTMLCanvasElement.toBlob` | 브라우저 내장, 신규 번들·라이선스 없음, JPEG/WebP quality와 PNG 지원, Blob·resize 통제 가능 | encoder 결과가 브라우저별로 다를 수 있고 PNG quality는 무시됨 | **선택** |
| `OffscreenCanvas.convertToBlob` | Worker로 옮길 수 있고 Promise API | 지원·실행 경로가 복잡하고 MVP 단일 파일에 이점이 검증되지 않음 | Could fallback/후속 |
| `browser-image-compression` | 목표 크기, 최대 크기, Worker, 최대 반복, EXIF option 제공 | 라이브러리 정책이 목표 탐색·자동 resize에 개입하고 Worker CDN 기본값 통제가 필요하며 번들 증가 | 미선택 |
| `compressorjs` | 작은 API, orientation·resize·Exif options, Canvas 기반 | 자체적으로도 `toBlob`을 감싸며 목표 KB binary search와 상태 취소를 별도 구현해야 함 | 미선택 |

### 선택 구현

1. 파일을 `createImageBitmap(file, {imageOrientation: "from-image"})`로 decode한다.
2. 선택한 최대 가로 크기에 맞춰 종횡비를 유지한 출력 dimensions를 계산한다.
3. 작업 canvas에 `imageSmoothingEnabled=true`, `imageSmoothingQuality="high"`로 한 번 draw한다.
4. JPEG 출력이면 먼저 canvas를 흰색으로 채운 뒤 bitmap을 draw한다.
5. `canvas.toBlob(type, quality)`을 Promise adapter로 감싼다.
6. 요청 MIME과 실제 `blob.type`이 다르면 브라우저 fallback으로 간주하고 결과를 거부한다.
7. 결과 Blob을 다시 `createImageBitmap`으로 decode해 dimensions와 출력 유효성을 검증한다.

새 production dependency는 추가하지 않는다. Canvas API는 PNG 출력을 보장하지만 JPEG/WebP 지원은 런타임 capability probe로 확인한다. JPEG 또는 WebP encoder가 없는 브라우저에서는 해당 출력 option을 disabled하고 이유를 표시한다.

근거: HTML Canvas 표준과 MDN은 quality가 JPEG·WebP 같은 손실 형식에 적용되고 PNG에는 적용되지 않으며, 지원하지 않는 MIME 요청은 PNG로 fallback될 수 있음을 명시한다.

## 7. Architect 결정 2 — 압축 모드와 목표 탐색

### 품질 모드

- UI 품질 10~100을 encoder quality 0.10~1.00으로 변환한다.
- 기본값은 80이다.
- JPEG/WebP에만 quality가 실질적으로 적용된다.
- PNG 원본 유지/PNG 출력에서는 slider를 disabled하지는 않고 숨기거나 읽기 전용으로 바꾸며 “PNG 출력에는 품질 값이 적용되지 않음”을 명시한다.
- slider/input 변경은 400ms debounce하고, 최신 generation token만 결과를 반영한다.

### 목표 용량 모드

- 목표는 binary bytes로 계산한다: 1KB = 1024 bytes, 1MB = 1024KB.
- JPEG/WebP 출력에 quality 탐색을 적용한다.
- 탐색 범위: quality `0.10`~`1.00`, 최대 10회.
- 각 iteration의 결과 Blob은 즉시 비교하고, 목표 이하인 후보 중 quality가 가장 높은 Blob을 보존한다.
- binary search 종료 조건은 최대 10회 또는 quality interval `< 0.01`이다.
- 최종 선택은 목표 이하인 가장 높은 테스트 quality다. 목표보다 지나치게 작은 첫 결과를 즉시 채택하지 않는다.
- encoder byte 크기가 quality에 완전히 단조롭다고 가정하지 않는다. 탐색 중 생성한 모든 목표 이하 후보를 quality 우선, 같은 quality면 byte가 목표에 가까운 순으로 선택한다.
- stale 요청은 결과를 폐기하며 다음 iteration을 시작하지 않는다. `toBlob` 자체는 취소할 수 없으므로 token 방식으로 UI 반영과 후속 탐색을 중단한다.

### 목표 미달 불가능

- quality 0.10에서도 목표를 넘으면 `target-unreachable`이다.
- PNG 출력은 quality 탐색 대상이 아니며, 현재 dimensions로 한 번 인코딩해 목표 초과면 `target-unreachable`이다.
- 앱은 최대 10회를 넘지 않고 이전 성공 결과가 있더라도 목표 달성으로 표시하지 않는다.
- 사용자가 최대 가로 크기를 더 작게 선택하거나 WebP/JPEG로 변경하도록 제안한다.
- 해상도를 사용자 동의 없이 자동으로 낮추지 않는다.

## 8. Architect 결정 3 — PNG와 투명도

- MVP에서 PNG palette quantizer나 자체 PNG optimizer를 구현하지 않는다.
- PNG → PNG는 Canvas의 무손실 재인코딩과 선택된 해상도 축소만 수행한다.
- PNG quality slider로 손실 압축된다고 표현하지 않는다.
- PNG 결과가 원본보다 크면 성공 배지 대신 “현재 설정에서는 원본보다 파일이 큽니다”를 표시한다.
- 작은 용량이 목적이면 WebP를 우선, alpha가 필요 없으면 JPEG도 제안한다.
- PNG/WebP → WebP/PNG는 alpha를 유지해야 한다. 결과 alpha 보존은 투명 fixture의 pixel alpha로 QA한다.
- alpha 입력을 JPEG로 바꾸면 실행 전에 “투명 영역에 흰색 배경이 적용됩니다”를 텍스트로 표시한다.
- 첫 버전 JPEG 배경은 `#ffffff` 고정이다.

## 9. Architect 결정 4 — Orientation, metadata, 색상

### EXIF Orientation

- `createImageBitmap(file, {imageOrientation: "from-image"})`를 명시하고, 반환 bitmap의 width/height를 지향된 dimensions로 사용한다.
- EXIF Orientation 1, 3, 6, 8과 mirror 2, 4, 5, 7 fixture를 QA한다.
- 브라우저가 option을 거부하면 `HTMLImageElement.decode()` fallback을 사용하되 EXIF fixture의 실제 결과를 통과해야 지원 브라우저로 인정한다.
- 수동 EXIF parser와 회전 행렬을 첫 버전에 중복 구현하지 않는다.

### Metadata

- Canvas 재인코딩 결과에는 원본 EXIF·GPS·카메라·촬영 날짜·ICC metadata 보존을 보장하지 않으며, 기본 동작은 metadata 제거다.
- UI에는 “압축 과정에서 위치·촬영 정보 등 일부 이미지 메타데이터가 제거될 수 있습니다”라고 안내한다.
- metadata 제거를 보안 삭제 도구처럼 보장하지 않는다. QA는 대표 JPEG에서 EXIF marker가 결과에 복사되지 않는지 확인한다.

### 색상 공간

- 첫 버전은 브라우저 기본 `colorSpaceConversion: "default"`와 기본 2D Canvas 색상 처리를 사용한다.
- Display P3/ICC 완전 보존을 약속하지 않고 별도 색상 관리 엔진을 구현하지 않는다.
- 현저한 색 변화 위험을 잔여 제한으로 사용자 도움말과 Architect 기록에 남긴다.

## 10. Architect 결정 5 — Worker와 메모리

### Worker

- MVP는 Web Worker를 사용하지 않는다.
- 이유: `toBlob` 자체가 비동기이며 단일 24MP 제한에서 먼저 실제 성능을 측정해야 하고, Worker/OffscreenCanvas 이중 경로는 orientation·브라우저 fallback·테스트 범위를 크게 늘린다.
- engine 함수는 UI와 분리하고 progress callback, generation token을 받아 후속 Worker adapter로 교체 가능하게 한다.
- 24MP 목표 탐색이 QA 기준 장비에서 2초 이상 메인 스레드 long task 또는 500ms 이상 단일 long task를 반복 발생시키면 `High`가 아니라 구현 전 Architect 재검토 항목으로 Worker를 승격한다. 사용자가 조작할 수 없을 정도의 freeze는 PASS할 수 없다.

### lifecycle

- 원본 preview URL, 결과 preview URL은 각각 하나만 유지한다.
- 새 파일·새 결과·Clear·unmount에서 이전 URL을 revoke한다.
- 사용을 마친 `ImageBitmap.close()`를 호출한다.
- canvas는 한 개를 재사용하고 완료·오류·Clear 후 `width=0`, `height=0`으로 backing store를 해제한다.
- Data URL을 만들지 않고 Blob/Object URL만 사용한다.
- 여러 target iteration Blob 중 최종 후보 이외의 reference를 즉시 버린다.
- stale decode/encode가 최신 파일이나 설정 결과를 덮지 않도록 증가하는 generation id를 사용한다.

## 11. UI와 상태 모델

### 레이아웃

- 초기: H1·설명 → upload drop zone → 개인정보 안내 → 사용법/형식 도움말
- 업로드 후 mobile: upload/change → 원본 정보 → 설정 → processing/error → 원본/결과 preview → 용량 비교 → 다운로드
- desktop: 원본과 결과 preview를 2열로 배치하되 DOM과 focus 순서는 mobile 흐름을 유지한다.
- 긴 파일명은 wrap 또는 ellipsis와 accessible full name을 제공하고 문서 가로 overflow를 만들지 않는다.

### 설정

- 모드 radio: `품질 기준`, `목표 용량`
- 품질 모드: range 10~100, 현재 `%` 숫자 병기
- 목표 모드: 100KB/200KB/500KB/1MB buttons, 직접 KB number input
- 출력 형식 select: 원본 유지/JPEG/PNG/WebP
- 최대 가로 select: 원본 유지/1920/1600/1280/1024/800
- `압축` 버튼을 명시적으로 제공한다. 설정 변경 후에는 400ms debounce 자동 갱신도 하되 processing 중 버튼 label/status가 명확해야 한다.

### 상태

`empty → validating → ready → compressing → success | warning | error`

- 새 파일 선택 즉시 이전 결과를 현재 파일 결과처럼 표시하지 않는다.
- compression 중 이전 다운로드를 disabled한다.
- progress는 목표 모드에서 `최적 품질 찾는 중 · {current}/{max}`처럼 표시하며 정확한 퍼센트인 것처럼 과장하지 않는다.
- Clear는 File input, File/Bitmap/Canvas/URLs, settings, timers, generation, result, warning/error를 초기화하고 파일 선택 control에 focus한다.

## 12. 결과·절감률·다운로드

- 표시: 원본 bytes, 결과 bytes, 감소 bytes, 절감률, 출력 dimensions·MIME·실제 quality.
- 절감률은 `(original - result) / original * 100`이며 소수점 한 자리까지 표시한다.
- 결과가 같으면 `용량 변화 없음`, 더 크면 `원본보다 {size} 커짐`과 원본 사용 권고를 표시한다.
- 더 큰 결과도 포맷 변환 목적일 수 있어 다운로드는 허용하지만 “압축 성공”으로 표시하지 않는다.
- 목표 모드는 `목표 달성` 또는 `목표 미달`을 byte 비교로 결정한다.
- 결과 filename은 원본 basename을 안전하게 정리하고 `-compressed`와 실제 확장자를 붙인다. 예: `photo-compressed.webp`.
- 경로 문자, control 문자, 예약 문자, 끝의 점/공백을 제거하고 basename이 비면 `image-compressed`를 사용한다.
- download Blob URL은 현재 success/warning 결과만 가리켜야 한다.

## 13. 오류 계약

| 코드 | 조건 | 사용자 안내와 복구 |
|---|---|---|
| `unsupported-format` | MIME/signature 미지원·불일치 | JPEG, PNG, WebP 선택 안내 |
| `file-too-large` | 25MiB 초과 | 더 작은 파일 선택 |
| `decode-failed` | 손상·decode 불가 | 다른 이미지 또는 원본 재저장 안내 |
| `invalid-dimensions` | 0/비정수/한 변·pixel 제한 초과 | 더 작은 해상도 선택 |
| `encoder-unsupported` | 요청 MIME과 결과 MIME 불일치 | 지원 형식으로 변경 |
| `encode-failed` | null Blob/Canvas 실패 | 설정 변경 후 재시도 |
| `target-invalid` | 직접 입력 범위·정수 오류 | 10~10240KB 정수 입력 |
| `target-unreachable` | 제한된 품질/PNG에서 목표 초과 | 최대 가로 축소 또는 형식 변경 |
| `download-failed` | URL/anchor/download 실패 | 다시 시도 또는 다른 브라우저 안내 |
| `out-of-memory` | 가능한 범위에서 감지된 allocation/decode 실패 | 더 작은 이미지 선택 |

- 빈 상태는 오류가 아니다.
- 예외 원문, 파일 binary, filename을 console에 기록하지 않는다.
- 예상 오류는 `role=alert`; processing/success는 `role=status` 또는 적절한 live region으로 전달한다.

## 14. 개인정보와 네트워크

- 입력 File/Blob/bitmap/preview/result는 현재 탭 메모리와 브라우저가 관리하는 임시 Blob 저장 영역에서만 처리한다.
- 입력·파일명·결과는 fetch/XHR/form/server action/API route/WebSocket/Beacon/analytics에 전달하지 않는다.
- localStorage, sessionStorage, IndexedDB, cookie, URL query/hash, history에 기록하지 않는다.
- 페이지에 “이미지는 브라우저에서 직접 처리되며 서버에 업로드되지 않습니다”를 표시한다.
- QA는 고유 marker가 네트워크 request URL/body/header, storage, 현재 URL에 나타나지 않는지 확인한다. Next.js 정적 chunk 요청은 허용하지만 이미지 데이터는 포함하지 않아야 한다.

## 15. 접근성·반응형·성능

- drop zone은 실제 file input label을 포함하며 클릭·키보드 파일 선택이 가능하다.
- radio/select/range/number/button에 visible label과 focus ring을 제공한다.
- range의 현재 값, 목표 bytes, processing, 목표 달성/미달, 더 커진 결과를 색상 외 텍스트로 전달한다.
- 경고와 관련 control은 `aria-describedby`로 연결한다.
- 320/375/768/1024/1440px에서 preview 잘림, option overflow, 버튼 겹침, 문서 가로 스크롤 0이어야 한다.
- 이미지는 CSS `max-width:100%; height:auto; object-fit:contain`으로 표시하고 intrinsic dimensions는 결과 검증에 사용한다.
- 2~5MiB, 12MP 이미지는 기본 품질 모드에서 QA 기준 최신 안정 Chrome의 warm run 2초 이내를 목표로 한다.
- 24MP 및 목표 탐색은 10초 이내 완료 또는 취소 가능한 진행 상태를 목표로 하며 tab crash와 장시간 완전 freeze는 허용하지 않는다.
- 성능 수치는 장비 의존 목표이며 기능 정확성 게이트를 대체하지 않는다. 실제 측정값을 QA 기록에 남긴다.

## 16. SEO와 콘텐츠

- H1의 기본 목적은 locale별 “이미지 용량 줄이기” 또는 자연스러운 동의어로 표현한다.
- title/description/본문은 이미지 압축, 사진 용량 줄이기, JPG/PNG/WebP 압축, 100KB/200KB/500KB 목표 기능을 실제 UI와 연결해 설명한다.
- 같은 문장을 키워드만 바꿔 반복하지 않는다.
- 고유 metadata, canonical, `ko/en/ja/x-default` alternates, Open Graph/Twitter metadata를 기존 SEO helper로 제공한다.
- 홈 카드와 Header의 `이미지·미디어` 카테고리에 연결한다.

## 17. 구현 구조

```text
app/[locale]/tools/image-compressor/page.tsx
components/tools/image-compressor/image-compressor.tsx
components/tools/image-compressor/image-compressor.test.tsx
lib/tools/image-compressor/file-validation.ts
lib/tools/image-compressor/compress-image.ts
lib/tools/image-compressor/target-search.ts
lib/tools/image-compressor/format.ts
lib/tools/image-compressor/*.test.ts
tests/image-compressor-browser.mjs
messages/{ko,en,ja}.json
```

- page·metadata·설명은 Server Component다.
- 파일·Canvas·Blob·상태만 Client Component에 둔다.
- validation, dimensions, filename, byte/percentage formatting, target candidate 선택은 React와 분리한 순수 함수다.
- browser encoder는 adapter로 감싸 단위 테스트에서 결정적 fake encoder를 주입한다.
- 홈/다른 도구 초기 번들에 압축 UI 코드를 포함하지 않는다.

## 18. 수용 기준

1. 빈 상태에는 오류·결과가 없고 다운로드가 disabled다.
2. 파일 선택과 Drag & Drop이 동일한 검증·처리 경로를 사용한다.
3. JPEG, PNG, WebP의 MIME·signature·decode가 모두 검증된다.
4. 미지원·손상·25MiB 초과·비정상 dimensions에서 앱과 console이 깨지지 않는다.
5. 품질 20/50/80/100이 JPEG/WebP encoder에 0.2/0.5/0.8/1.0으로 전달된다.
6. PNG 출력은 quality 효과를 주장하지 않고 제한과 변환 대안을 표시한다.
7. 목표 100KB/200KB/500KB/1MB preset이 목표 모드로 전환되고 정확한 binary byte 기준을 사용한다.
8. 목표 탐색은 최대 10회이며 목표 이하 후보 중 테스트한 가장 높은 quality를 선택한다.
9. 달성 불가능한 목표는 10회 이내 종료하고 format/해상도 변경을 제안한다.
10. 최대 가로 선택은 종횡비를 유지하고 원본을 확대하지 않는다.
11. JPEG→JPEG, JPEG→WebP, PNG→PNG, PNG→WebP, WebP→WebP 결과가 정상 decode되고 기대 dimensions를 가진다.
12. PNG/WebP alpha는 alpha 지원 출력에서 유지된다.
13. 투명 입력→JPEG는 흰 배경과 경고가 적용되고 검정으로 변하지 않는다.
14. EXIF orientation 1~8 fixture가 올바른 지향과 dimensions로 출력된다.
15. 결과 metadata는 보존을 약속하지 않으며 제거 가능성을 UI에 안내한다.
16. 결과가 원본보다 작을 때만 양의 절감으로 표시하고, 같거나 클 때 별도 안내한다.
17. 원본/결과 미리보기·용량·dimensions·형식·실제 quality·목표 상태가 서로 일치한다.
18. 다운로드 파일의 bytes/MIME/확장자/안전한 filename과 화면 결과가 일치한다.
19. 설정 연속 변경, 반복 압축, 같은 파일 재업로드, 다른 파일 교체에서 stale 결과가 없다.
20. Clear/unmount/교체 후 URL revoke, bitmap close, timer와 canvas cleanup이 수행된다.
21. 320/375/768/1024/1440px에서 핵심 흐름과 다운로드가 가능하고 overflow·잘림·겹침이 없다.
22. label, keyboard, focus, live status/alert, 색상 외 상태 전달이 충족된다.
23. `ko/en/ja` 기능·문구·metadata·홈/메뉴 연결이 동일하다.
24. 입력 이미지와 식별 가능한 marker가 서버·외부 요청·storage·URL에 나타나지 않는다.
25. 12MP 일반 이미지와 24MP 경계 이미지가 crash 없이 처리되고 시간·long task를 기록한다.
26. 정상·대표 오류 흐름에서 Console Error와 unhandled rejection이 0이다.

## 19. QA 필수 계획

### 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 신규 dependency가 생긴 경우에만 `npm audit --audit-level=high`
- 필수 테스트에 fail, skip, todo가 없어야 한다.

### 파일·변환 매트릭스

1. JPG 사진
2. PNG 사진
3. alpha 0/부분/255가 포함된 투명 PNG
4. WebP 및 alpha WebP
5. 1×1, 16×16의 매우 작은 이미지
6. 4000×3000 이미지
7. 24MP 제한 근처와 초과 이미지
8. 세로 스마트폰 JPEG
9. EXIF Orientation 1~8 fixture
10. 100KB, 200KB, 500KB, 1MB 목표
11. 직접 입력 10KB, 201KB, 10240KB와 0/소수/초과/문자
12. 품질 20, 50, 80, 100
13. JPG→JPG, JPG→WebP, PNG→PNG, PNG→WebP, PNG alpha→JPEG, WebP→JPEG/PNG
14. 미지원 GIF/SVG/text, MIME-signature 불일치, 손상 파일
15. 빈 상태, 다운로드, 반복 압축, 같은 파일 재업로드

### 자동 검증

- 결과 Blob `createImageBitmap` 재decode
- 결과 dimensions와 종횡비
- PNG/WebP alpha sample 보존
- JPEG 흰 배경 pixel
- orientation fixture의 corner color와 dimensions
- target bytes 이하 여부와 최대 quality candidate 선택
- 탐색 횟수 10 이하와 non-monotonic fake encoder 후보 선택
- 절감률·증가 문구·filename·MIME/확장자
- generation race, debounce 399/400ms, URL revoke, bitmap close, canvas cleanup

### 실제 Chrome

- 최신 안정 Chrome, production build
- 320×800, 375×812, 768×1024, 1024×768, 1440×900
- `ko`, `en`, `ja`, 직접 URL/reload/back/forward, 홈 카드·메뉴
- mouse/keyboard Drag & Drop 대체 흐름, slider·radio·select·preset·직접 입력
- download 이벤트의 filename, MIME, byte 크기와 decode
- 2~5MiB/12MP 및 24MP 처리 시간, PerformanceObserver long task
- Console Error, page error, unhandled rejection, horizontal overflow, control overlap 0
- 고유 binary marker와 filename이 request/storage/current URL에 포함되지 않음

## 20. Critic 필수 질문

Critic은 결과를 보기 전에 최소 10개 질문을 작성하고, 다음 질문을 반드시 포함한다.

1. 비개발자가 품질과 절감률의 차이를 이해하는가?
2. 200KB 이하가 목적일 때 목표 모드와 preset을 즉시 찾는가?
3. 원본보다 결과가 커졌을 때 성공으로 오해하지 않는가?
4. PNG의 제한과 WebP/JPEG 대안을 이해하는가?
5. 압축 전후 용량·dimensions·형식 차이가 명확한가?
6. 목표를 달성하면서 테스트된 가장 높은 품질을 선택하는가?
7. 모바일에서 원본과 결과 비교 및 다운로드가 쉬운가?
8. 투명 이미지의 JPEG 변환 결과를 실행 전에 이해하는가?
9. 긴 처리와 달성 불가 상태에서 현재 상황과 복구 방법을 아는가?
10. 이미지가 서버로 전송되지 않는다는 설명과 실제 동작이 일치하는가?
11. 키보드와 보조기술로 모든 설정·상태·다운로드에 접근 가능한가?
12. 같은 파일을 다시 처리하거나 설정을 빠르게 바꿔도 결과를 신뢰할 수 있는가?

## 21. 완료 조건

다음을 모두 만족해야 Product Owner가 `DONE`으로 기록할 수 있다.

- Critic 점수 90/100 이상
- 통합 Critical 0, High 0
- lint, type-check, 전체 자동 테스트, build PASS
- TypeScript 오류 0
- Console Error와 unhandled rejection 0
- JPEG/PNG/WebP 입력·출력 필수 매트릭스 PASS
- 목표 용량 및 100KB/200KB/500KB preset PASS
- 품질 slider, alpha, orientation, 다운로드 PASS
- 모바일 PASS
- 이미지 서버·외부 API·storage 비전송·비저장
- 24MP 경계에서 crash 없음
- 모든 수용 기준에 QA 증거 연결
- 최대 개선 반복 5회

5회차 재검증 후 하나라도 미달이면 억지로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 기록한다. Builder·Architect·Critic·QA·Optimizer는 자신의 결과를 최종 승인하지 않는다.

## 22. Architect 검토 결과

### 기존 구조와의 충돌

- `/{locale}/tools/image-compressor`는 기존 slug와 충돌하지 않는다.
- Server page, 최소 Client boundary, `lib/tools` 순수 로직, ko/en/ja message namespace 구조를 그대로 따른다.
- 이미지 색상 추출기의 검증·Object URL lifecycle 개념은 참고할 수 있지만 압축 engine과 상태는 별도 도구 모듈로 둔다.
- Header `이미지·미디어`, 홈 카드, sitemap의 tool path 목록에 추가가 필요하다. 공통 menu가 10개가 되어도 category 구조는 유지되며 320~1440px를 재검증한다.
- 사이트 서버/API route는 필요하지 않다.

### 확정 기술 결정

1. 압축 엔진: `createImageBitmap` + `HTMLCanvasElement.toBlob`, 신규 runtime dependency 없음
2. 목표 탐색: quality 0.10~1.00 binary search 유사 탐색, 최대 10회, 생성된 후보 중 목표 이하 최고 quality
3. PNG: Canvas 무손실 재인코딩·선택적 축소, quality 효과를 주장하지 않음, WebP/JPEG 대안 제시
4. 메모리: 25MiB/24MP/12,000px 제한, canvas 1개, Data URL 금지, URL revoke·bitmap close·canvas reset
5. Orientation: `createImageBitmap(..., {imageOrientation:"from-image"})`, EXIF 1~8 fixture 필수
6. Worker: MVP 미사용, adapter 경계 유지, 실제 long-task 측정 후 승격
7. 입력 정책: JPEG/PNG/WebP, 25MiB, 24MP, 한 변 12,000px

### 주요 위험과 통제

- 브라우저 encoder 차이: exact byte 결과를 고정하지 않고 목표 이하·decode·dimensions·alpha·후보 선택을 검증한다.
- PNG 감소 한계: UI 설명, 더 커진 결과 경고, WebP/JPEG 제안으로 통제한다.
- EXIF 중복 회전: 수동 rotation을 섞지 않고 orientation 1~8 corner fixture로 검증한다.
- 대형 이미지 OOM/freeze: byte+pixel+dimension 제한, canvas 한 개, 최대 10회, 성능 계측으로 통제한다.
- `toBlob` 비취소: generation token으로 stale 결과와 후속 iteration을 폐기한다.
- WebP MIME fallback: 결과 Blob MIME을 반드시 확인한다.
- 색상 변화: 브라우저 기본 색상 처리 범위로 명시하고 P3 완전 보존을 약속하지 않는다.
- privacy 오해: 기능 요청 중 이미지 data 포함 네트워크 요청 0을 실제 Chrome에서 확인한다.

### 참고 근거

- MDN `HTMLCanvasElement.toBlob`: PNG 기본 지원, JPEG/WebP quality, 미지원 형식의 PNG fallback, Object URL 정리
- MDN `createImageBitmap`: EXIF 기반 `from-image`, resize, color-space option 및 ImageBitmap lifecycle
- WHATWG HTML Canvas/ImageBitmap 표준: quality 적용 범위와 bitmap decode/encode 동작
- `browser-image-compression` 공식 README: Worker, max iteration, max size/dimension, EXIF option 비교
- `compressorjs` 공식 README: Canvas 기반 압축, orientation, metadata, PNG quality 제한 비교

### 판정

- 구조 충돌: 없음
- 서버·외부 API 필요: 없음
- 신규 production dependency: 없음
- 기술적 구현 가능성: 있음
- 성능 위험: 제한과 실제 QA가 필요한 관리 가능한 위험
- Builder 인계 상태: `READY`
- 구현 승인: 이 문서의 별도 사용자 승인 전에는 시작하지 않음
