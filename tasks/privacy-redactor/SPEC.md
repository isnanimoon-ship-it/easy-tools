# 이미지 개인정보 마스킹 / Image Privacy Masking SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- URL: `/{locale}/tools/privacy-redactor` (route와 registry key는 유지, 화면 문구만 갱신)
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P1 도구 재설계
- 유일한 구현 기준: 이 문서
- 이력: 이 도구는 원래 브라우저 OCR(Tesseract.js) + 정규식 기반 자동 탐지(전화번호/이메일/IP/URL/주민번호형태/카드번호/QR/이름)로 설계됐다. 실제 스크린샷(카카오톡 대화, 신분증, 이메일 캡처)으로 반복 QA한 결과 이름 탐지가 문장 일부·UI 단어를 오탐하고, 신분증의 실제 주민번호는 놓치는 등 정확도가 신뢰 기준에 미치지 못했다. 아바타(프로필 이미지) 위치를 배경 분리+connected component로 잡는 후속 heuristic도 대비가 약한 실사진에서 재현율이 낮았다. Product Owner는 OCR 기반 자동 탐지 전체(QR 자동 탐지 포함)를 제거하고 **완전 수동 선택 기반 마스킹 도구**로 전환하기로 결정했다. 이 문서는 그 전환 이후의 유일한 최신 SPEC이며, 이전 버전의 OCR/QR/이름/아바타 탐지 관련 절은 전부 대체되었다.

## 1. 목적과 성공 정의

사용자가 PNG/JPEG/WebP 이미지 한 장을 올리면, 브라우저에서 **직접 클릭+드래그로 가릴 영역을 지정**하고 Solid Box 또는 Pixelate로 가린 원본 해상도 이미지를 내려받는다.

V1의 성공은 다음 흐름을 안전하고 빠르게 완료하는 것으로 정의한다.

`업로드 → 영역 직접 지정(연속 추가·복제·Undo 등 편의 기능) → 가림 방식 선택 → 결과 미리보기 → 최종 확인 → 다운로드`

- 자동 탐지를 제공하지 않으며, 제공하지 않는다는 사실을 화면에서 숨기지 않는다.
- 사용자가 직접 지정하지 않은 영역은 어떤 경우에도 자동으로 가려지지 않는다.
- 이미지와 편집 상태를 서버·외부 API·analytics로 전송하지 않는다.
- 원본은 메모리에서도 변경하지 않고 다운로드 시 새 Canvas bitmap을 만든다.
- "자동으로 찾아준다", "AI가 탐지한다"류의 문구를 사용하지 않는다.

## 2. 대상 사용자와 주요 사용 사례

- 채팅·문자·이메일·고객센터 화면을 공유하는 일반 사용자
- 택배 송장·영수증·주문내역·중고거래 화면을 공유하는 사용자
- 신분증·계약서 등 정확히 어디를 가릴지 스스로 판단해야 하는 사용자
- 버그 리포트·로그·관리자 화면을 공유하는 개발자와 운영자

## 3. Product Owner 범위 결정

### Must Have — V1

- 단일 이미지 파일 선택 및 Drag & Drop
- PNG, JPEG, 정지 WebP 입력; GIF, SVG, animated WebP 거부
- `영역 추가` 모드에서 pointer down → drag → pointer up으로 직사각형 영역을 그린다
- **연속 추가**: 영역을 그린 뒤 자동으로 `선택` 모드로 바뀌지 않는다. 같은 모드에서 바로 다음 영역을 이어서 그릴 수 있다
- **영역 복제**: 선택된 영역과 같은 크기의 새 영역을 오프셋 위치에 만든다(같은 크기의 항목이 여러 개일 때 반복 작업을 줄인다)
- **Undo/Redo**: 영역 추가·삭제·복제·이동·크기 조절을 한 단계씩 되돌리고 다시 실행할 수 있다. `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`(또는 `Ctrl+Y`) 단축키와 버튼을 제공한다
- **확대/축소(Zoom)**: 50/100/150/200%와 맞춤(컨테이너 폭) 사이를 전환해 작은 글자·좁은 영역도 정밀하게 선택할 수 있다
- **키보드 이동**: 선택된 영역을 방향키로 1px, `Shift`+방향키로 10px씩 이동한다
- 영역 선택, 이동(drag), resize(8방향 handle), 원본 좌표 숫자 입력(X/Y/너비/높이), 삭제
- 좌표로 새 영역을 직접 추가(드래그 없이 기본 크기로 생성 후 값 수정)
- Solid Box(검정/흰색)와 Pixelate(8/16/24 원본 px) 마스킹
- Solid Box를 기본값으로 하고 보안 권장 방식이라고 안내
- 편집 표시 없는 순수 원본/영역 편집/가림 결과 3상태 전환 미리보기
- 원본 해상도 PNG 다운로드
- 다운로드 직전 "가려질 영역을 다시 확인하라"는 안내(자동 탐지 한계 안내 문구는 제거 — 더 이상 자동 탐지가 없으므로)
- Clear, 오류 복구, 자원 정리
- 브라우저 내부 처리 및 네트워크·저장소 정책 공개
- 모바일 320px부터 정상 조작
- ko/en/ja UI, metadata, 홈·메뉴·사이트맵 등록

### Should Have — V1 이후 별도 승인

- 다중 이미지 일괄 처리
- Clipboard 이미지 붙여넣기
- Blur 마스킹, 사용자 지정 Solid 색상
- 원형/자유형 마스킹 영역(현재는 직사각형만)
- 영역 그룹(여러 영역을 한 번에 이동)
- 프리셋 크기(자주 쓰는 영역 크기 저장)

### Do Not Build — V1

- OCR, 이미지 내 텍스트 자동 인식(어떤 형태로도 재도입하지 않음 — 이력 참고)
- 얼굴 인식, 아바타·프로필 이미지 자동 탐지, QR 자동 탐지를 포함한 모든 형태의 "자동으로 찾아주는" 기능
- 서버·클라우드 AI 분석, 원격 이미지 URL 가져오기
- 계정, 업로드 기록, 최근 작업, 클라우드 저장
- 파일명·이미지 내용의 analytics 또는 console 기록
- 원본 이미지 변경 또는 원본과 편집 레이어를 함께 보존하는 편집 포맷

자동 탐지를 다시 넣고 싶다면 이 SPEC이 아니라 별도 SPEC과 Product Owner 재승인이 필요하다.

## 4. 확정 사용자 흐름

1. 초기 상태에서 "이미지는 브라우저에서만 처리된다"는 안내와 지원 형식을 확인한다.
2. 이미지 한 장을 선택하거나 Drop한다.
3. 방향이 보정된 이미지와 해상도·파일 크기를 확인한다.
4. `영역 추가`를 눌러 가릴 부분을 드래그한다. 계속 드래그해 여러 영역을 연달아 추가할 수 있다.
5. 필요하면 `선택` 모드로 전환해 이동·resize·좌표 입력으로 미세 조정하고, `영역 복제`로 같은 크기 영역을 빠르게 늘린다. 실수하면 Undo로 되돌린다.
6. Solid 또는 Pixelate를 선택하고 가림 결과 미리보기를 확인한다.
7. 다운로드 전 "가려질 영역을 한 번 더 확인하라"는 안내를 다시 확인하고 PNG를 다운로드한다.
8. Clear 시 이미지·영역·확대/축소·Undo 이력을 모두 폐기한다.

빈 상태는 오류가 아니다. 영역이 하나도 없으면 다운로드가 비활성화된다. 이미지나 영역, 마스킹 옵션이 바뀌면 기존 결과 Blob은 `stale` 처리하고 다시 생성하기 전까지 다운로드할 수 없다.

## 5. 파일 계약과 한계

### 허용 입력

- MIME allowlist: `image/png`, `image/jpeg`, `image/webp`
- 확장자와 MIME만 믿지 않고 실제 decode 성공을 확인한다.
- animated WebP는 첫 프레임만 조용히 사용하지 않고 `animated-image`로 거부한다.
- GIF와 SVG는 명시적으로 지원하지 않는다고 안내한다.
- 파일명은 text로만 렌더링하고 HTML로 삽입하지 않는다.

### V1 제한

- 이미지 수: 정확히 1장
- 파일 크기: 최대 25 MiB
- 원본 pixel: 최대 40 MP
- 한 변: 최대 16,384px
- 새 파일을 선택하면 기존 작업을 교체한다.

## 6. Architect 결정 1 — 아키텍처 단순화

OCR·QR 자동 탐지 제거로 다음이 함께 정리된다.

- Tesseract.js, jsQR, `BarcodeDetector` 의존성과 `public/ocr/*` 모델 파일(약 47MB)을 전부 제거한다.
- 별도 감지 Worker(`workers/privacy-redactor.worker.ts`)와 `lib/tools/privacy-redactor/detectors.ts`, `avatar-detection.ts`, `ocr-preprocessing.ts`, `model-manifest.ts`를 삭제한다.
- `RedactionRegion` 타입에서 `source`/`category`/`risk`/`maskedText` 필드를 제거한다 — 모든 영역은 사용자가 직접 만들었으므로 구분할 필요가 없다.
  ```ts
  type RedactionRegion = { id: string; x: number; y: number; width: number; height: number; selected: boolean };
  ```
- `lib/tools/privacy-redactor/geometry.ts`는 `clientToImage`/`clampRect`만 남긴다(토큰 union/padding/overlap 계산은 더 이상 필요 없다).
- 분석 단계(`loading-model`/`recognizing`/`detecting`)와 `자동 분석`/`분석 취소` 버튼, 관련 상태 머신을 제거한다. 남는 비동기 작업은 결과 렌더링(Canvas → PNG Blob) 뿐이다.
- 이 변경으로 초기 번들과 첫 분석 시 네트워크 요청이 크게 줄어든다(OCR 모델 다운로드가 없어짐).

## 7. Architect 결정 2 — 수동 편집 UX

자동 탐지가 없으므로 수동 작업 자체의 속도와 정확도가 도구의 전부다. 다음 편의 기능을 Must Have로 포함한다.

1. **연속 추가**: `pointerUp`에서 그린 영역을 목록에 추가하고 선택 상태로 만들되, 모드를 강제로 `선택`으로 바꾸지 않는다. 좌표 패널로 방금 만든 영역을 바로 미세 조정할 수 있고, 이어서 드래그하면 다음 영역이 바로 만들어진다.
2. **영역 복제**: 선택된 영역과 동일한 크기를, 원본 대비 `max(10px, 너비의 15%)`만큼 우하단으로 오프셋한 위치에 만들고 그 영역을 선택한다. 목록 행 아이콘과 좌표 패널 양쪽에서 실행할 수 있다.
3. **Undo/Redo**: 영역 추가(드래그 완료·좌표 추가·복제)와 삭제, 그리고 드래그 시작 시점(이동·resize 각 1회)에 직전 `regions` 스냅샷을 history에 push한다. 코드 입력 필드의 매 키 입력이나 pointermove 중간 프레임은 history에 넣지 않는다 — 그러면 한 번의 드래그가 여러 단계로 쪼개져 Undo가 무의미해진다. History는 최대 50단계로 제한한다. Undo/Redo 후 선택 중이던 영역이 복원된 상태에 존재하면 선택을 유지하고, 없으면 해제한다.
4. **확대/축소**: 편집기 wrapper에 `width: {originalWidth * zoom / 100}px`를 적용하고 `max-w-full` 클래스를 제거해야 실제로 커진다(`max-width: 100%`는 명시적 `width`보다 우선 적용되어 그대로 두면 확대가 시각적으로 아무 효과가 없다 — 구현 중 실측으로 확인된 함정이다). `overflow-auto` 부모가 스크롤을 담당하며, `clientToImage`는 `getBoundingClientRect()` 비율 기반이라 확대 배율과 무관하게 좌표 매핑이 정확하다.
5. **키보드 이동**: SVG 편집기에 포커스가 있고 영역이 선택된 상태에서 방향키 1px, `Shift`+방향키 10px 이동을 지원한다. 이동마다 history에 push한다.
6. **드래그 중 크기 표시**: 새 영역을 그리는 동안 draft 사각형 옆에 `{width} × {height}`(원본 px 기준)를 실시간으로 표시해 정밀한 크기 조절을 돕는다.

## 8. Architect 결정 3 — 좌표 구조와 EXIF 방향

모든 영역은 orientation 보정 후 원본 bitmap 기준 정수 좌표로 저장한다.

- DOM 좌표 → 이미지 좌표: 표시 이미지의 실제 content rect와 canonical bitmap 크기의 비율을 사용한다(`clientToImage`).
- `devicePixelRatio`는 Canvas backing store에만 적용하며 논리 좌표 변환에 두 번 곱하지 않는다.
- resize 시 최소 영역은 1×1px, 이미지 경계를 넘지 않는다(`clampRect`).
- JPG는 `<img>` 표준 decode 경로로 EXIF orientation을 브라우저가 자동 적용한다.
- 표시, 편집기, 최종 Canvas가 모두 같은 orientation 보정 bitmap을 사용한다.

## 9. 마스킹과 보안 기준

### Solid Box — 기본 및 권장

- 검정 또는 흰색 완전 불투명 fill
- `globalAlpha = 1`, blend/filter 없이 최종 Canvas에 직접 rasterize
- 영역 내부 결과 pixel은 지정 RGB와 alpha 값으로 완전 일치해야 한다.
- 출력 파일에는 원본 layer, 편집 history, region metadata를 넣지 않는다.

### Pixelate

- 8/16/24 원본 px block 선택, 기본 16px
- 최소 8px 아래로 설정할 수 없다.
- 해당 원본 영역을 작은 offscreen bitmap으로 축소한 뒤 image smoothing을 끄고 다시 확대해 rasterize한다.
- Pixelate는 가시적 가림이며 원본 추론 가능성이 있음을 안내하고 보안이 중요하면 Solid를 권장한다.

### Blur

- V1 제외. 후속 도입 시에도 보안 기본값이나 안전한 제거 방식으로 홍보하지 않는다.

마스킹은 선택된(checkbox 켜진) region에만 적용한다. 선택 해제 영역은 overlay에 보이지만 결과에는 적용하지 않는다. 겹치는 region은 결정적 순서(생성 순서)로 합성하며 Solid가 포함되면 해당 pixel은 완전 불투명해야 한다.

## 10. Preview와 다운로드

- 편집 화면 overlay와 별도로 `원본` / `가림 결과` 탭을 제공한다.
- 결과는 원본 해상도 Canvas에서 생성하며 화면용 preview만 축소한다.
- 기본·유일 V1 출력: PNG `privacy-redacted.png`
- 이미지 내용에서 파일명을 만들지 않는다.
- 영역이 하나도 선택되지 않으면 다운로드를 막고 "가릴 영역을 선택하거나 추가하세요"라고 안내한다.
- 이미지·영역·마스킹 옵션이 바뀌면 기존 결과 Blob을 revoke하고 stale 처리한다.
- 다운로드 직전에 "다운로드 전에 가려질 영역을 한 번 더 확인해 주세요."를 결과 영역에 항상 표시한다.

## 11. Architect 결정 4 — EXIF와 개인정보

- 최종 파일은 canonical bitmap을 새 Canvas에 그리고 `toBlob`으로 PNG 직렬화한다.
- 원본 JPEG/WebP byte stream이나 metadata segment를 복사하지 않는다.
- 결과 PNG에 EXIF, GPS, XMP, ICC의 원본 payload가 남지 않는 것을 binary 검사로 확인한다.
- UI에는 "다운로드 이미지는 새로 생성되며 원본의 위치 정보 등 메타데이터를 포함하지 않습니다."라고 실제 동작에 맞게 표시한다.
- 원본 File, pixel, region, 결과 Blob을 fetch/XHR/beacon/form/analytics에 전달하지 않는다.
- localStorage, sessionStorage, IndexedDB, Cache API, URL/query/history에 이미지·영역·결과를 저장하지 않는다.
- 파일명을 console에 기록하지 않는다.
- 페이지의 기존 Naver WCS 같은 analytics가 있더라도 이벤트 payload에 파일·region 정보를 넣지 않는다.

페이지에 다음 의미의 문구를 업로드 영역 가까이에 표시한다.

> 이미지는 브라우저에서만 처리되며 서버로 전송되지 않습니다.

OCR 모델 다운로드 관련 문구는 더 이상 존재하지 않는다(OCR이 없으므로).

## 12. UI 구조와 상태

### Desktop

```text
업로드·개인정보 안내
파일 정보
┌──────────────────────────┬────────────────────┐
│ 이미지 편집 Canvas       │ 영역 목록          │
│ 모드·Undo/Redo·Zoom       │ 영역 N · 크기·삭제 │
└──────────────────────────┴────────────────────┘
마스킹 방식
원본/결과 Preview
최종 검토 안내·다운로드
```

### Mobile

`업로드 → 이미지 Canvas → 모드/Undo/Zoom toolbar → 영역 개수 → 영역 목록 → 마스킹 방식 → Preview → 다운로드`

상태는 `empty`, `ready`, `rendering`, `result`, `error`로 단순화된다(분석 관련 상태 없음).

- 예상 가능한 오류를 개발자 예외 그대로 노출하거나 console error로 남기지 않는다.

## 13. 오류 계약

| 코드 | 조건 | 사용자 복구 |
|---|---|---|
| `unsupported-type` | PNG/JPEG/WebP 외 | 지원 파일 선택 |
| `animated-image` | animated WebP/GIF | 정지 이미지로 변환 |
| `file-too-large` | 25 MiB 초과 | 더 작은 파일 선택 |
| `dimension-limit` | 40MP/16,384px 초과 | 이미지 축소 |
| `decode-failed` | 손상·위장·decode 실패 | 다른 파일 선택 |
| `canvas-failed` | Canvas/context/encode 실패 | 더 작은 이미지 또는 최신 브라우저 |
| `no-selected-region` | 선택 영역 0개 | 영역 선택 또는 추가 |
| `multiple-files` | 파일 2개 이상 동시 선택 | 한 장만 선택 |

`model-load-failed`/`ocr-failed`/`qr-failed`는 더 이상 존재하지 않는다. 오류는 `role="alert"`를 사용한다.

## 14. 접근성

- file input, drop zone, 편집 모드, 선택/해제, mask option, preview, download, Undo/Redo, Zoom, 복제에 명확한 label을 제공한다.
- Canvas overlay만으로 상태를 전달하지 않고 동일한 영역 목록을 DOM으로 제공한다.
- 키보드만으로 영역 선택, 1px/10px 이동, resize(좌표 입력으로), 삭제, 좌표 입력, Undo/Redo(`Ctrl/Cmd+Z` 등)가 가능해야 한다.
- 단축키는 `input`/`textarea`/`select`에 포커스가 있을 때 가로채지 않는다(네이티브 편집 동작과 충돌 방지).
- focus visible과 논리적 focus 순서를 유지한다.
- toolbar와 handle의 touch target은 최소 44×44 CSS px이다.
- preview 이미지의 대체 설명은 상태와 영역 개수를 설명한다.

## 15. 다국어·SEO·등록

- ko/en/ja에서 기능·오류·경고·metadata가 모두 번역되어야 한다.
- stable URL: `/{locale}/tools/privacy-redactor` (route는 변경하지 않음 — 기존 링크·SEO 유지)
- title/description/canonical/hreflang/Open Graph를 "자동 탐지"가 아닌 "직접 선택해 가리기" 톤으로 제공한다.
- 공통 `lib/tools/registry.ts` 등록은 변경하지 않는다(translationKey만 그대로 사용).
- 레지스트리 route·번역 누락 테스트가 PASS해야 한다.

## 16. 구현 구조

```text
app/[locale]/tools/privacy-redactor/page.tsx
components/tools/privacy-redactor/privacy-redactor.tsx
lib/tools/privacy-redactor/types.ts
lib/tools/privacy-redactor/validation.ts
lib/tools/privacy-redactor/geometry.ts
lib/tools/privacy-redactor/masking.ts
lib/tools/privacy-redactor/privacy-redactor.test.ts
tests/privacy-redactor-browser.mjs
tests/privacy-redactor-formats.mjs
```

- page는 metadata 중심 Server Component, 파일·Canvas 상태 UI만 Client Component로 둔다.
- validation, geometry, masking 계산은 DOM과 분리한 순수 TypeScript로 테스트한다.
- 외부 이미지 처리 라이브러리 의존성이 없다 — Canvas 2D API만 사용한다.
- 삭제된 항목(재도입 금지, 이력 참고): `detectors.ts`, `avatar-detection.ts`, `ocr-preprocessing.ts`, `model-manifest.ts`, `workers/privacy-redactor.worker.ts`, `public/ocr/*`, `tesseract.js`/`jsqr` 의존성(`jsqr`는 QR 코드 생성기 도구의 자체 테스트에서 별도로 계속 사용되므로 package.json에는 남아 있다 — privacy-redactor에서만 참조를 제거했다), `tests/privacy-redactor-identity-browser.mjs`, `tests/privacy-redactor-scenarios-browser.mjs`.

## 17. QA 필수 테스트

### 정적·단위

```text
npm run lint
npm run type-check
npm test -- --run
npm run build
node tests/privacy-redactor-browser.mjs
node tests/privacy-redactor-formats.mjs
```

- MIME·animation·크기·차원 검증
- 분석↔원본↔화면 좌표 round trip
- region add/move/resize/clamp/delete/duplicate
- Solid alpha/RGB pixel exact match
- Pixelate block size와 영역 밖 pixel 불변
- Undo/Redo 상태 전이(추가·삭제·복제·이동·resize 각 1 step)

### 실제 Chrome 기능

1. PNG/JPEG/WebP, 손상 파일, animated WebP
2. 40MP 경계와 초과 거부, EXIF orientation 정렬
3. 영역 추가(연속 드래그로 여러 개), pointer 이동·8방향 resize·삭제
4. 영역 복제로 동일 크기 영역 생성
5. Undo/Redo 버튼과 키보드 단축키
6. 확대/축소 버튼으로 실제 렌더링 폭이 변하는지(맞춤 ↔ 50~200%)
7. 방향키 1px, Shift+방향키 10px 이동
8. 좌표로 영역 추가·좌표 입력 수정
9. Solid 검정/흰색, Pixelate 8/16/24
10. 원본/결과 preview, stale 처리, PNG 다운로드
11. 320/375/768/1280/1440px와 keyboard-only
12. ko/en/ja 직접 URL·번역·metadata·메뉴·사이트맵
13. Console Error·page error·unhandled rejection 0
14. 네트워크 요청에 이미지 bytes/data URL 없음, client storage에 이미지·영역 데이터 없음

### 보안 QA

1. Solid region 내부 모든 pixel이 완전 불투명 지정색인지 검사한다.
2. PNG chunk·binary에 원본 EXIF GPS, XMP, 원본 JPEG stream이 없는지 검사한다.
3. 결과가 단일 raster bitmap이며 복원 가능한 별도 원본 layer가 없는지 확인한다.
4. Pixelate를 안전한 제거로 과장하지 않고 Solid 권장 안내가 보이는지 확인한다.
5. fetch/XHR/beacon/form request body/query/header에 이미지 bytes, data URL, 파일명이 0인지 가로챈다.
6. localStorage/sessionStorage/IndexedDB/Cache API에 이미지·영역·결과 write가 0인지 확인한다.
7. Clear/unmount/교체/오류에서 Object URL revoke를 검증한다.

## 18. 사용 기준

1. 빈 상태는 오류 없이 유지되고 지원 형식·로컬 처리를 보여준다.
2. PNG/JPEG/정지 WebP 한 장을 선택·Drop할 수 있고 지원하지 않는 파일은 구체적으로 복구 안내한다.
3. `영역 추가` 모드에서 드래그로 영역을 만들고, 모드를 바꾸지 않아도 바로 다음 영역을 이어서 만들 수 있다.
4. 영역을 선택해 이동·resize·좌표 입력·복제·삭제할 수 있다.
5. 실수한 조작은 Undo로 되돌리고 Redo로 복원할 수 있다.
6. 작은 부분은 확대해서 정밀하게 선택할 수 있다.
7. 방향키로 선택된 영역을 미세 이동할 수 있다.
8. 영역 좌표는 화면 크기·DPR·EXIF orientation과 무관하게 최종 원본 해상도 결과에서 일치한다.
9. Solid는 완전 불투명이고 기본·권장 방식이며 Pixelate는 최소 block과 한계 안내를 제공한다.
10. 원본/결과 preview를 전환하고 변경 후 stale 결과를 다운로드하지 않는다.
11. 선택 영역이 없으면 다운로드를 막고, 있으면 다운로드 전 최종 확인 안내를 보여준다.
12. 결과 PNG는 원본 해상도를 유지하고 원본 metadata·편집 layer를 포함하지 않는다.
13. 이미지·영역·결과는 네트워크와 client storage로 전송·저장되지 않는다.
14. 320~1440px, keyboard-only, ko/en/ja에서 핵심 작업을 완료할 수 있다.
15. 어디에도 "자동으로 찾아준다"는 인상을 주는 문구가 없다.

## 19. 완료 조건

- TypeScript 오류 0, lint 오류·warning 0
- 필수 자동 테스트 fail·skip·todo 0
- Console Error·page error·unhandled rejection 0
- PNG/JPEG/WebP 업로드 PASS
- 연속 추가·이동·resize·좌표 수정·복제·삭제 PASS
- Undo/Redo PASS(추가/삭제/복제/이동/resize 각각)
- 확대/축소가 실제 렌더링 크기를 바꾸는지 PASS(구현 중 `max-w-full`이 확대를 무력화하는 버그를 실측으로 발견해 수정한 이력이 있다 — 회귀 여부를 반드시 실제 브라우저에서 확인한다)
- 키보드 방향키 이동(1px/10px) PASS
- Solid·Pixelate pixel 검증 PASS
- Preview·stale 방지·PNG download PASS
- EXIF GPS와 원본 metadata 제거 PASS
- 이미지·영역의 외부 전송 및 client storage 저장 0
- 40MP 경계 내 대형 이미지 crash·영구 freeze 0
- 320/375/768/1280/1440px와 keyboard-only PASS
- ko/en/ja 및 SEO·홈·메뉴·사이트맵 PASS
- OCR/QR/이름/아바타 자동 탐지 관련 코드·의존성·자산이 실제로 제거되었는지 확인(재추가 금지)

## 20. Architect 최종 검토

### 기존 구조와의 충돌

- Next.js App Router, TypeScript, Tailwind, next-intl, 독립 locale URL 구조와 일치한다.
- Server page + Client tool + 순수 domain module 구조로 기존 아키텍처와 충돌하지 않는다.
- 서버 route나 데이터베이스가 필요하지 않으며 이미지 처리 원칙과 일치한다.
- 외부 이미지 처리 라이브러리 의존성이 사라져 이전보다 더 단순하다.

### 확정된 결정

1. 자동 탐지(OCR/QR/이름/아바타) 전면 제거, 재도입 금지
2. 수동 영역 편집을 도구의 핵심으로 승격하고 연속 추가·복제·Undo/Redo·Zoom·키보드 이동을 Must Have로 추가
3. `RedactionRegion`을 좌표+선택 상태만 남기도록 단순화
4. 마스킹 보안: 완전 불투명 Solid 기본·권장, Pixelate 보조, Blur V1 제외(변경 없음)
5. EXIF: 새 PNG raster export로 원본 metadata를 복사하지 않고 binary QA(변경 없음)
6. route·registry key·번역 namespace는 유지해 기존 링크와 SEO 자산을 보존

### 남은 구현 위험과 통제

- 사용자가 직접 가릴 영역을 놓칠 위험이 자동 탐지보다 커진다 — 확대/축소와 정밀 좌표 입력, Undo/Redo로 실수 복구 비용을 낮춰 대응한다.
- 대형 이미지 OOM: 25MiB/40MP/16,384px 제한, 즉시 cleanup(변경 없음)

### 판정

- Product Owner 범위: `APPROVED`(자동 탐지 제거 및 수동 전환)
- Architect 기술 검토: `APPROVED FOR BUILD`
- Builder 완료 조건: 본 문서 6~19절의 구현·삭제 항목을 모두 반영하고 `node tests/privacy-redactor-browser.mjs`, `node tests/privacy-redactor-formats.mjs`를 실제 Chrome에서 PASS시킬 것
