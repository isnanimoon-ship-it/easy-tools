# 이미지 색상 추출기 / Image Color Picker SPEC

## 문서 상태

- 기능명: 이미지 색상 추출기 / Image Color Picker
- 상태: `DONE`
- 우선순위: 일반 웹 유틸리티 / P0
- Product Owner 승인일: 2026-08-27
- 개선 회차: 2/5
- 예정 URL: `/{locale}/tools/image-color-picker`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현, Critic 평가, QA 및 Optimizer 개선, 재검증 완료
- 최우선 품질 기준: 디자인보다 원본 이미지 좌표와 픽셀 RGBA 추출 정확도를 우선한다.

## 1. 목적과 사용자 가치

사용자가 로컬 이미지를 업로드하고 원하는 지점을 클릭하거나 터치해, 브라우저가 디코딩한 해당 원본 픽셀의 색상을 HEX, RGB(A), HSL(A), HSV(A), CMYK 형식으로 확인하고 복사할 수 있게 한다. 이미지와 추출 결과는 브라우저 메모리 안에서만 처리한다.

이 도구가 말하는 “원본 픽셀”은 파일의 압축 전 원시 바이트나 모니터에 표시된 CSS 색상이 아니라, 브라우저가 EXIF 방향과 내장 색상 프로파일을 적용해 디코딩한 이미지의 지향된 좌표계에서 Canvas sRGB `rgba-unorm8`로 읽은 픽셀이다.

## 2. 대상 사용자

- 이미지에서 정확한 색상 코드를 얻으려는 디자이너·개발자
- 스크린샷, 사진, 제품 이미지의 한 지점을 확인하려는 일반 사용자
- 투명 PNG의 alpha를 포함한 색상값이 필요한 사용자

## 3. 범위와 우선순위

### Must Have — 첫 버전

- 파일 선택을 통한 이미지 업로드
- Drag & Drop 업로드; 파일 선택은 항상 함께 제공
- PNG, JPG/JPEG, WebP 정적 이미지 지원
- MIME·파일 signature·실제 decode의 다단계 파일 검증
- 이미지 미리보기와 이미지 변경
- 클릭 또는 터치 해제 지점의 색상 확정
- 원본 이미지 기준 X/Y 좌표 표시 및 키보드용 좌표 직접 선택
- 선택 지점 marker/crosshair
- 현재 선택 색상의 큰 swatch와 alpha checkerboard
- 다음 색상 문자열을 각각 표시·복사:
  - HEX 또는 HEXA
  - RGB 또는 RGBA
  - HSL 또는 HSLA
  - HSV 또는 HSVA
  - CMYK
- PNG alpha 정확한 처리
- 최근 선택 색상 히스토리 12개, 메모리에서만 유지
- Zoom: Fit, 25%, 50%, 75%, 100%, 150%, 200%, 400%
- 확대 이미지 이동은 preview wrapper의 가로·세로 scroll 사용
- 파일명, 형식, 파일 크기, 지향된 폭·높이 표시
- 초기화: 이미지, Object URL, 결과, marker, 좌표, zoom, history, 오류를 모두 초기화하고 파일 입력으로 focus 복원
- 지원하지 않는 형식, 손상 이미지, 제한 초과, decode 실패, Canvas 읽기 실패의 복구 가능한 오류
- `ko`, `en`, `ja`, 독립 URL, metadata, canonical/hreflang, 홈 카드와 도구 메뉴
- 업로드 이미지의 서버·외부 API·분석 서비스·저장소 전송 0
- 320px 이상 모바일 정상 작동

### Should Have — 기본 스포이드 안정화 후 별도 승인

- Clipboard 이미지 붙여넣기
- pointer 이동 중 임시 색상과 원본 좌표 표시
- 9×9 또는 11×11 픽셀 확대 렌즈와 중앙 crosshair
- 터치 drag 중 확대 렌즈로 위치 조정하고 pointer up에서 확정
- 히스토리만 별도로 지우기
- 주요 색상 6~8개 자동 추출
- 선택 색상의 lighter/original/darker shade palette

### Could Have — 별도 SPEC 필요

- 정적 GIF 첫 프레임만 지원
- 주요 색상 팔레트 PNG 또는 JSON 다운로드
- CSS custom properties 생성
- GPL/ASE palette export
- 색상 이름 또는 가장 가까운 CSS named color
- OffscreenCanvas/Worker 기반 주요 색상 분석

### Do Not Build — 첫 버전

- 애니메이션 GIF 프레임 탐색
- SVG 업로드·렌더링
- 이미지 URL로 불러오기
- Drag to Pan
- 외부 이미지·색상 분석 API
- Pantone 또는 유료 색상 DB 유사 매칭
- 이미지·히스토리의 localStorage, sessionStorage, IndexedDB, cookie 저장
- 계정, 클라우드 업로드, 공유 링크

첫 버전은 정확한 단일 픽셀 추출과 변환에 집중한다. Should/Could 항목은 Product Owner 승인 없이 구현하지 않는다.

## 4. Product Owner 결정

| 항목 | 분류 | 결정 이유 |
|---|---|---|
| Drag & Drop | Must | 데스크톱 핵심 업로드 흐름이며 파일 선택도 함께 유지 가능 |
| Clipboard 붙여넣기 | Should | 편리하지만 clipboard permission·여러 item 처리 범위가 추가됨 |
| Zoom | Must | 픽셀 선택 정확도와 QA 완료 조건에 직접 필요 |
| 확대 렌즈 | Should | 유용하지만 pointer/touch overlay 복잡도보다 좌표·sampling 정확도가 먼저 |
| Pixel coordinate | Must | 사용자가 원본 위치를 검증하고 키보드 대안을 제공할 수 있음 |
| 색상 히스토리 | Must | 반복 추출 비교의 핵심 가치. 12개 session-memory로 제한 |
| Dominant Colors | Should | 별도 분석 정확도·성능 기준이 필요하며 스포이드와 독립 기능 |
| Shade Palette | Should | 파생색이며 이미지에서 직접 읽은 값과 혼동 가능 |
| 이미지 정보 | Must | 크기 제한과 원본 좌표계 이해에 필요 |
| PNG Alpha | Must | PNG 지원과 색상 포맷 정확성에 필수 |
| 색상 이름/CSS 이름 | Could | 근사 매칭이며 픽셀 정확도와 무관 |
| Pantone | Do Not Build | 라이선스·외부 DB·정확도 오해 위험 |
| 이미지 URL | Do Not Build | CORS·Canvas taint·privacy·SSRF 유사 UX 문제 |
| palette 다운로드/CSS/ASE/GPL | Could | 추출기 안정화 후 별도 export 기능으로 검토 |

## 5. 지원 파일과 검증

### 허용 형식

| 형식 | MIME | signature | alpha |
|---|---|---|---|
| PNG | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | 지원 |
| JPEG | `image/jpeg` | `FF D8 FF` | 없음, 결과 alpha=255 |
| WebP | `image/webp` | `RIFF` + byte 8~11 `WEBP` | 형식에 따라 지원 |

- 확장자는 표시 정보일 뿐 허용 판단의 근거로 사용하지 않는다.
- MIME allowlist와 파일 첫 12 bytes signature가 모두 일치해야 한다.
- signature가 맞아도 `HTMLImageElement.decode()`와 0보다 큰 지향된 dimensions를 통과해야 한다.
- GIF와 SVG는 MIME·signature 단계에서 첫 버전 지원 제외 오류로 처리한다.
- 파일 input `accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"`는 선택 편의일 뿐 보안 검증을 대신하지 않는다.

### 크기 제한

- 파일 byte 상한: 25 MiB (`25 * 1024 * 1024`)
- 지향된 decoded pixel 상한: 24,000,000 pixels
- 한 변 상한: 12,000 pixels
- 폭·높이·곱셈은 안전한 정수인지 확인하고 `width * height` overflow 가능성을 배제한다.
- decode 뒤 pixel 제한을 넘으면 즉시 이미지 reference와 Object URL을 해제하고 결과를 만들지 않는다.

압축된 이미지의 실제 decode 메모리는 파일 크기보다 훨씬 클 수 있다. 브라우저 decode 전에 모든 압축 폭탄을 완전히 판별할 수 없으므로 byte 제한과 decoded dimension 제한을 함께 사용하되 “어떤 파일에서도 메모리 문제가 절대 없다”고 보장하지 않는다.

## 6. 이미지 lifecycle과 개인정보

1. 선택 또는 drop된 `File`을 검증한다.
2. `URL.createObjectURL(file)`로 동일 origin Blob URL을 만든다.
3. detached `HTMLImageElement`에 연결하고 `decode()`를 기다린다.
4. dimensions 제한을 확인한 뒤 동일 image source를 preview와 1×1 sampler에서 사용한다.
5. 이미지 변경·초기화·unmount에서 사용 중인 이전 Object URL을 정확히 한 번 `URL.revokeObjectURL()`한다.
6. stale decode가 늦게 완료되어 최신 이미지를 덮지 않도록 load generation id를 사용한다.

- `FileReader.readAsDataURL`로 전체 파일을 복제하지 않는다.
- 파일, 파일명, pixel, 색상, 좌표는 네트워크·사이트 서버·analytics·console·URL·브라우저 저장소로 보내거나 기록하지 않는다.
- Object URL은 페이지 origin 안의 임시 reference이며 DOM 밖에 문자열을 보존하지 않는다.
- 이미지 변경 시 이전 history는 초기화한다. 서로 다른 이미지에서 온 색을 한 history로 혼동하지 않는다.

## 7. 핵심 기술 설계 1 — 화면 좌표에서 원본 픽셀 좌표로 변환

preview `<img>`에는 padding·border를 넣지 않고 wrapper에만 장식을 둔다. `object-fit`으로 letterbox를 만들지 않으며, 이미지 element 자체의 실제 content rectangle을 pointer 기준으로 사용한다.

```ts
type PixelCoordinate = { x: number; y: number };

function clientPointToPixel(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  sourceWidth: number,
  sourceHeight: number,
): PixelCoordinate {
  const localX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const localY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const x = Math.min(sourceWidth - 1, Math.floor((localX / rect.width) * sourceWidth));
  const y = Math.min(sourceHeight - 1, Math.floor((localY / rect.height) * sourceHeight));
  return {x, y};
}
```

- `rect`는 event 시점의 `image.getBoundingClientRect()`로 얻는다.
- `rect.width/height > 0`, source dimensions가 양의 정수인지 먼저 검증한다.
- 좌표 원점은 지향된 이미지의 왼쪽 위 `(0,0)`, 오른쪽 아래는 `(width-1,height-1)`이다.
- `floor`를 사용해 한 CSS 좌표가 속한 source pixel cell을 선택하고 우·하단 edge는 마지막 pixel로 clamp한다.
- `offsetX`, CSS zoom state, devicePixelRatio, Canvas transform을 좌표 원천으로 사용하지 않는다.
- wrapper scroll 위치는 viewport 기준 rect에 이미 반영되므로 별도 `scrollLeft/Top`을 더하지 않는다.
- marker 위치는 역변환 `((x + 0.5) / width * 100)%`, `((y + 0.5) / height * 100)%`로 pixel 중심에 둔다.
- browser page zoom과 devicePixelRatio가 바뀌어도 client coordinate와 DOMRect가 같은 CSS pixel 계를 사용하므로 비율 계산은 유지된다.

### 키보드 대안

이미지의 2차원 pointer picking을 키보드로 완전히 복제하기 어렵다. 첫 버전은 X와 Y number input, `해당 좌표 선택` 버튼을 제공한다.

- X 범위: 0~width-1, Y 범위: 0~height-1
- 정수가 아니거나 범위 밖이면 API를 실행하지 않고 field error를 표시한다.
- 성공하면 pointer 선택과 같은 `samplePixel()` 및 history 경로를 사용한다.
- marker와 결과가 갱신되고 status live region이 좌표와 HEX를 알린다.

## 8. 핵심 기술 설계 2 — Zoom과 무관한 정확도

- Zoom은 `<img>`의 표시 width만 변경한다. source object와 sampling 좌표계는 변경하지 않는다.
- 사용자 zoom 비율은 natural oriented dimensions의 25/50/75/100/150/200/400%다.
- `Fit`은 `min(1, availablePreviewWidth / sourceWidth)`로 계산한다. 작은 이미지는 확대하지 않고 100%로 표시한다.
- 초기값: source width가 available preview width보다 크면 Fit, 아니면 100%.
- ResizeObserver로 wrapper 가용 폭이 변하면 Fit 표시 크기만 다시 계산한다. 확정된 `{x,y,rgba}`는 재샘플링하거나 변경하지 않는다.
- `<img>`는 `max-width:none`, `width: sourceWidth * displayScale`, `height:auto`, `image-orientation:from-image`를 사용한다.
- Zoom을 CSS `transform: scale()`로 구현하지 않는다. layout width를 사용해 scroll area와 hit rectangle을 일치시킨다.
- Zoom 변경 후 같은 source `{x,y}`를 keyboard 좌표 입력으로 다시 선택했을 때 RGBA byte와 모든 변환 문자열이 동일해야 한다.

## 9. 핵심 기술 설계 3 — 대형 이미지와 Canvas 메모리

첫 버전은 원본 크기의 Canvas backing store를 만들지 않는다. browser-decoded `HTMLImageElement`를 source로 유지하고, sampling 전용 1×1 Canvas만 사용한다.

```ts
sampler.width = 1;
sampler.height = 1;
const context = sampler.getContext("2d", {
  alpha: true,
  colorSpace: "srgb",
  willReadFrequently: true,
});
context.imageSmoothingEnabled = false;
context.clearRect(0, 0, 1, 1);
context.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
const [r, g, b, a] = context.getImageData(
  0, 0, 1, 1,
  {colorSpace: "srgb", pixelFormat: "rgba-unorm8"},
).data;
```

- source crop과 destination 모두 정확히 1×1이며 integer source 좌표만 전달한다.
- `imageSmoothingEnabled=false`로 보간 의도를 제거한다.
- `willReadFrequently`는 반복 readback에 적합한 context hint로 사용한다.
- 현재 지원 브라우저에서 `getImageData` settings overload가 없으면 기본 sRGB/unorm8 context에서 4-argument 호출로 fallback하고 QA로 동일 기준을 검증한다.
- `getImageData`, `drawImage`, context loss/null은 `pixel-read-failed`로 정규화한다.
- source가 로컬 Blob URL이므로 origin-clean 상태를 유지한다. URL import를 금지해 Canvas taint를 만들지 않는다.
- preview는 `<img>`가 담당하므로 24MP RGBA Canvas를 추가로 복제하지 않는다.
- ImageBitmap·OffscreenCanvas는 첫 버전 필수 의존성이 아니다. HTMLImageElement lifecycle이 EXIF-oriented preview와 sampler source를 일관되게 유지하는 데 더 단순하다.

브라우저는 decoded image 자체의 메모리를 사용하므로 24MP 상한에서도 약 96MiB 이상의 decode memory가 들 수 있다. 앱은 동시에 하나의 source만 유지하고 이미지 교체 시 reference와 Object URL을 즉시 해제한다.

## 10. EXIF 방향과 좌표계

- CSS `image-orientation` 초기값인 `from-image`를 명시한다.
- HTML Standard에 따라 `naturalWidth/naturalHeight`는 metadata orientation 회전이 적용된 지향된 dimensions를 반영한다.
- preview와 Canvas `drawImage(HTMLImageElement, ...)`에 같은 decoded source를 사용한다.
- 좌표와 이미지 정보는 raw JPEG matrix가 아닌 사용자가 화면에서 보는 지향된 이미지 기준이다.
- EXIF orientation 1, 3, 6, 8 fixture로 corner 색상과 dimensions를 검증한다.
- raw EXIF 좌표나 카메라 sensor 좌표로 변환하는 기능은 제공하지 않는다.

## 11. 색상 공간과 alpha 기준

- 출력 기준은 Canvas sRGB, 8-bit unsigned RGBA다.
- ICC/Display P3 이미지는 브라우저가 Canvas sRGB로 변환한 결과를 사용한다.
- HDR, float16, 원본 ICC profile 보존, device-specific color management는 첫 버전 범위 밖이다.
- privacy/fingerprinting 보호를 강하게 설정한 일부 브라우저는 `getImageData()`에 미세한 noise를 넣을 수 있으므로, 해당 환경에서는 파일 원시 decoder와 byte-for-byte 일치를 보장하지 않는다.
- alpha 0 픽셀의 숨겨진 RGB는 decode/premultiplication 과정에서 보존되지 않을 수 있다. 화면 합성에 사용되는 Canvas 반환 RGBA를 정답으로 정의한다.

## 12. 색상 변환과 표시 정밀도

모든 변환은 하나의 순수 모듈에서 `{r,g,b,a}`를 입력받는다. UI에서 수식을 중복 구현하지 않는다.

```text
lib/tools/image-color-picker/color.ts
  rgbaToHex
  rgbaToHsl
  rgbaToHsv
  rgbToCmyk
  formatColorValues
  readableForeground
```

### 공통 반올림

- RGB: 0~255 integer 그대로
- alpha: `a / 255`, 소수 셋째 자리에서 반올림해 최대 3자리, 불필요한 0 제거
- Hue: 0~359 integer, 무채색은 0
- HSL S/L, HSV S/V, CMYK C/M/Y/K: 가장 가까운 integer percent
- `Math.round` 전에 부동소수 오차를 숨기기 위한 임의 epsilon을 넣지 않는다. 알려진 fixture로 경계를 고정한다.
- negative zero는 0으로 정규화한다.

### 표시 문자열

- alpha=255:
  - HEX `#RRGGBB` 대문자
  - `rgb(r, g, b)`
  - `hsl(h, s%, l%)`
  - `hsv(h, s%, v%)`
- alpha<255:
  - HEX `#RRGGBBAA` 대문자
  - `rgba(r, g, b, a)`
  - `hsla(h, s%, l%, a)`
  - `hsva(h, s%, v%, a)`
- CMYK는 CSS 표준 색상 함수가 아니라 정보 표현으로 `cmyk(c%, m%, y%, k%)`를 사용한다. alpha는 별도의 Alpha field로 표시하며 CMYK에 합치지 않는다.
- 검정 RGB(0,0,0)의 CMYK는 `(0%,0%,0%,100%)`로 zero-division 없이 처리한다.

현재 색상 swatch는 투명 checkerboard 위에 색상을 표시하고, 코드는 swatch 바깥 텍스트로도 제공한다. swatch 위에 글자를 겹쳐 대비를 맞추는 복잡성을 만들지 않는다. 필요 시 자동 전경색은 sRGB relative luminance 기준으로 검정/흰색 중 더 높은 대비를 선택하되 코드 외부 표시는 항상 유지한다.

## 13. 색상 선택과 history

- desktop: image pointer up 위치를 즉시 확정한다. pointer down과 up 사이 이동이 8 CSS px를 넘으면 scroll/pan gesture로 보고 확정하지 않는다.
- mobile: 첫 버전은 터치 해제 위치에서 즉시 확정한다. preview wrapper의 기본 한 손가락 scroll을 과도하게 막지 않도록 모든 pointer move에서 `preventDefault()`하지 않는다.
- 이미지의 브라우저 기본 drag는 `draggable=false`와 `dragstart.preventDefault()`로 막는다.
- 선택 결과: `{x,y,rgba,formats}`를 한 snapshot으로 확정한다.
- marker에는 시각적 crosshair와 충분한 대비 테두리를 제공하지만 marker 색만으로 결과를 전달하지 않는다.
- 같은 RGBA가 연속으로 선택되면 history에 추가하지 않고 좌표와 현재 결과만 갱신한다.
- 비연속 중복은 다시 추가할 수 있다.
- 새 항목은 history 앞에 추가하고 12개를 넘으면 가장 오래된 항목을 제거한다.
- history 항목에는 swatch, HEX(A), accessible name을 제공한다. 클릭·Enter/Space로 현재 색상을 복원하되 marker 좌표는 그 history의 원래 좌표가 있으면 함께 복원한다.
- history는 이미지 변경·전체 초기화·새로고침에서 사라진다.

## 14. Zoom과 Pan UI

- select 또는 segmented control로 `Fit, 25, 50, 75, 100, 150, 200, 400%`를 제공한다.
- 현재 scale을 텍스트로 함께 표시한다.
- 확대 시 preview wrapper만 `overflow:auto`; 문서 전체 width는 늘어나지 않는다.
- scrollbars 또는 touch scrolling으로 이동한다. Drag to Pan은 첫 버전에서 구현하지 않는다.
- zoom control은 keyboard로 조작 가능하고 변경을 live region으로 과도하게 반복 안내하지 않는다.
- zoom 변경은 선택 색상, coordinate, history를 변경하지 않는다.

## 15. 업로드·Drop UI

- 초기 화면에 실제 `<input type="file">`과 연결된 명확한 button/label을 제공한다.
- drop zone은 같은 input의 보조 수단이다. keyboard focus와 click으로도 file picker를 열 수 있다.
- `dragenter/dragleave/drop` 상태를 counter 방식으로 관리해 자식 element 이동 시 flicker를 막는다.
- drop에서 여러 파일이면 첫 파일을 조용히 선택하지 않고 `한 번에 이미지 한 개` 오류를 표시한다.
- drop된 non-file item은 무시하거나 지원 형식 오류로 정규화한다.
- 잘못된 파일 뒤에도 기존의 유효한 이미지를 유지할지 여부: 유지한다. 사용자가 명시적으로 초기화하거나 새 이미지 decode가 성공한 시점에만 기존 결과를 교체한다.
- 같은 파일을 다시 선택할 수 있도록 처리 완료 후 file input value를 안전하게 비운다.

## 16. 이미지 정보

decode 성공 후 다음을 표시한다.

- 안전하게 text로 렌더링한 파일명
- 형식: PNG/JPEG/WebP
- 지향된 dimensions: `{width} × {height}px`
- 파일 크기: IEC 기준 B/KiB/MiB, 최대 소수 1자리

- 긴 파일명은 중간 생략 또는 anywhere wrapping으로 카드와 문서 폭을 깨지 않는다.
- file path, lastModified timestamp, EXIF metadata는 표시·저장하지 않는다.

## 17. 오류 계약

```ts
type ImageColorPickerError =
  | "multiple-files"
  | "unsupported-type"
  | "signature-mismatch"
  | "file-too-large"
  | "image-too-large"
  | "decode-failed"
  | "pixel-read-failed"
  | "coordinate-invalid"
  | "clipboard-failed";
```

| 오류 | 처리 |
|---|---|
| multiple-files | 이미지 한 개만 선택하도록 안내, 기존 이미지 유지 |
| unsupported-type/signature-mismatch | PNG/JPEG/WebP 지원 안내, 기존 이미지 유지 |
| file-too-large | 25 MiB 제한 안내, decode 시도 없음 |
| image-too-large | 24MP/12,000px 제한 안내, 새 Object URL 해제, 기존 이미지 유지 |
| decode-failed | 손상 또는 지원 불가 이미지 안내, 새 Object URL 해제 |
| pixel-read-failed | 선택 결과를 변경하지 않고 다른 좌표 또는 이미지 재시도 안내 |
| coordinate-invalid | X/Y 허용 범위 표시, sample 실행 없음 |
| clipboard-failed | 결과를 유지하고 직접 선택 복사 안내 |

- 사용자에게 DOMException, stack, 파일 바이트, 원본 error message를 노출하지 않는다.
- 모든 예상 오류는 unhandled rejection과 Console Error를 만들지 않는다.
- upload/pixel 오류는 `role=alert`, decode/loading/copy success는 적절한 live status로 전달한다.

## 18. Copy

- 각 HEX(A), RGB(A), HSL(A), HSV(A), CMYK row에 독립 복사 버튼을 둔다.
- accessible name은 `HEX 값 복사`처럼 포맷명을 포함한다.
- clipboard에는 화면에 보인 문자열과 byte-for-byte 동일한 값을 쓴다.
- 성공 피드백은 해당 row에 1.5초 표시하고 이전 timer를 정리한다.
- 실패는 결과·history·선택 좌표를 지우지 않는다.
- alpha field가 별도로 있다면 독립 복사 대상이 아니며 RGBA/HSLA/HSVA/HEXA에 포함된다.

## 19. 모바일·반응형

모바일 DOM 순서:

1. upload/drop zone과 privacy 안내
2. 이미지 정보와 zoom
3. scroll 가능한 이미지 preview
4. 좌표 직접 선택
5. 선택 색상 swatch와 좌표
6. 색상 포맷·Copy
7. history
8. 도움말

- desktop에서 preview와 result를 2열로 둘 수 있으나 DOM 순서는 모바일 흐름을 유지한다.
- 320/375px에서 preview wrapper가 container 폭을 넘지 않는다.
- 400% 이미지 폭은 wrapper 내부 scroll만 만들고 문서 가로 overflow는 0이어야 한다.
- copy row는 긴 값과 버튼이 겹치지 않게 좁은 화면에서 세로 또는 wrap 배치한다.
- history swatch는 grid/wrap으로 처리하고 문서 overflow를 만들지 않는다.
- touch target은 최소 44×44px 목표를 사용한다.

## 20. 접근성

- file input에 visible label과 지원 형식·제한 설명을 연결한다.
- drop state는 색상뿐 아니라 문구로 표시한다.
- preview image에는 사용자가 올린 파일명 전체를 alt로 반복하지 않고 기능 중심 alt를 제공한다.
- pointer picking의 한계를 설명하고 X/Y 입력 대안을 같은 영역에 제공한다.
- 모든 copy, zoom, change, reset, history action은 keyboard로 가능해야 한다.
- swatch는 색만 표시하지 않고 HEX(A)와 좌표를 accessible name/visible text로 제공한다.
- marker는 `aria-hidden`; 확정 결과는 live status가 알린다.
- focus ring, error 연결, loading `aria-busy`, 200% zoom을 지원한다.
- swatch checkerboard와 색상값 텍스트가 상태 전달의 유일한 수단이 되지 않도록 label을 함께 둔다.

## 21. 핵심 기술 설계 4 — Dominant Color 후보 비교

첫 버전에는 구현하지 않고 Should Have로 유지한다. 추후 승인 시 원본 sampling 경로와 분리된 분석 adapter를 사용한다.

| 후보 | 장점 | 위험·비용 | 판단 |
|---|---|---|---|
| 단순 histogram | 빠르고 deterministic | JPEG noise·유사색이 순위를 독점 | 제외 |
| K-means | 군집 중심색 품질이 좋을 수 있음 | seed·초기값에 따라 결과 변동, 반복 비용, 빈 cluster 처리 | 첫 선택 아님 |
| Median Cut | deterministic, 구현·테스트 가능, 큰 유사색 묶음 | perceptual distance가 아니며 구현 품질 필요 | **후속 기본 후보** |
| 검증된 quantization library | 빠른 도입과 최적화 가능 | bundle·maintenance·license·worker 호환성 검토 필요 | Median Cut 대비 명확한 이점 있을 때만 |

후속 기본 설계:

- 분석 전용 Canvas에 aspect ratio를 유지해 최대 128×128로 축소한다.
- alpha < 16 pixel은 제외하고 나머지는 alpha로 weight한다.
- median cut을 RGB가 아니라 가능하면 perceptual space 변환 후 적용하는 방안을 실측한다. 첫 후보는 구현 단순성과 deterministic QA를 위해 RGB range 기반 median cut이다.
- 8개 bucket을 만들고 population-weighted 평균색을 구한다.
- 결과 간 RGB distance가 임계값보다 작으면 병합하고 population 순으로 6~8개를 표시한다.
- 동일 fixture는 실행마다 동일 결과와 순서를 내야 한다.
- 분석은 축소 이미지를 사용해도 되지만 pointer sampling은 절대 축소 이미지를 사용하지 않는다.
- 50ms main-thread budget을 넘으면 Worker/OffscreenCanvas 또는 library를 Architect가 재검토한다.

## 22. 구현 구조

```text
app/[locale]/tools/image-color-picker/page.tsx
components/tools/image-color-picker/image-color-picker.tsx
components/tools/image-color-picker/image-color-picker.test.tsx
lib/tools/image-color-picker/color.ts
lib/tools/image-color-picker/color.test.ts
lib/tools/image-color-picker/coordinates.ts
lib/tools/image-color-picker/coordinates.test.ts
lib/tools/image-color-picker/file-validation.ts
lib/tools/image-color-picker/file-validation.test.ts
lib/tools/image-color-picker/pixel-sampler.ts
lib/tools/image-color-picker/pixel-sampler.test.ts
tests/image-color-picker-browser.mjs
tests/fixtures/image-color-picker/*
messages/{ko,en,ja}.json                 # Tools.imageColorPicker
```

- page, metadata, 설명은 Server Component다.
- File, Object URL, image decode, pointer, Canvas, clipboard 상태만 Client Component에 둔다.
- coordinate, conversion, file signature는 DOM과 분리한 순수 함수다.
- v1 production dependency는 추가하지 않는다. Web API와 자체 순수 수식으로 충분하다.
- test fixture는 repository에 생성 결과를 고정하거나 deterministic 생성 script로 만든다. 런타임 제품 bundle에는 포함하지 않는다.
- 기존 `Button`, `Container`, 도구 dropdown을 재사용한다. upload drop zone과 color swatch는 기능 전용 UI로 둔다.

## 23. 수용 기준

1. PNG, JPEG, WebP가 선택과 Drop 모두로 decode되고 preview된다.
2. MIME만 위조되거나 signature가 다른 파일, GIF, SVG, 손상 파일은 decode 결과로 진입하지 않는다.
3. 25 MiB·24MP·12,000px 제한 경계 바로 아래/같음/초과가 정의대로 동작한다.
4. 새 파일 검증 실패 시 기존 유효 이미지와 결과가 유지된다.
5. 4-quadrant fixture의 corner와 boundary pixel이 원본 좌표의 정확한 RGBA를 반환한다.
6. 표시 이미지 600×400, source 2400×1600에서 center click이 `(1200,800)`을 선택한다.
7. Fit, 25, 50, 75, 100, 150, 200, 400%에서 같은 source coordinate가 동일 RGBA와 format 문자열을 반환한다.
8. wrapper scroll, page zoom, DPR 1/2/3에서도 DOMRect 비율 좌표가 정확하다.
9. 우·하단 edge가 source 범위를 넘어가지 않고 마지막 pixel로 clamp된다.
10. EXIF 1/3/6/8에서 화면 corner, 지향된 dimensions, sampled color가 일치한다.
11. alpha 0/1/127/128/254/255 fixture가 Canvas 기준 byte와 HEXA/RGBA/HSLA/HSVA에서 정확하다.
12. red, green, blue, black, white, gray 알려진 값의 HEX/HSL/HSV/CMYK가 정해진 반올림과 일치한다.
13. 각 copy 버튼이 보이는 정확한 문자열을 복사하고 거부 시 결과를 유지한다.
14. history는 최신 우선 12개, 연속 RGBA 중복 제외, 항목 복원, 이미지 변경 시 초기화를 만족한다.
15. pointer click/touch와 X/Y keyboard 선택이 같은 sampler 경로와 결과를 사용한다.
16. 초기화가 resource/timer/state를 정리하고 file input focus를 복원한다.
17. marker와 coordinates가 source pixel 중심과 일치하고 zoom에서 drift하지 않는다.
18. 400%에서도 preview 내부만 scroll되고 document horizontal overflow가 0이다.
19. 320/375/768/1024/1280px와 200% browser zoom에서 핵심 흐름을 완료할 수 있다.
20. `ko/en/ja`, metadata, canonical/hreflang, 홈 카드와 menu entry가 완전하다.
21. upload marker 파일명·pixel data가 network, storage, URL, analytics, console에 나타나지 않는다.
22. 정상·오류·교체·초기화에서 Console Error와 unhandled rejection이 0이다.

## 24. QA 필수 테스트

### 파일 fixture

- PNG, JPEG, WebP 동일 4-quadrant 이미지
- 단색 red `#FF0000`, black `#000000`, white `#FFFFFF`
- alpha gradient PNG 및 fully transparent colored pixel fixture
- 1×1, 작은 세로, 작은 가로, 100×100, 제한 근처 dimensions
- EXIF orientation 1, 3, 6, 8 JPEG
- 지원하지 않는 GIF/SVG/PDF/text
- MIME 위조, 잘못된 signature, truncated/corrupt PNG/JPEG/WebP
- 25 MiB 직전/정확히/초과 file metadata mock
- 24MP/12,000px 경계 dimensions mock과 실제 안전 크기 smoke

### 픽셀 정확도 fixture

100×100 lossless PNG/WebP:

- `(0,0)`~`(49,49)`: `#FF0000FF`
- `(50,0)`~`(99,49)`: `#00FF00FF`
- `(0,50)`~`(49,99)`: `#0000FFFF`
- `(50,50)`~`(99,99)`: `#FFFFFFFF`
- 중앙 경계 `(49,49)`, `(50,49)`, `(49,50)`, `(50,50)`를 별도 검증한다.

CSS 표시 50×50, 100×100, 200×200, Fit container와 scroll된 400%에서 각 quadrant center와 boundary를 선택한다. pointer event 좌표→source 좌표→1×1 sampler→RGBA 전체 경로를 검증한다.

JPEG는 손실 압축 때문에 source 기대값을 `#FF0000` 같은 정확한 encoding 색으로 단정하지 않고, 고정 fixture를 Chrome Canvas로 decode해 승인한 tolerance 또는 golden byte를 사용한다. PNG lossless fixture가 핵심 정확도 gate다.

### 색상 변환 Unit Test

| RGBA | HEX(A) | HSL(A) | HSV(A) | CMYK |
|---|---|---|---|---|
| 255,0,0,255 | `#FF0000` | `hsl(0, 100%, 50%)` | `hsv(0, 100%, 100%)` | `cmyk(0%, 100%, 100%, 0%)` |
| 0,255,0,255 | `#00FF00` | `hsl(120, 100%, 50%)` | `hsv(120, 100%, 100%)` | `cmyk(100%, 0%, 100%, 0%)` |
| 0,0,255,255 | `#0000FF` | `hsl(240, 100%, 50%)` | `hsv(240, 100%, 100%)` | `cmyk(100%, 100%, 0%, 0%)` |
| 0,0,0,255 | `#000000` | `hsl(0, 0%, 0%)` | `hsv(0, 0%, 0%)` | `cmyk(0%, 0%, 0%, 100%)` |
| 255,255,255,255 | `#FFFFFF` | `hsl(0, 0%, 100%)` | `hsv(0, 0%, 100%)` | `cmyk(0%, 0%, 0%, 0%)` |
| 51,37,36,128 | `#33252480` | `hsla(4, 17%, 17%, 0.502)` | `hsva(4, 29%, 20%, 0.502)` | `cmyk(0%, 27%, 29%, 80%)` |

- hue wrap, grayscale, alpha 경계, rounding `.499/.5`, negative zero를 추가한다.

### Component·resource test

- file input click, drag enter/leave counter, single/multiple drop
- same file reselect, valid→invalid 유지, valid→valid 교체
- decode race, reset during decode, unmount during decode
- Object URL create/revoke 정확한 횟수
- Canvas context null, drawImage/getImageData throw
- coordinate number input range와 Enter/button
- copy success/reject/API 없음, timer cleanup
- history 1/12/13, 연속 중복, 비연속 중복, restore/reset
- zoom option과 ResizeObserver Fit, selection immutability

### 실제 Chrome

- 최신 안정 Chrome, production build
- viewport 320×800, 375×812, 768×1024, 1024×768, 1280×900
- DPR 1, 2, 3과 browser zoom 100%, 200%
- mouse click, touch tap, keyboard coordinate selection
- Fit/25/50/75/100/150/200/400%, scroll 후 selection
- PNG/JPEG/WebP upload와 Drop, alpha, EXIF, corrupt/unsupported/large 오류
- copy, change, reset, history, back/forward, locale route, menu 진입
- image·filename·pixel marker가 network/storage/URL/console에 없는지 검사
- document horizontal overflow, clipping, overlap 0
- Console Error, page error, unhandled rejection 0

### 필수 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- `node tests/image-color-picker-browser.mjs`

자동 테스트에는 fail, skip, todo가 없어야 한다.

## 25. 성능 기준

- 5MP 기준 decode 이후 pointer up→result paint p95 50ms 이내
- 24MP 제한 근처에서도 1×1 sample p95 100ms 이내
- zoom 변경은 image 재decode·전체 Canvas redraw를 하지 않는다.
- 10회 연속 이미지 교체 뒤 retained Object URL 1개 이하, detached source의 강한 reference 0을 코드와 browser memory 관찰로 확인한다.
- pointer move preview가 후속 구현되면 `requestAnimationFrame`당 최대 한 번 sampling한다.
- dominant color 후속 분석은 downscale 포함 main thread 50ms 목표; 초과 시 Worker 검토

측정값은 기기 의존성이므로 기준 초과 하나만으로 즉시 Critical로 분류하지 않고 사용자 영향과 반복 재현을 기록한다. 브라우저 tab crash, 수초 freeze, 입력 불능은 High 이상이다.

## 26. 다국어와 SEO

- namespace: `Tools.imageColorPicker`
- locale별 title/description, 모든 upload·format·error·privacy·접근성 문구를 제공한다.
- canonical: `/{locale}/tools/image-color-picker`
- alternates/hreflang: ko/en/ja 및 기존 프로젝트 규칙
- 서버 렌더링 설명에 무료 이미지 색상 추출, 원본 픽셀 좌표, HEX/RGB/HSL/HSV/CMYK, 브라우저 처리 범위를 과장 없이 포함한다.
- `파일을 업로드하지 않음`은 사이트 서버·외부 API로 전송하지 않는다는 의미로 명시하고 browser memory decode까지 하지 않는다는 식으로 오해시키지 않는다.
- `모든 환경에서 원본 파일 byte와 완전히 동일`, `전문 색도계 수준`, `Pantone 정확 매칭` 표현은 금지한다.

## 27. 공식 기술 근거

조사 기준일: 2026-08-27. 구현 착수 시 API 호환성과 브라우저 지원을 다시 확인한다.

- Canvas `getImageData()`와 sRGB/unorm8 settings: `https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData`
- Canvas context `colorSpace`, `willReadFrequently`: `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext`
- Canvas RGBA pixel model: `https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas`
- File Object URL lifecycle: `https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications`
- `HTMLImageElement.decode()`와 natural dimensions: `https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement`
- EXIF orientation과 natural dimensions: `https://html.spec.whatwg.org/multipage/embedded-content.html`
- `image-orientation: from-image`: `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-orientation`
- Canvas drawImage source coordinate semantics: `https://html.spec.whatwg.org/multipage/canvas.html`

## 28. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 90/100 이상
- 통합 issue Critical 0, High 0
- lint, type-check, 전체 test, build, audit PASS
- TypeScript 오류 0
- Console Error와 unhandled rejection 0
- PNG/JPEG/WebP 정상 처리
- lossless 4-quadrant 원본 픽셀 정확도 PASS
- Fit 및 모든 zoom에서 coordinate/RGBA 일관성 PASS
- HEX(A), RGB(A), HSL(A), HSV(A), CMYK 변환 PASS
- alpha·EXIF orientation PASS
- Copy·history·change·reset PASS
- 대형 이미지 제한과 resource cleanup PASS
- 모바일·touch·keyboard 대안·접근성 PASS
- image/pixel/file name의 외부 전송·저장 0
- `ko/en/ja`, SEO, 홈 카드·도구 메뉴 PASS
- 모든 수용 기준에 QA 증거 연결
- 최대 5회 개선 후 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 자신의 결과를 최종 승인하지 않는다. Critic이 최소 10개 질문과 점수·issue를 결정하고 QA가 객관적 증거를 제공한 후 Product Owner만 최종 상태를 기록한다.

## 29. Architect 검토

### 기존 구조와 충돌

- `/{locale}/tools/{slug}`, Server page + 최소 Client Component, `lib/tools/{slug}` 순수 로직, Vitest·Chrome QA 구조와 일치한다.
- slug `image-color-picker`는 기존 route와 충돌하지 않는다.
- upload는 로컬 Blob URL과 browser Canvas만 사용하므로 브라우저 우선·불필요한 서버 금지 원칙을 충족한다.
- 홈 카드와 새 dropdown 도구 메뉴에 한 항목을 추가해도 header 폭은 증가하지 않는다.
- 추가 production library 없이 구현 가능하다.

### 네 가지 필수 설계 판정

1. 화면→원본 좌표: event 시점 DOMRect 비율, oriented natural dimensions, floor+clamp를 사용한다. `offsetX`와 CSS zoom 값을 직접 사용하지 않는다.
2. Zoom 정확도: 표시 width만 바꾸고 항상 source coordinate와 동일 HTMLImageElement의 1×1 crop을 sampling한다. Zoom은 RGBA snapshot을 변경하지 않는다.
3. 대형 이미지: 전체 원본 Canvas를 만들지 않고 1×1 sampler만 사용한다. 25MiB, 24MP, 한 변 12,000px 제한과 단일 source lifecycle을 적용한다.
4. Dominant Color: 첫 버전 제외. 후속 기본 후보는 128×128 downscale + deterministic Median Cut이며, K-means와 library는 성능·품질 근거가 우월할 때 재검토한다.

### 주요 위험과 완화

- CSS scaling 좌표 drift: DOMRect/source ratio unit+browser quadrant test
- 오른쪽·아래 edge out-of-range: floor 후 max index clamp
- EXIF mismatch: 같은 HTMLImageElement source, oriented dimensions, orientation fixtures
- color profile 차이: Canvas sRGB/unorm8을 제품 정답으로 명문화
- 대형 decode memory: byte+pixel+dimension 제한, 전체 Canvas 금지, resource 즉시 해제
- alpha hidden RGB: Canvas 반환값을 기준으로 정의하고 fully transparent fixture 별도 해석
- touch scroll 충돌: 첫 버전 pointer up 즉시 확정, 전역 touchmove 차단 금지
- clipboard 실패: 선택 결과 유지
- stale decode/Object URL leak: generation id와 소유권별 revoke 테스트

### 범위 판정

- Zoom, coordinate, image info, alpha, history는 정확도·핵심 흐름 때문에 Must Have다.
- 확대 렌즈는 Should Have로 보류한다. marker와 좌표 직접 선택이 첫 버전 정확성 및 접근성 대안을 제공한다.
- Dominant Colors와 Shade Palette는 스포이드 PASS 뒤 별도 기능으로 평가한다.
- GIF/SVG/URL import/Pantone은 첫 버전 Do Not Build다.

### Architect 최종 판정

- 구조 충돌: 없음
- 구현 가능성: 있음
- server/API 필요성: 없음
- production dependency 추가: 없음
- privacy 원칙: 완전한 client-only 처리로 충족 가능
- Builder 인계 상태: `DONE` (최종 승인은 Product Owner 완료 기록에서 수행)

## 19. 구현 후 Critic 평가 및 QA 결과

### Critic 사전 품질 질문과 답변

1. 처음 방문한 사용자가 지원 파일과 제한을 바로 이해하는가? — 업로드 영역에 PNG/JPEG/WebP, 25MB, 24MP 제한을 함께 표시한다.
2. 파일 선택과 Drag & Drop이 같은 검증 과정을 거치는가? — 두 진입점 모두 단일 `acceptFiles`/`loadFile` 흐름을 사용한다.
3. 확장자나 MIME만 위조한 파일을 이미지로 오인하지 않는가? — MIME, PNG/JPEG/WebP signature, 실제 decode를 순서대로 검증한다.
4. 오류가 발생해도 직전에 정상적으로 연 이미지와 선택값을 잃지 않는가? — 새 파일 검증이 완료되기 전 기존 Object URL과 상태를 유지하며 Chrome QA로 확인했다.
5. Fit과 25–400% 확대에서 같은 원본 픽셀을 선택하는가? — 화면 좌표를 원본 좌표로 변환하며 400% 실제 Chrome 선택 테스트를 통과했다.
6. 가장자리 좌표와 범위 밖 좌표가 안전하게 처리되는가? — 좌표를 floor/clamp하고 직접 입력은 정수 및 원본 범위를 검증한다.
7. 투명 PNG의 alpha와 색상 문자열이 정확한가? — RGBA를 기준으로 HEXA/RGBA/HSLA/HSVA를 생성하고 단위 테스트로 검증했다.
8. 결과를 필요한 색상 형식별로 쉽게 복사할 수 있는가? — 각 형식에 독립적인 복사 버튼과 성공·실패 피드백을 제공한다.
9. 최근 색상이 과도하게 쌓이거나 같은 값으로 도배되지 않는가? — 연속 동일 RGBA는 중복하지 않고 메모리 내 최근 12개로 제한한다.
10. 320px 모바일에서도 업로드, 좌표 선택, 결과 복사가 가능한가? — 320/375/768/1024/1280px에서 가로 overflow 없이 검증했다.
11. 키보드와 스크린리더 사용자가 주요 기능을 사용할 수 있는가? — 실제 label, 버튼, 입력 좌표 대체 경로, status/alert를 제공한다.
12. 긴 파일명과 큰 이미지가 전체 페이지 레이아웃을 깨뜨리는가? — 파일명은 줄바꿈하고 이미지는 내부 스크롤 영역에 한정한다.
13. 한국어·영어·일본어에서 기능, 오류, 개인정보 안내가 빠지지 않는가? — 동일 키 구조와 각 locale 실제 페이지 로딩을 검증했다.
14. 이미지 내용이 서버, URL, 쿠키 또는 브라우저 저장소에 남는가? — Object URL과 메모리 상태만 사용하며 요청 및 storage 0을 Chrome에서 확인했다.
15. 교체·초기화·페이지 종료 때 이미지 자원이 해제되는가? — Object URL revoke와 비동기 generation 무효화를 적용했다.

### Critic 점수

| 영역 | 점수 | 근거 |
|---|---:|---|
| 핵심 기능·정확성 | 25/25 | 세 형식 검증, 원본 픽셀 좌표, alpha 및 5개 색상 변환 검증 |
| 사용자 경험·정보 구조 | 20/20 | 업로드→미리보기→좌표/결과→기록 흐름과 복구 가능한 오류 |
| 모바일 반응형 | 15/15 | 5개 viewport, overflow 0, 큰 이미지 내부 스크롤 |
| 접근성 | 14/15 | label, keyboard 좌표 대체 경로, status/alert 충족; 실제 보조기기 수동 검증은 미실시 |
| 성능·안정성 | 10/10 | 1×1 canvas sampling, Object URL 정리, 비동기 경합 방지 |
| 다국어 | 5/5 | ko/en/ja 기능·오류 문구 완결 |
| SEO·공유 가능성 | 5/5 | 독립 URL, metadata, canonical, hreflang |
| 개인정보·보안 | 5/5 | 서버 전송·영구 저장 0, signature/decode 검증 |
| 합계 | **99/100** | PASS 기준 90 이상 |

이슈: Critical 0, High 0, Medium 0, Low 1. Low는 실제 스크린리더 제품을 이용한 수동 청취 검증이 자동 QA 범위에 포함되지 않았다는 잔여 검증 항목이며 기능 차단 문제는 아니다.

### QA 및 Optimizer

- 최초 QA: TypeScript와 build는 통과했으나 jsdom의 구형 Blob에 `arrayBuffer()`가 없어 파일 signature 단위 테스트 4건 실패.
- Optimizer 개선 1: 표준 `Blob.arrayBuffer()`를 우선 사용하고 지원되지 않는 환경은 `FileReader`로 읽는 호환 경로를 추가했다.
- Critic + QA 재검증: 99점, Critical 0, High 0, 자동 테스트·브라우저 QA 모두 PASS.
- Optimizer 개선 2: 사용자 승인에 따라 Should Have였던 11×11 픽셀 확대 렌즈를 추가했다. 원본 픽셀을 20배로 확대하고 중앙 픽셀 표시, X/Y 좌표, 화면 가장자리 자동 반전 배치를 제공한다. Canvas crop 방식에서 발견한 가장자리 및 렌더 버퍼 문제를 원본 이미지 직접 확대 방식으로 교체한 뒤 전체 QA를 재통과했다.

최종 증거:

- `npm.cmd run lint`: PASS, warning/error 0
- `npm.cmd run type-check`: PASS, TypeScript 오류 0
- `npm.cmd test`: PASS, 24 files / 232 tests / fail·skip·todo 0
- `npm.cmd run build`: PASS, ko/en/ja 정적 route 생성
- `node tests/image-color-picker-browser.mjs`: PASS, ko/en/ja × 320/375/768/1024/1280px
- 실제 Chrome: PNG/JPEG/WebP 업로드, 정확한 픽셀 선택, 400% 확대, 좌표 오류, 복사, 오류 후 기존 이미지 유지 PASS
- Console Error 0, page error 0, horizontal overflow 0, 이미지 데이터 외부 요청 0, local/session storage 0
- `node tests/tool-menu-browser.mjs`: PASS, 9개 도구 링크와 반응형 메뉴 회귀 없음
- 화면 증거: `artifacts/image-color-picker-375-ko.png`

`docs/EVALUATION.md`의 모든 완료 조건을 만족하므로 Product Owner 최종 상태를 `DONE`으로 기록한다.
- 구현 허가: 사용자 요청 범위 밖이므로 미착수
