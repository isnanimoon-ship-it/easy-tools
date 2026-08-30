# 파비콘 생성기 / Favicon Generator SPEC

## 문서 상태

- 상태: `SPEC 작성 + Architect 검토 완료` — 구현 전 (`APPROVED FOR BUILD`)
- 작성일: 2026-08-30
- URL: `/{locale}/tools/favicon-generator`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P1 신규 도구
- 유일한 구현 기준: 이 문서
- 브리핑: 사용자가 목적·UI·소스 타입 4종·출력 파일·QA 34개·완료 조건까지 이미 상세히 지정했다(§1~§29). 이 문서는 그 브리핑을 프로젝트 SPEC 형식으로 정리하고, §30이 위임한 12개 결정과 그로부터 파생되는 추가 기술 결정을 확정한 것이다. 이 기능은 지금까지 만든 도구들 중 가장 많은 이동 부품(Canvas 렌더링·ICO 컨테이너·ZIP 패키징·crop/zoom 좌표계)을 가지므로, Architect 결정도 그만큼 많다.

## 1. 목적과 성공 정의

사용자가 텍스트·이모지·업로드 이미지·단순 도형 중 하나를 소스로 골라, 브라우저 탭/북마크/iOS 홈화면/Android PWA에 바로 쓸 수 있는 파비콘 파일 세트를 생성한다.

V1의 성공은 다음 흐름을 디자인 툴 없이 완료하는 것으로 정의한다.

`소스 선택 → 옵션 설정 → 실시간 미리보기(7개 크기) → ZIP 다운로드 → <head> HTML 코드 복사`

- 모든 렌더링은 브라우저에서 수행하고, 업로드 이미지는 서버로 전송하지 않는다.
- 결과물은 "바로 사이트에 올리면 끝"이어야 한다 — 파일명·manifest·HTML 코드가 전부 표준 관례를 따른다.
- 복잡한 로고 편집기가 아니라 "간단하지만 바로 쓸 수 있는" 도구로 범위를 제한한다.

## 2. 대상 사용자와 주요 사용 사례

- 사이드 프로젝트/스타트업 초기에 디자이너 없이 파비콘을 빠르게 만들어야 하는 개발자
- 회사 이니셜(예: "AI", "Co")이나 로고 이모지로 임시 파비콘을 만들고 싶은 사용자
- 이미 있는 로고 이미지를 표준 파비콘 세트(ico/png/manifest)로 변환하고 싶은 사용자

## 3. 기능 범위

### Must Have

- 텍스트 / 이모지 / 이미지 업로드 3개 소스
- 배경색 / 글자색 설정
- 실시간 미리보기(16/32/48/64/180/192/512px)
- `favicon.ico`(멀티사이즈) + PNG 세트 + `site.webmanifest` 생성
- `<head>` HTML 코드 생성
- ZIP 다운로드, Reset
- 100% 브라우저 처리

### Should Have

- 도형 소스(사각형/라운드 사각형/원형 + 내부 텍스트)
- 이미지 crop / zoom / pan
- 브라우저 탭·북마크·iOS·Android 모의 미리보기
- 배경/글자 대비 경고
- README.txt, HTML 코드 복사
- theme_color/background_color는 배경색 옵션과 연동(V1은 별도 입력 없이 자동 연동, Could Have에서 분리 입력 추가)

### Could Have (V1 제외)

- 이미지 소스의 원형 마스크·모서리 둥글게(§11 근거로 명시적으로 유보)
- Gradient 배경
- Safari pinned tab(`safari-pinned-tab.svg`), `browserconfig.xml`, `mstile-150x150.png`
- 다크모드용 파비콘, 여러 preset 스타일

### Do Not Build (V1)

- 복잡한 로고 편집기, 벡터 드로잉 툴, AI 로고 생성
- 서버 저장, 계정 기능

## 4. Architect 결정 1 — favicon.ico 멀티사이즈 생성 방식

외부 라이브러리·서버 없이 브라우저에서 직접 만든다. ICO 파일은 Windows Vista 이후 각 엔트리에 **PNG 원본 바이트를 그대로 담는 것**을 표준으로 지원한다("PNG-in-ICO") — 별도의 BMP/DIB 픽셀 인코딩이 전혀 필요 없다. 이미 `canvas.toBlob("image/png")`로 만든 16/32/48px PNG 세 개를 그대로 컨테이너에 담기만 하면 된다.

```
ICONDIR (6 bytes)
  reserved: 0 (2 bytes)
  type: 1 (2 bytes, "icon")
  count: N (2 bytes)

ICONDIRENTRY × N (16 bytes each)
  width: 1 byte (0 = 256)
  height: 1 byte (0 = 256)
  colorCount: 0 (1 byte)
  reserved: 0 (1 byte)
  planes: 1 (2 bytes)
  bitCount: 32 (2 bytes)
  bytesInRes: PNG 바이트 길이 (4 bytes)
  imageOffset: 파일 시작부터의 offset (4 bytes)

이어서 각 PNG 원본 바이트를 그 순서대로 이어붙인다.
```

- 순수 `DataView`/`Uint8Array` 조작만으로 100줄 이내에 구현 가능하고, 표준 형식이라 별도 라이브러리가 필요 없다 — 이 프로젝트의 "불필요한 dependency 지양" 원칙과 정확히 일치한다.
- 포함 크기: 16×16, 32×32, 48×48 (§14의 Must Have PNG 세트와 그대로 겹친다 — ICO용으로 별도 렌더링을 두 번 하지 않고, PNG 렌더 결과를 재사용한다).

## 5. Architect 결정 2 — Canvas 렌더링 구조(소스 4종 공통 파이프라인)

**미리보기와 실제 다운로드 결과가 절대 어긋나지 않도록**, 두 곳에서 동일한 순수 렌더 함수를 공유한다.

```ts
type FaviconSpec =
  | { kind: "text"; text: string; background: string; foreground: string; bold: boolean }
  | { kind: "emoji"; emoji: string; background: string }
  | { kind: "shape"; shape: "square" | "rounded" | "circle"; background: string; border?: { color: string; width: number }; radius: number; content?: { text: string; foreground: string } | { emoji: string } }
  | { kind: "image"; bitmap: ImageBitmap; crop: CropState; background: "transparent" | { color: string } };

function renderFavicon(ctx: CanvasRenderingContext2D, spec: FaviconSpec, sizePx: number): void;
```

- **각 목표 크기는 독립적으로 다시 그린다.** 512px 캔버스를 미리 만들어 16px로 축소(다운스케일)하지 않는다 — 다운스케일은 얇은 선·작은 글자를 뭉개서 §11이 우려하는 "작은 크기 가독성"을 정확히 해친다. 텍스트/이모지/도형은 폰트 크기부터 목표 픽셀 크기 기준으로 매번 새로 계산하고(결정 3), 이미지도 원본에서 목표 크기로 직접 `drawImage`한다(결정 4).
- `<canvas>` 엘리먼트의 `width`/`height`를 목표 픽셀 크기와 정확히 1:1로 맞춘다(예: 32px 출력이면 `canvas.width = canvas.height = 32`) — 이 값이 그대로 PNG 파일의 실제 픽셀 크기가 되므로 CSS 표시 크기(줌 등)와 캔버스 실제 해상도를 혼동하지 않는다.
- 미리보기 컴포넌트(결정 9)와 최종 내보내기 파이프라인(결정 6·ZIP)이 이 **동일한** `renderFavicon` 함수를 호출한다 — 두 개의 다른 구현을 만들지 않는다.

## 6. Architect 결정 3 — 텍스트 자동 크기 조정 방식

닫힌 형태(closed-form) 공식 대신, `ctx.measureText`를 이용한 짧은 반복 축소 루프를 쓴다 — 폰트마다 실제 렌더 폭이 달라 공식만으로는 부정확하다.

```ts
function fitTextFontSize(ctx: CanvasRenderingContext2D, text: string, canvasSize: number, bold: boolean): number {
  const safeWidth = canvasSize * 0.82; // 여백 확보
  let fontSize = Math.floor(canvasSize * 0.66);
  const minFontSize = Math.floor(canvasSize * 0.2);
  ctx.font = `${bold ? "bold " : ""}${fontSize}px system-ui, sans-serif`;
  while (fontSize > minFontSize && ctx.measureText(text).width > safeWidth) {
    fontSize -= Math.max(1, Math.floor(fontSize * 0.05));
    ctx.font = `${bold ? "bold " : ""}${fontSize}px system-ui, sans-serif`;
  }
  return fontSize;
}
```

- 최대 반복 횟수가 `fontSize`가 5%씩 줄어드는 등비수열이라 항상 유한(수십 회 이내)하게 종료한다 — 별도의 반복 상한을 카운터로 강제하지 않아도 안전하지만, 방어적으로 반복 상한(예: 40회)을 추가해 이론상 무한루프를 원천 차단한다.
- **입력 정책**: 1~3자를 권장값으로 안내하지만 **하드 리밋으로 막지 않는다.** 4자 이상이면 "짧은 텍스트(1~3자)를 권장합니다" 같은 비차단 경고만 보여주고, 위 알고리즘이 `minFontSize`까지 계속 줄여서라도 렌더링은 계속한다(QA #4 "4자 이상 경고"는 차단이 아니라 안내임을 명확히 한다).
- 세로 중앙 정렬은 `textBaseline = "middle"`, `textAlign = "center"`로 처리하고, `y` 좌표를 `canvasSize / 2`에 살짝 보정치를 더해(폰트마다 optical center가 baseline 기준과 미묘하게 다름) 시각적 중앙에 맞춘다. 보정치는 Builder가 실제 렌더링을 보고 미세 조정한다.

## 7. Architect 결정 4 — 이미지 crop/zoom 좌표 처리 방식(미리보기 UI ↔ 출력 캔버스 분리)

브리핑 §23이 지적한 "미리보기 화면 크기와 실제 출력 캔버스 크기가 다르다"는 문제를 구조적으로 해결한다.

- **crop 상태는 화면 픽셀이 아니라, 원본 이미지의 정규화된 좌표계로 저장한다.**

```ts
type CropState = {
  zoom: number; // 1.0 = 이미지의 짧은 변이 정사각형 프레임에 꽉 참
  panX: number; // -1 ~ 1, 프레임 중심 대비 수평 이동 비율
  panY: number; // -1 ~ 1, 프레임 중심 대비 수직 이동 비율
};
```

- 미리보기 UI(드래그로 pan, 슬라이더로 zoom)는 화면 상의 프리뷰 `<canvas>`/`<div>` 크기에서 발생한 포인터 이벤트(px 단위 드래그 거리 등)를 그 프리뷰 엘리먼트의 **현재 렌더 크기로 나눠 즉시 정규화**한 뒤 `CropState`에 반영한다 — 저장되는 값 자체는 화면 크기와 완전히 무관하다.
- 실제 렌더 시(미리보기든 최종 내보내기든 결정 2의 동일한 `renderFavicon`이든) `CropState`와 `ImageBitmap`의 `naturalWidth`/`naturalHeight`만으로 소스 사각형(sx, sy, sw, sh)을 계산한다.

```ts
function cropRect(bitmap: ImageBitmap, crop: CropState) {
  const shortSide = Math.min(bitmap.width, bitmap.height);
  const frame = shortSide / crop.zoom; // zoom이 클수록 자르는 영역이 작아짐(확대)
  const maxPanX = (bitmap.width - frame) / 2;
  const maxPanY = (bitmap.height - frame) / 2;
  const cx = bitmap.width / 2 + crop.panX * maxPanX;
  const cy = bitmap.height / 2 + crop.panY * maxPanY;
  return { sx: cx - frame / 2, sy: cy - frame / 2, sw: frame, sh: frame };
}
```

- 이렇게 구한 (sx, sy, sw, sh)를 목표 크기(16~512px)마다 `ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, size, size)`로 그린다 — 미리보기 프레임에서 보이는 영역과 최종 PNG에 담기는 영역이 프레임/줌 값이 같은 한 항상 정확히 일치한다(사이즈만 다를 뿐 잘리는 비율은 동일).
- `maxPanX`/`maxPanY`가 음수가 되는(즉, `frame`이 이미지 자체보다 커지는) 경우 — 즉 `zoom < 1`로 짧은 변보다 넓게 보려는 시도 — 는 `zoom`의 최소값을 1.0으로 고정해 원천 차단한다(항상 최소한 이미지 전체의 짧은 변만큼은 채워서 보여준다).

## 8. Architect 결정 5 — 이모지 렌더링 방식과 브라우저 차이 대응

- 별도 이모지 이미지 자산 라이브러리(Twemoji/OpenMoji 등)를 추가하지 않는다 — 폰트 용량과 관리 부담 대비 실익이 적다.
- `ctx.font = "{size}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"` 뒤 `ctx.fillText(emoji, ...)`로 그린다. 모든 evergreen 브라우저(Chrome/Edge/Safari/Firefox)는 Canvas 2D `fillText`에서 컬러 이모지 글리프를 OS 폰트 스택을 통해 그대로 렌더링한다 — 별도 폴리필이 필요 없다.
- **입력 방식**: 자유 입력 `<input>`(OS의 네이티브 이모지 입력기로 붙여넣기/직접 입력 가능) + 자주 쓰는 이모지 12~20개 프리셋 그리드(🚀💡🎯🧠🔥⭐✨🎨🛠️📦🌟💎 등) 원클릭 선택. 커스텀 이모지 피커 UI는 만들지 않는다(범위 초과).
- **한계 고지**: OS/브라우저마다 실제 이모지 아트워크가 다르다는 사실을 이모지 탭 근처에 항상 보이는 안내 문구로 명시한다("실제 표시 모양은 사용자의 운영체제·브라우저에 따라 달라질 수 있습니다"). 이는 감출 수 없는 플랫폼 특성이며, 잘못된 기대를 막는 게 목적이다.

## 9. Architect 결정 6 — ZIP 생성 라이브러리 사용(이 기능에 한해 예외적으로 dependency 추가)

지금까지 만든 도구들은 전부 "표준 포맷 + 짧은 순수 함수"로 dependency 없이 구현했다(Base64URL, ICO 헤더 등). **ZIP은 이 패턴이 깨지는 지점이다.**

- ZIP은 로컬 파일 헤더 + (파일마다 달라지는) 오프셋을 추적하는 중앙 디렉터리 + End-of-Central-Directory 레코드로 구성되고, 파일마다 CRC32 체크섬이 필요하다. STORE(무압축) 모드만 써도 되지만("이미 PNG/ICO 자체가 압축돼 있어 추가 압축 이득이 거의 없다") 여전히 여러 파일의 오프셋을 정확히 추적해야 하는 바이너리 포맷이라, 손으로 구현했을 때 실수 하나가 **다운로드된 ZIP 전체를 열리지 않게 만드는** 치명적 실패로 이어진다 — 이 프로젝트가 이미 QR 디코딩에 `jsqr`을 쓴 것과 같은 이유(정확성이 중요한 표준 바이너리 포맷)로 예외를 둔다.
- **결정: `fflate`(MIT, 의존성 0개, gzip 기준 약 8KB의 초경량 라이브러리)의 `zipSync`를 STORE 모드로 사용한다.** 압축 대신 저장만 하므로 CPU 부담도 없고, 반환값이 바로 `Uint8Array`라 `Blob`으로 감싸 다운로드하면 끝난다.
- 사용 범위를 이 기능 하나로 한정한다 — 프로젝트 전역 dependency로 무분별하게 확대하지 않는다.

## 10. Architect 결정 7 — manifest 기본 필드 정책

```json
{
  "name": "<사이트 이름 입력값, 비어 있으면 \"My Website\">",
  "short_name": "<사이트 이름이 12자 이하면 그대로, 초과하면 앞 12자로 잘라서>",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "<현재 배경색 옵션 값>",
  "background_color": "<현재 배경색 옵션 값>",
  "display": "standalone"
}
```

- `theme_color`/`background_color`는 V1에서 **별도 입력을 새로 만들지 않고** 디자인 패널에 이미 있는 "배경색" 값을 그대로 재사용한다(Should Have로 분리 입력을 나중에 추가할 수 있는 구조로 남겨둔다 — `manifest.ts`가 이미 이 두 값을 독립 매개변수로 받도록 설계해, Could Have 승격 시 UI만 추가하면 되게 한다).
- `display: "standalone"`은 V1에서 고정값으로 두고 사용자 옵션으로 노출하지 않는다(브리핑에 요구 없음, 대부분의 PWA에 적합한 기본값).
- `site.webmanifest`도 다른 산출물과 동일하게 항상 `renderFavicon`이 이미 계산한 색상 값을 그대로 소비한다 — manifest 생성 로직이 별도로 색을 재입력받지 않는다.

## 11. Architect 결정 8 — HTML 코드 기본 세트

브리핑 §18의 예시를 그대로 채택하고, Should Have인 `theme-color` meta 한 줄만 추가한다(그 이상 늘리지 않는다 — 과도한 태그 나열은 오히려 "복붙만 하면 끝"이라는 목표를 해친다).

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="application-name" content="{siteName}" />
<meta name="theme-color" content="{themeColor}" />
```

- `{siteName}`이 비어 있으면 `application-name` 줄 자체를 생략한다(빈 값 `content=""`을 넣지 않는다 — 실제로 붙여넣었을 때 무의미한 빈 속성이 남지 않도록).
- 코드는 React 텍스트 노드(`<pre>{htmlCode}</pre>`)로만 렌더링한다 — `dangerouslySetInnerHTML`을 쓰지 않는다(사이트 이름 입력값이 그대로 HTML 코드 문자열 "안에" 텍스트로 들어가므로, 화면에 실제 HTML로 파싱시키지 않는 것 자체가 안전장치다. `jwt-decoder`에서 확립한 것과 동일한 원칙).

## 12. Architect 결정 9 — 미리보기 컴포넌트 구조

- 공유 `<FaviconCanvas spec={spec} size={n} />` 컴포넌트 하나가 결정 2의 `renderFavicon`을 `useEffect`로 캔버스 ref에 그린다. 7개 크기(16/32/48/64/180/192/512) 전부 이 컴포넌트의 인스턴스이며, 그 아래 크기 라벨(`16px` 등)을 함께 표시한다(§24 접근성 — 크기 정보를 미리보기 이미지에만 의존하지 않는다).
- **컨텍스트 모의 미리보기(Should Have)**: 새 렌더링 로직이 아니라, 브라우저 탭바/북마크 바/iOS 홈 화면 그리드/Android 앱 아이콘처럼 보이도록 CSS로 꾸민 정적 wrapper 안에 같은 `<FaviconCanvas>`를 적절한 크기로 끼워 넣는 것으로 구현한다(예: 탭 모의 UI는 `16px` 인스턴스 + 가짜 탭 텍스트, iOS 모의 UI는 `180px` 인스턴스 + 둥근 모서리 CSS 프레임).
- 라이브 미리보기는 입력이 바뀔 때마다 즉시 다시 그린다 — Canvas 2D의 텍스트/도형/이미지 draw 몇 번은 매 keystroke에도 무리 없는 비용이므로 debounce를 두지 않는다(코드 전반과 일관되게, "가벼우면 debounce 없음" 원칙 재확인).

## 13. Architect 결정 10 — 대형 이미지 업로드 성능/메모리 정책(기존 관례 재사용)

`privacy-redactor`가 이미 검증한 값을 그대로 재사용한다(새 숫자를 만들지 않는다).

- 허용 타입: PNG/JPEG/정지 WebP. 애니메이션 WebP는 `privacy-redactor`와 동일한 방식(파일 앞부분에서 `ANIM`/`ANMF` RIFF 청크 문자열 검사)으로 거부한다 — 어떤 프레임이 파비콘이 될지 모호해지는 문제를 원천 차단.
- 파일 크기 ≤ 25MiB, 픽셀 수 ≤ 40,000,000, 한 변 ≤ 16,384px.
- 디코딩은 `createImageBitmap`을 사용한다(전체 해상도 `<img>` DOM 엘리먼트를 계속 붙들지 않아 메모리 효율적).
- Object URL/`ImageBitmap`은 이미지를 교체하거나 Reset할 때 반드시 `close()`/`revokeObjectURL()`로 해제한다(이 프로젝트의 다른 이미지 도구들과 동일한 QA 대상 — Object URL 누수 카운터로 실측 검증).

## 14. Architect 결정 11 — 원형/라운드 마스크는 V1에서 이미지 소스에 포함하지 않는다

브리핑 §7과 §27이 서로 다른 우선순위(Should Have vs Could Have)를 매겨 충돌한다. Architect가 §27(기능 범위를 확정하는 절)을 기준으로 정리한다.

- **도형 소스(§8) 자체의 라운드 사각형/원형은 그대로 Should Have로 포함한다** — "도형 생성기"라는 기능의 정체성 자체이므로 부가 옵션이 아니다.
- **이미지 업로드 소스의 "모서리 둥글게"/"원형 마스크"는 V1에서 제외(Could Have)한다.** 이유: 파비콘은 브라우저 탭·북마크 바 등 OS/브라우저 크롬이 이미 자기 방식대로 모양을 보정하는 맥락에서 쓰이고, Android는 어차피 adaptive icon 마스킹을 자체적으로 다시 적용한다 — 사각형 PNG 안에 원형을 미리 잘라 넣으면 오히려 일부 컨텍스트(정사각형을 기대하는 곳)에서 네 모서리가 어색하게 비어 보일 위험이 있다. 이는 단순히 구현 비용 문제가 아니라 실제 디자인 판단이므로, 사용자가 명시적으로 원할 때 후속 버전에서 옵션으로 추가하는 편이 안전하다.

## 15. Architect 결정 12 — 결과 파일명 규칙

파일명은 브라우저/OS가 **관례적으로 자동 탐색하는 경로**이므로 임의로 커스터마이즈하지 않는다(`/favicon.ico`, `/apple-touch-icon.png`는 `<link>` 태그 없이도 브라우저가 도메인 루트에서 직접 요청하는 잘 알려진 경로다).

- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`(브리핑이 "포함 검토"로 열어둔 것을 Architect가 **Must Have로 승격** — 렌더 비용이 거의 0에 가깝고 일부 Windows 바로가기가 여전히 참조하는 크기라 포함하지 않을 이유가 없다), `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest` — 전부 고정 파일명, 사이트 이름을 접두사로 넣지 않는다.
- **ZIP 아카이브 자체의 파일명만** 사이트 이름을 반영한다: 사이트 이름이 있으면 `{slug}-favicon-package.zip`(slug는 소문자화 + 영숫자/하이픈만 남기고 나머지 제거), 없으면 `favicon-package.zip`. ZIP 파일명은 URL 경로 관례와 무관한 순수 다운로드 편의 기능이므로 자유롭게 커스터마이즈해도 안전하다.

## 16. Architect 보강 결정 — 실시간 미리보기와 내보내기 파이프라인 분리(성능)

브리핑에 명시적 항목은 아니지만, 결정 5·9·10을 조합하면 자연히 따라오는 성능 설계라 명문화한다.

- **라이브 미리보기**: 입력이 바뀔 때마다 7개 `<FaviconCanvas>`만 다시 그린다(가벼움, debounce 없음).
- **내보내기(ICO 패킹 + PNG 7종 인코딩 + manifest + HTML 텍스트 + ZIP 압축)는 오직 "ZIP 다운로드" 버튼 클릭 시 1회만 실행한다.** 매 keystroke마다 ZIP까지 다시 만들지 않는다 — 어차피 사용자가 누르기 전에는 쓰이지 않을 산출물이므로 계산 낭비다.
- 이미지 소스에서 목표 크기가 클수록(180/192/512px) 원본 해상도가 크면 `drawImage` 비용이 늘 수 있지만, 7회의 `drawImage` 호출은 여전히 한 프레임 안에 끝나는 수준이라 Web Worker는 두지 않는다(다른 모든 이 프로젝트 신규 도구와 동일한 결론 — 실측 없이 미리 최적화하지 않는다).

## 17. Architect 보강 결정 — 자동 가독성 보정(§11) 구체화

- **텍스트/폰트 크기**: 결정 3의 자동 축소 루프.
- **대비 경고**: WCAG 상대 휘도 공식(외부 라이브러리 없이 sRGB 채널 → 상대 휘도 → 대비비, 20줄 내외의 순수 함수)으로 배경색과 글자색의 대비비를 계산한다. 본문 텍스트 기준(4.5:1)보다 느슨한 **3:1 미만이면** "배경색과 글자색의 대비가 낮아 작은 크기에서 잘 안 보일 수 있습니다" 경고를 띄운다(파비콘은 body 텍스트가 아니라 1~3자 대형 글자이므로 WCAG AA 본문 기준을 그대로 적용하지 않는다).
- **얇은 로고/디테일 경고**: 이미지 안의 선 굵기를 실제로 분석하는 기능(에지 검출 등)은 V1 범위를 넘는 과설계다. 대신 이미지 업로드 UI 근처에 항상 보이는 고정 안내 문구를 둔다: "선이 얇거나 디테일이 많은 이미지는 작은 크기에서 잘 안 보일 수 있습니다. 최대한 단순한 이미지를 사용하세요." — 거짓 정밀도(false precision)를 주장하지 않는다.

## 18. UI 구성

- 상단 히어로: 제목 "파비콘 생성기", 설명 한 줄(SEO 키워드 자연 포함, §21).
- 소스 탭: `[텍스트] [이모지] [이미지] [도형]` — 키보드로 좌우 이동 가능한 tablist(§24 접근성).
- 좌측 설정 패널(탭에 따라 내용 전환): 텍스트/이모지/도형 공통으로 배경색·글자색 컬러 피커+HEX 입력, 사이트 이름 입력. 이미지 탭은 업로드(파일 선택+Drag&Drop) + crop/zoom 프리뷰 프레임 + pan 슬라이더/드래그.
- 우측 미리보기 패널: 결정 12의 `<FaviconCanvas>` 7개 + 크기 라벨, Should Have 컨텍스트 모의 미리보기(탭/북마크/iOS/Android) 카드.
- 대비/텍스트 길이 경고는 미리보기 패널 상단에 비차단 배너로 표시(결정 17).
- 하단: `[ZIP 다운로드]` `[HTML 코드 복사]`, 생성될 파일 목록(고정 파일명 리스트, 결정 15), `<head>` HTML 코드 블록(결정 11), `site.webmanifest` 코드 블록.
- Reset 버튼: 소스·색상·업로드 이미지·crop 상태·사이트 이름을 전부 초기값으로 되돌리고 업로드된 `ImageBitmap`을 `close()`한다.
- Privacy 안내: "업로드한 이미지는 브라우저에서만 처리되며 서버로 전송되지 않습니다."

## 19. 파일 구조와 등록

```
app/[locale]/tools/favicon-generator/page.tsx
components/tools/favicon-generator/favicon-generator.tsx
components/tools/favicon-generator/favicon-canvas.tsx   # 공유 렌더 캔버스(결정 2·12)
lib/tools/favicon-generator/types.ts                    # FaviconSpec, CropState 등
lib/tools/favicon-generator/render.ts                    # 텍스트/이모지/도형/이미지 draw 함수, fitTextFontSize
lib/tools/favicon-generator/crop.ts                       # cropRect 등 정규화 좌표 계산(결정 4)
lib/tools/favicon-generator/contrast.ts                    # WCAG 대비비 계산(결정 17)
lib/tools/favicon-generator/ico.ts                          # ICO 컨테이너 빌더(결정 1)
lib/tools/favicon-generator/manifest.ts                      # site.webmanifest + HTML 코드 문자열 생성(결정 7·8)
lib/tools/favicon-generator/package.ts                        # fflate 기반 ZIP 어셈블(결정 6)
lib/tools/favicon-generator/validation.ts                      # 파일 크기/타입/픽셀 제한(결정 10)
lib/tools/favicon-generator/favicon-generator.test.ts
tests/favicon-generator-browser.mjs
```

- `package.json`에 `fflate`를 추가한다(결정 6의 유일한 예외적 dependency). 다른 파일은 전부 dependency 없이 구현한다.
- `lib/tools/registry.ts`에 `category: "media"`로 등록한다(`image-compressor`, `screenshot-stitcher`, `privacy-redactor`, `screenshot-statusbar-remover`와 같은 카테고리 — 이미지 입출력이 중심인 도구군). 아이콘은 lucide-react `Sparkles`보다 더 구체적인 `AppWindow`(또는 `Image` 계열)를 Builder가 실제 렌더링을 보고 최종 선택한다.
- i18n은 3곳 모두 갱신한다: `Common.toolsNav.faviconGenerator`, `Home.tools.faviconGenerator`, `Tools.faviconGenerator.*`.

## 20. Privacy

- 업로드 이미지는 서버로 전송하지 않는다. 외부 이미지 API 호출 없음.
- `localStorage` 자동 저장 없음. 생성된 파일은 메모리에서만 조립돼 다운로드된다.
- 페이지에 "업로드한 이미지는 브라우저에서만 처리되며 서버로 전송되지 않습니다." 안내를 둔다.

## 21. SEO

- 목표 검색 의도: 파비콘 생성기, favicon generator, favicon 만들기, favicon.ico 생성, 웹사이트 아이콘 만들기, 앱 아이콘 생성, apple touch icon 생성, site.webmanifest 만들기.
- 도구 자체가 페이지 최상단에 위치하고 설명은 하단에 짧게 배치한다.
- 다른 도구와 동일하게 `createPageMetadata`로 locale별 canonical/hreflang을 생성하고 `registry.ts` 등록으로 사이트맵에 포함시킨다.

## 22. QA 목록

브리핑 §28의 34개 시나리오를 그대로 채택한다.

1. 텍스트 1자 / 2. 텍스트 2자 / 3. 텍스트 3자 / 4. 텍스트 4자 이상 경고(비차단)
5. 한글 텍스트 / 6. 영문 텍스트 / 7. 숫자 텍스트
8. 이모지 1개
9. PNG 업로드 / 10. JPG 업로드 / 11. WebP 업로드
12. 정사각형 이미지 / 13. 가로로 긴 이미지 / 14. 세로로 긴 이미지
15. crop 동작 / 16. zoom 동작 / 17. drag(pan) 동작
18. 배경색 변경 / 19. 글자색 변경 / 20. 사이트 이름 입력
21. 미리보기 16px / 22. 미리보기 32px / 23. 미리보기 180px
24. favicon.ico 생성 / 25. PNG 파일 생성 / 26. manifest 생성 / 27. HTML 코드 생성
28. ZIP 다운로드 / 29. HTML 코드 복사 / 30. Reset
31. Mobile 320px / 32. Mobile 375px / 33. Tablet 768px / 34. Desktop 1440px

Architect가 다음 4개를 보강한다(핵심 기술 결정을 실제로 검증하기 위해 필요).

35. ZIP 압축을 풀었을 때 `favicon.ico`가 실제 OS/이미지 뷰어에서 열리는 유효한 멀티사이즈 ICO인지(시그니처+엔트리 수+오프셋 정합성 검증)
36. 이미지 crop에서 미리보기 프레임에 보이는 영역과 실제 내보낸 PNG의 잘린 영역이 동일 비율인지(결정 4 좌표계 검증)
37. 대비 경고가 실제로 낮은 대비 조합(예: 흰 배경+흰 글자에 가까운 조합)에서 뜨고, 높은 대비 조합에서는 뜨지 않는지
38. ko/en/ja 3개 locale에서 문구·안내·metadata가 자연스럽게 번역되어 있는가, Console Error 0

## 23. 완료 조건

`docs/EVALUATION.md` 100점 배점(핵심기능 25·사용성 20·모바일 15·접근성 15·성능 10·다국어 5·SEO 5·개인정보 5)과 PASS 게이트(점수 90 이상, Critical 0, High 0, 자동 테스트 PASS, Console Error 0, 모바일 PASS)를 그대로 적용한다. 추가로:

- TypeScript 오류 0, lint 오류·warning 0
- §22 QA 38개 항목 전부 PASS(특히 #35 ICO 유효성, #36 crop 좌표 일치)
- 텍스트/이모지/이미지/도형 4개 소스 전부 실제 Chrome에서 파비콘 생성 PASS
- favicon.ico·PNG 7종·site.webmanifest·HTML 코드·ZIP 다운로드·복사·Reset PASS
- 업로드 이미지의 서버 전송·저장소 저장 0, Object URL/ImageBitmap 누수 0
- ko/en/ja 및 SEO(canonical/hreflang/sitemap)·홈 카드·메뉴 회귀 PASS

## 24. Architect 최종 검토

### 기존 구조와의 충돌

- Next.js App Router, TypeScript, Tailwind, next-intl 구조와 일치한다. Server page + Client 컴포넌트 + 순수 domain 함수 패턴을 그대로 따른다.
- `media` 카테고리의 다른 이미지 도구(`image-compressor`, `privacy-redactor`, `screenshot-statusbar-remover`)와 업로드·Canvas·다운로드 패턴을 공유한다 — crop 좌표계(결정 4)는 `privacy-redactor`의 `clientToImage` 패턴과 같은 계열의 해법이다.
- 서버 route·DB가 필요 없다. 유일하게 새로 추가되는 것은 `fflate` 하나뿐이며, 이유가 명확히 문서화되어 있다(결정 6).

### 확정된 결정 요약(§30 대응)

1. `favicon.ico`: PNG-in-ICO 컨테이너를 직접 조립(BMP 인코딩 불필요), 16/32/48px 재사용
2. Canvas 렌더링: 소스 4종 공통 `renderFavicon(ctx, spec, size)`를 미리보기·내보내기가 공유, 목표 크기마다 독립적으로 다시 그림(다운스케일 금지)
3. 텍스트 자동 크기: `measureText` 기반 반복 축소 루프, 1~3자는 권장일 뿐 하드 리밋 아님(4자+는 비차단 경고)
4. crop/zoom 좌표: 정규화된 `{zoom, panX, panY}`로 저장, 원본 이미지 자연 크기 기준으로 소스 사각형 계산 — 화면 프리뷰 크기와 완전히 독립
5. 이모지: Canvas `fillText` + OS 폰트 스택, 이미지 자산 라이브러리 없음, 플랫폼 차이는 고정 안내 문구로 고지
6. ZIP: 유일한 예외적 dependency로 `fflate`(STORE 모드) 채택 — 정확성이 중요한 바이너리 포맷이라는 이유로 `jsqr`과 같은 근거의 예외
7. manifest: `theme_color`/`background_color`는 V1에서 기존 배경색 옵션을 재사용(새 입력 없음), `display: "standalone"` 고정
8. HTML 코드: 브리핑 예시 + `theme-color` meta 한 줄만 추가, React 텍스트 노드로만 렌더링
9. 미리보기: 공유 `<FaviconCanvas>` 컴포넌트, 컨텍스트 모의 미리보기는 CSS wrapper로만 구현(새 렌더 로직 없음)
10. 대형 이미지: `privacy-redactor`의 기존 제한(25MiB/40MP/16,384px, 애니메이션 WebP 거부)을 그대로 재사용
11. 원형/라운드 마스크: 도형 소스 자체에는 포함(Should Have), 이미지 소스의 마스킹은 V1 제외(Could Have) — 디자인적 이유(OS 크롬의 자체 마스킹과 충돌 위험)로 유보
12. 파일명: 개별 파일은 브라우저 자동 탐색 관례를 따르는 고정명, ZIP 아카이브 파일명만 사이트 이름 slug 반영

### 남은 구현 위험과 통제

- ICO 오프셋 계산 실수는 "파일이 아예 안 열리는" 치명적 결과로 이어진다 — QA #35로 실제 열람 가능 여부를 반드시 실측하고, 유닛 테스트에서도 ICONDIR/ICONDIRENTRY의 바이트 레이아웃을 필드 단위로 검증한다.
- crop 좌표계의 부호/축 실수(예: pan 방향이 반대로 동작)는 시각적으로만 드러나는 버그라 유닛 테스트로 전부 잡기 어렵다 — QA #36처럼 알려진 좌표(예: 이미지 정중앙 vs 완전히 치우친 pan)로 실제 렌더 결과 픽셀을 색상 샘플링해 검증한다.
- `fflate`는 이미 널리 쓰이는 안정적 라이브러리이지만, 신규 dependency 추가이므로 `package.json` 변경을 Builder 완료 보고에 명시적으로 남긴다(다른 도구들과 달리 이번엔 dependency가 늘어난다는 사실을 숨기지 않는다).

### 판정

- Product Owner 범위: `APPROVED`(Must/Should/Could/Do Not Build 경계 포함, §14의 원형 마스크 재분류 포함)
- Architect 기술 검토: `APPROVED FOR BUILD`
- Builder 시작 조건: 이 문서 §4~§22를 그대로 구현하고, §22 QA 38개·§23 완료 조건을 실제 Chrome 브라우저 테스트로 통과시킬 것. 구현 전 이 SPEC을 변경할 필요가 생기면 Architect 재검토를 먼저 받는다.
