# 스크린샷 자동 이어붙이기 / Screenshot Stitcher SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- URL: `/{locale}/tools/screenshot-stitcher`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P1 신규 도구
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder → Critic → QA → Optimizer 1 → Critic·QA 재검증 완료
- 구현 상태: 완료 (개선 1/5)

## 1. 목적과 성공 정의

연속 촬영한 스크린샷을 사용자가 지정한 순서대로 분석하여, 인접 이미지의 중복 구간을 제거한 하나의 긴 PNG를 브라우저 안에서 만든다. 일반 세로 합치기와 달리 겹침 높이를 자동 탐지하되, 신뢰도가 부족하면 자동 crop을 적용하지 않고 수동 확인을 요구한다.

V1의 성공은 다음을 모두 의미한다.

1. PNG/JPEG/WebP 2~20장을 순서대로 관리할 수 있다.
2. 실제 연속 캡처와 합성 fixture에서 인접 overlap을 안정적으로 찾는다.
3. 불확실하거나 서로 다른 이미지를 임의로 잘라내지 않는다.
4. 사용자가 모든 연결의 근거·신뢰도·겹침 높이를 확인하고 수정할 수 있다.
5. 원본 픽셀을 테마나 CSS filter로 변형하지 않고 PNG로 내려받을 수 있다.
6. 이미지 byte나 pixel은 서버·외부 API·분석 도구·storage로 전송 또는 저장되지 않는다.

## 2. 대상 사용자와 대표 흐름

- 모바일 웹페이지, 채팅, 상품 상세, 문서, 앱 설정, SNS 화면을 연속 캡처한 사용자
- 이미지 편집 프로그램 없이 반복 구간을 제거하고 싶은 비전문 사용자

대표 흐름:

`파일 선택/Drop → 순서 확인·수정 → 자동 분석 → 연결별 confidence·미리보기 확인 → 필요 시 overlap 수정 → 합성 → 정보 확인 → PNG 다운로드`

최소 2장이 아니면 분석 버튼과 결과 생성 버튼을 비활성화하고 “이미지를 2장 이상 추가하세요”라고 안내한다. 빈 상태는 오류가 아니다.

## 3. 범위와 우선순위

### Must Have — V1

- 여러 파일 선택, Drag & Drop, 기존 목록에 파일 추가
- PNG, JPEG, WebP 입력 검증과 손상 이미지 오류
- 입력 순서 보존, 파일명·크기·dimensions 표시
- 데스크톱 drag reorder와 모든 viewport에서 동작하는 위/아래 이동 버튼
- 개별 삭제 및 전체 초기화
- 인접 쌍 자동 overlap 분석, 진행률과 현재 쌍 표시
- 연결별 상태: `자동 감지`, `수동 확인`, `수동 설정`
- overlap px, confidence, 경고, 연결부 확대 미리보기
- 숫자 입력과 slider를 통한 수동 overlap 조정
- 고정 UI 오탐 완화를 위한 쌍별 “B 상단 분석 제외”와 “A 하단 분석 제외” px 설정
- 미해결 연결이 하나라도 있으면 결과 생성 차단
- 사용자가 overlap `0px`을 명시적으로 확정해 단순 세로 연결 가능
- 첫 번째 이미지 폭 기준 세로 합성, 폭 차이 안내
- 원본 비율을 유지한 PNG 결과, 미리보기, 결과 정보, 다운로드
- 처리 중 취소, 오류 복구, 자원 정리
- browser-only 처리와 개인정보 안내
- ko/en/ja UI·metadata·메뉴·sitemap
- 기존 light/dark theme에서 이미지 pixel 불변

### Should Have — V1 안정화 뒤 별도 승인

- Clipboard 이미지 붙여넣기
- WebP 출력과 quality 선택
- 연결부 before/after overlay 또는 difference view
- 파일명의 natural sort 제안. 자동 재정렬하지 않고 사용자 확인 후 적용
- 분석 sensitivity 고급 설정
- 결과가 한계를 넘을 때 여러 PNG로 분할 저장

### Could Have — 별도 SPEC

- OCR 기반 보조 매칭
- 상태바·주소창·앱 header/footer 자동 분류
- 가로 stitching
- JPEG 출력, PDF 출력
- crop 영역의 자유 이동·회전·원근 보정

### Do Not Build — V1

- 서버 업로드·서버 합성·외부 CV/AI API
- 계정·클라우드 저장·최근 작업 기록
- OpenCV.js 또는 대형 CV runtime
- OCR을 핵심 판단 근거로 사용
- 불확실한 match의 강제 자동 crop
- 원본 파일 변경

## 4. Product Owner 결정

| 항목 | 분류 | 결정 이유 |
|---|---|---|
| 자동 overlap + 수동 보정 | Must | 이 도구의 차별점이며 오탐을 사용자가 복구할 안전장치다. |
| Drag reorder + 위/아래 버튼 | Must | 순서는 결과 정확성과 직결되며 drag만으로는 모바일·키보드 접근이 어렵다. |
| Confidence·연결 미리보기 | Must | 자동 결과를 맹신하지 않고 사용자가 검증할 근거다. |
| 고정 UI 분석 제외 | Must | 모바일 캡처의 대표 오탐을 V1에서 통제한다. |
| 파일 추가 | Must | 일부 파일 누락 때문에 전체 선택을 다시 하지 않도록 한다. |
| Clipboard | Should | 편리하지만 permission·브라우저·다중 붙여넣기 범위를 추가한다. |
| WebP 출력 | Should | 대용량 절감에는 유용하지만 PNG가 품질·투명도·호환성 기준선이다. |
| OCR·자동 chrome 제거 | Could | 번들·언어·오탐·성능 비용이 크다. |
| 가로/PDF | Could | 세로 스크린샷 연결이라는 단일 목적에서 벗어난다. |

## 5. 파일 계약과 자원 제한

### 허용 입력

- MIME allowlist: `image/png`, `image/jpeg`, `image/webp`
- 확장자는 보조 정보이며 실제 decode 성공을 필수로 한다.
- 파일명은 화면 text로만 렌더링하며 HTML로 삽입하지 않는다.
- animation이 있는 WebP는 브라우저가 decode한 첫 frame만 사용할 수 있으므로 V1 입력 계약에서 거부하거나 “정지 이미지 WebP만 지원” 오류로 처리한다. 조용히 첫 frame만 합치지 않는다.

### 제한

- 파일 수: 최소 2, 최대 20장
- 파일 하나: 최대 20 MiB
- 전체 encoded bytes: 최대 100 MiB
- 이미지 하나: 최대 30 MP, 한 변 최대 16,384px
- 최종 output: 최대 48 MP, width 최대 8,192px, height 최대 32,767px
- 실제 Canvas capability probe가 더 작은 한계를 반환하면 더 작은 값을 적용한다.

제한은 decode 전에 byte/count, decode 직후 dimensions/pixel을 검사한다. 초과 파일을 임의 축소하거나 누락하지 않고 어떤 제한을 넘었는지와 해결 방법을 표시한다. 20장은 권장치가 아니라 hard limit이다.

메모리 절약을 위해 원본 20장의 RGBA bitmap을 동시에 유지하지 않는다. 목록에는 원본 `File`, metadata, 작은 thumbnail/analysis buffer만 두며 원본 합성 시 한 장씩 decode·draw·close한다.

## 6. 이미지 순서와 폭 정책

- 브라우저가 전달한 선택 순서를 그대로 초기 순서로 사용한다.
- 파일명 기준 자동 정렬은 하지 않는다.
- 각 항목에 순번, thumbnail, 파일명, dimensions, 파일 크기, 위/아래, 삭제를 제공한다.
- drag handle은 pointer reorder를 제공하되 keyboard·mobile 대안은 위/아래 버튼이다.
- 순서 변경·추가·삭제 후 영향을 받은 모든 인접 연결을 `미분석`으로 되돌리고 이전 결과 Blob을 폐기한다.

출력 폭은 첫 번째 이미지의 oriented width다. 나머지는 종횡비를 유지해 이 폭으로 scale한다. 각 overlap도 scale된 output 좌표계로 환산한다.

- 폭 차이 ≤2%: 안내 없이 scale
- 폭 차이 >2%: 각 이미지와 결과 요약에 resize 안내
- 폭 차이 >10%: `width-mismatch` 경고와 수동 확인 요구
- aspect ratio나 content scale이 달라 자동 분석 신뢰도가 낮으면 crop하지 않는다.

사용자 입력값을 stretch하거나 좌우 crop하지 않는다.

## 7. Architect 결정 1 — overlap 감지 알고리즘

### 후보 비교

| 후보 | 장점 | 위험 | 판정 |
|---|---|---|---|
| 원본 픽셀 직접 비교 | 단순하고 정확한 동일 픽셀 비교 | 고해상도·다수 offset에서 계산량 과다, JPEG 노이즈 취약 | 미선택 |
| 축소 grayscale MAE | 작고 결정적이며 screenshot translation에 적합 | 단색·반복 UI 오탐 가능 | **기반으로 선택** |
| gradient/edge 비교 | 텍스트·선 구조를 보존하고 밝기 변화에 견고 | 단독 사용 시 저텍스처 영역 취약 | **보조 점수로 선택** |
| SSIM | 밝기·대비 변화에 비교적 견고 | window 계산 복잡도, V1에 추가 이득 불명확 | Could |
| 특징점/OpenCV.js | 이동·scale·원근에 강함 | 큰 번들·WASM 초기화·모바일 비용, screenshot 단순 이동에 과함 | 미선택 |
| perceptual hash | 빠른 전체 유사도 | overlap 위치와 반복 구간 구별 정밀도가 낮음 | 미선택 |

### 선택 알고리즘

1. 두 이미지의 oriented dimensions를 확인하고 공통 분석 폭 360px로 aspect-fit downscale한다.
2. RGBA를 Rec.709 계열 luminance `Y = 0.2126R + 0.7152G + 0.0722B`의 8-bit grayscale로 만든다.
3. 인접 수평·수직 차분으로 gradient magnitude buffer를 만든다.
4. A 하단과 B 상단에서 최소 24 analysis rows부터 두 이미지의 작은 쪽 높이 65%까지 overlap 후보를 찾는다. 사용자 제외 margin은 먼저 제거한다.
5. 4 analysis rows 간격 coarse search 후 상위 후보 주변을 1 row 간격으로 refine한다.
6. 좌우 가장자리 5%를 제외하고 화면을 5개 수직 band로 나눠 grayscale normalized MAE 65%, gradient MAE 35%를 계산한다.
7. 최고·최저 band 하나씩을 제외한 trimmed mean과 band 분산을 사용한다. 세 band 이상이 같은 후보를 지지하지 않으면 불확실 처리한다.
8. 최상 후보를 720px 검증 폭에서 원본 환산 ±8px 범위로 다시 비교해 output overlap을 확정한다.

탐색 하한을 20%로 고정하지 않는 이유는 작은 overlap 필수 QA를 지원하기 위해서다. 탐색 상한 65%는 지나치게 먼 반복 영역을 후보로 삼는 위험과 일반 캡처 범위를 절충한다. 겹침이 24 analysis rows보다 작으면 자동 감지 범위 밖이며 수동 확인으로 보낸다.

## 8. Architect 결정 2 — downscale과 좌표 환산

- decode는 `createImageBitmap(file, {imageOrientation: "from-image", resizeWidth, resizeHeight, resizeQuality: "high"})`를 우선 사용한다.
- 분석 폭 360px, 최종 refine 폭 최대 720px. 원본보다 확대하지 않는다.
- 분석용 Canvas는 `willReadFrequently: true`, alpha 합성 기준은 투명 배경을 흰색으로 합성한 RGB다. PNG transparency 차이가 결과 pixel에는 보존되지만 분석에서는 투명 RGB 노이즈를 제거한다.
- analysis row를 원본/output px로 환산할 때 각 이미지의 scale을 독립 적용하고 정수 px로 반올림한다.
- 최종 결과는 분석 이미지를 사용하지 않고 원본 File을 다시 decode한다.
- EXIF orientation은 브라우저의 `from-image` 결과를 제품 좌표계로 정의하며 preview·analysis·output에서 동일 경로를 사용한다.

## 9. Architect 결정 3 — score와 confidence

Confidence는 확률이나 정확도 보장이 아니라 자동 판단의 품질 신호다. UI에는 “일치 신뢰도(추정)”라고 표시하고 확정 사실처럼 표현하지 않는다.

각 후보에 대해 다음을 계산한다.

- `pixelError`: grayscale absolute error / 255의 trimmed mean
- `gradientError`: gradient absolute error / 255의 trimmed mean
- `baseError = 0.65 × pixelError + 0.35 × gradientError`
- `bandSpread`: band별 error 표준편차
- `ambiguityGap`: 차선 독립 후보 error − 최상 후보 error. 최상 후보 ±3 analysis rows는 같은 peak로 보고 차선에서 제외
- `texture`: 비교 영역의 luminance/gradient variance

자동 적용 gate는 다음을 모두 만족해야 한다.

- `baseError ≤ 0.085`
- `bandSpread ≤ 0.035`
- `ambiguityGap ≥ 0.012`
- 5개 band 중 3개 이상이 최종 위치 ±2 analysis rows에 동의
- texture가 저정보 threshold 이상
- 360px 탐색과 720px refine의 원본 환산 결과 차이 ≤5px

표시 confidence는 위 다섯 gate의 정규화 여유도를 가중 합산해 0~100으로 clamp한다. 절대 error 45%, ambiguity 20%, band 일관성 15%, texture 10%, refine 안정성 10%다. 자동 적용은 gate 통과와 confidence ≥80을 모두 요구한다.

다음은 `수동 확인`이며 overlap을 자동 적용하지 않는다.

- gate 하나라도 실패
- confidence <80
- 후보가 탐색 최솟값/최댓값 경계에 붙음
- 서로 다른 폭 >10%
- 의미 있는 texture가 부족함

## 10. Architect 결정 4 — 반복·고정 UI 오탐 방지

- 단일 전체 평균이 아니라 5개 band의 합의와 분산을 사용한다.
- 최상값만 보지 않고 멀리 떨어진 차선 후보와의 gap을 요구한다.
- 단색 영역은 texture gate로 자동 적용하지 않는다.
- overlap 높이가 커질수록 실제 신규 content anchor가 포함되는지 gradient row 분포를 확인한다.
- 각 연결에 A 하단/B 상단 분석 제외 px를 제공한다. 기본값은 0이며 사용자가 상태바·주소창·고정 header/footer 크기만큼 지정한다.
- 제외값 변경 시 해당 쌍만 즉시 재분석한다.
- 반복 header 한 조각만 일치하고 본문 band가 불일치하면 confidence를 낮춘다.
- 분석 결과와 별개로 사용자가 연결부 미리보기를 확인할 수 있어야 한다.

고정 UI를 자동 삭제한다고 주장하지 않는다. V1은 오탐을 줄이고 사용자가 제외 범위를 지정하는 도구다.

## 11. Architect 결정 5 — Web Worker와 상태 모델

자동 분석은 전용 module Web Worker에서 실행한다. 이유는 5~20장, 다수 offset의 pixel/gradient 비교가 main thread long task를 만들 수 있기 때문이다.

- Main thread: 파일 목록, thumbnail, 순서, form, 진행률, preview URL, 접근성 알림
- Worker: resize decode, grayscale/gradient buffer, overlap search/refine, 합성용 OffscreenCanvas와 PNG encode
- message에는 generation ID와 pair index를 포함한다. 이전 generation의 응답은 폐기한다.
- ImageBitmap·ArrayBuffer는 가능한 경우 transferable로 전달하고 사용 직후 `close()` 또는 buffer 참조 해제한다.
- Worker는 쌍 하나마다 progress를 보내며 취소 메시지와 `terminate()`를 지원한다.
- Worker/OffscreenCanvas/createImageBitmap capability가 없으면 최신 Chrome 지원 필요 안내를 표시하며 자동 분석을 main thread에서 몰래 수행하지 않는다.

지원 기준은 `docs/EVALUATION.md`와 동일한 최신 안정 Chrome 계열이다. Safari·Firefox는 공식 완료 gate가 아니며 후속 호환성 검토 대상이다.

## 12. Architect 결정 6 — Canvas 한계 대응

Canvas 최대 크기는 표준의 단일 고정값이 아니고 브라우저·기기·메모리에 따라 다르다. 따라서 알려진 숫자만 믿지 않고 결과 생성 전에 capability probe와 보수적 제품 제한을 함께 적용한다.

1. scaled dimensions와 overlap으로 최종 width/height/pixels를 사전 계산한다.
2. 8,192×32,767, 48MP 중 하나라도 초과하면 합성을 시작하지 않는다.
3. 목표 dimensions의 작은 probe 또는 실제 OffscreenCanvas context 생성·1px read/write를 확인한다.
4. allocation/context/encode 실패는 `canvas-limit` 또는 `out-of-memory` 사용자 오류로 복구한다.
5. 빈/투명 결과 Blob을 성공으로 처리하지 않고 width·height·Blob size를 검증한다.

V1은 자동 축소나 분할 저장을 하지 않는다. 자동 축소는 텍스트 선명도와 사용자의 해상도 기대를 조용히 바꾸므로 명시적 후속 옵션으로 둔다. 한계 초과 시 이미지 수를 줄이거나 나눠 합치도록 안내한다.

## 13. Architect 결정 7 — 수동 overlap UI

각 인접 쌍을 하나의 connection card로 표시한다.

- `1 → 2`, 두 파일명, 상태 badge
- 추정 confidence와 “자동 결과는 반드시 미리보기를 확인하세요” 안내
- overlap number input + range slider
- 범위: 0부터 `min(A scaled height, B scaled height) - 1`
- step: 1 output px
- A 하단/B 상단 분석 제외 number input
- 연결부 확대 preview: A 끝부분 위에 B 시작부분을 이어 배치하고 seam line을 별도 표시
- “이 연결 확인” 버튼

자동 gate 통과 연결은 기본 `자동 감지`로 resolved지만 사용자가 수정하면 `수동 설정`이 된다. gate 실패 연결은 기존 추정값을 참고값으로만 보여주고 resolved overlap에는 쓰지 않는다. 사용자가 값과 preview를 확인한 뒤 버튼을 눌러야 한다. `0px`도 명시적 확인 후 유효하다.

Slider에는 label, 현재 px text, keyboard arrow 지원을 제공한다. 값 변경은 100ms 이내 preview에 반영하고 전체 output PNG를 매번 재생성하지 않는다.

## 14. Architect 결정 8 — 합성 fixture와 정확도 검증

테스트 fixture는 저작권 문제가 없는 코드 생성 이미지로 만든다.

1. seeded PRNG를 사용해 720×3,000px 긴 원본을 생성한다.
2. 고유한 행 번호, 다양한 글자형 block, 선, gradient, 카드, 반복 list, 고정 header/footer 패턴을 그린다.
3. 원본에서 `0~1400`, `1000~2400`, `2000~3000`을 lossless PNG로 crop한다.
4. 기대 overlap은 각각 400px이다.
5. JPEG/WebP fixture는 같은 source를 브라우저 encoder로 만들고 codec별 tolerance를 별도 적용한다.

필수 정확도:

- lossless PNG unique fixture: 각 overlap 오차 ±2px
- JPEG/WebP fixture: 각 overlap 오차 ±5px
- 3장 stitched PNG와 원본의 공통 영역: lossless fixture pixel difference 0 또는 동일 Canvas decode 기준 SSIM ≥0.999
- 5장 fixture: 모든 연결 gate 통과, 최종 dimensions 정확
- 반복 list/fixed header fixture: 정답 ±5px 또는 자동 적용 거부
- unrelated/solid/ambiguous fixture: 자동 적용 거부, `수동 확인`

테스트 생성기는 production bundle에 포함하지 않고 test helper에 둔다. expected overlap은 detector 구현에서 읽을 수 없는 fixture metadata로 test assertion에만 사용한다.

## 15. 출력·미리보기·다운로드

- 기본/유일 V1 출력: PNG (`image/png`)
- 파일명: `stitched-screenshot.png`
- OffscreenCanvas에 첫 이미지를 그리고 다음 이미지는 해당 overlap만큼 source 상단을 제외해 이어 그린다.
- 원본 alpha를 보존하며 불필요한 JPEG 재압축을 하지 않는다.
- 결과 preview는 화면 폭에 맞춘 `<img>` Blob URL이며 원본 pixel에 CSS filter를 적용하지 않는다.
- theme은 preview 주변 surface만 바꾸고 이미지 자체는 바꾸지 않는다.
- 결과 정보: 이미지 수, 첫 이미지 기준 width, final height, 원본 scaled 높이 합, 제거 overlap 합, Blob file size
- 연결·옵션·순서가 바뀌면 기존 결과를 `stale`로 표시하고 다운로드를 비활성화한다.
- 다운로드 후에도 사용자가 다시 조정할 수 있으나 Clear·파일 변경·unmount에서는 Blob URL을 revoke한다.

## 16. UI와 진행 상태

모바일 순서:

1. 제목·짧은 사용법·개인정보 안내
2. upload/drop zone과 제한
3. 이미지 순서 목록
4. 자동 분석 버튼과 progress
5. 연결 card와 수동 보정
6. 결과 생성
7. 결과 preview·정보·다운로드

상태는 `empty`, `ready`, `analyzing`, `review`, `composing`, `result`, `error`를 명시적으로 구분한다.

- 입력 변경 자동 분석은 하지 않는다. 사용자가 “겹침 자동 찾기”를 눌러 시작한다.
- progress: 전체 `(완료 pair / 전체 pair)`, 현재 `1 → 2 연결 찾는 중`, 백분율
- 분석·합성 중 관련 입력을 disabled하고 취소는 유지한다.
- 예상 가능한 오류를 개발자 예외 그대로 노출하거나 console error로 남기지 않는다.
- 결과 생성은 모든 connection resolved 후에만 활성화한다.

## 17. 오류 계약

| 코드 | 조건 | 사용자 복구 |
|---|---|---|
| `too-few-files` | 0~1장 | 2장 이상 추가 |
| `too-many-files` | 21장 이상 | 20장 이하로 줄이기 |
| `unsupported-type` | allowlist 밖 | PNG/JPEG/WebP 선택 |
| `animated-image` | animated WebP | 정지 이미지로 변환 |
| `file-too-large` | 개별 20MiB 초과 | 더 작은 파일 선택 |
| `total-too-large` | 총 100MiB 초과 | 파일 수/크기 줄이기 |
| `dimension-limit` | 개별 30MP/16,384px 초과 | 이미지 축소 |
| `decode-failed` | 손상·가짜 MIME·decode 실패 | 다른 파일 선택 |
| `low-confidence` | 자동 gate 실패 | 순서·제외 범위 확인 또는 수동 overlap 설정 |
| `width-mismatch` | 폭 차이 >10% | 같은 화면 캡처 사용 또는 수동 확인 |
| `output-limit` | 48MP/차원 초과 | 작업을 나눠 합치기 |
| `worker-unsupported` | 필수 API 없음 | 최신 Chrome 사용 |
| `canvas-limit` | context/draw/encode 실패 | 이미지 수·크기 줄이기 |
| `cancelled` | 사용자 취소 | 설정 유지 후 재시도 |

오류 영역은 `role="alert"`, 진행/완료는 `role="status"` 또는 polite live region을 사용한다. 오류 발생 뒤에도 유효한 파일 목록과 수동 설정은 가능한 범위에서 유지한다.

## 18. 개인정보·보안·자원 정리

- 페이지에 “이미지는 브라우저에서만 처리되며 서버에 업로드되지 않습니다.”를 표시한다.
- upload File, thumbnail, pixel buffer, 결과 Blob을 fetch/XHR/form/analytics/logging에 전달하지 않는다.
- localStorage, sessionStorage, IndexedDB, Cache API, URL/query/history에 파일명·설정·결과를 저장하지 않는다.
- 외부 image URL 입력을 지원하지 않아 Canvas origin taint를 막는다.
- File metadata와 오류에 포함된 파일명을 console에 기록하지 않는다.
- 새 분석·삭제·Clear·unmount·오류에서 object URL revoke, ImageBitmap close, Worker terminate, Canvas width/height 0 또는 참조 해제를 수행한다.
- generation ID로 늦게 도착한 Worker 응답이 새 상태를 덮어쓰지 못하게 한다.

## 19. 접근성·반응형·다크 모드

- file input, drop zone, reorder, delete, 분석, slider/number, 확인, 생성, 취소, 다운로드에 명확한 label을 제공한다.
- drag 없이 키보드만으로 순서 변경과 전체 흐름이 가능해야 한다.
- focus visible, 44×44px 주요 touch target, logical focus order를 유지한다.
- thumbnail에는 파일명을 대체 text로 제공하고 seam preview 설명은 text 상태와 함께 제공한다.
- progress·오류·분석 완료·stale 결과를 live region으로 알린다.
- confidence를 색만으로 전달하지 않고 숫자·상태 문구를 함께 표시한다.
- 320/375/768/1280/1440px에서 파일명과 긴 dimensions가 layout을 깨뜨리지 않는다.
- 결과 이미지는 container 안에서 축소 표시하고 원본 dimensions 때문에 가로 scroll을 만들지 않는다.
- light/dark 전환 전후 preview `<img>`와 Canvas 결과의 decoded pixel hash가 동일해야 한다.

## 20. 성능 목표

기준 장비와 브라우저 정보는 QA 기록에 남긴다. 기준 fixture는 1080×2400px PNG 5장이다.

- upload metadata/thumbnail 준비: 2초 이내 목표
- 4개 pair 자동 분석: 5초 이내 목표
- progress 첫 갱신: 시작 후 500ms 이내
- 분석 중 main thread long task: 200ms 초과 0회, UI 버튼 응답 지연 250ms 미만
- 수동 slider preview 반영: 100ms 이내
- 결과 합성: 5초 이내 목표(encode 포함)
- 취소 후 Worker 종료와 UI 복귀: 1초 이내
- 반복 3회 작업 후 Object URL·ImageBitmap·Worker의 선형 증가 없음

성능 목표 초과는 기기 차이를 포함해 evidence로 평가한다. UI가 멈추거나 브라우저가 crash하면 PASS할 수 없다.

## 21. 구현 구조

```text
app/[locale]/tools/screenshot-stitcher/page.tsx
components/tools/screenshot-stitcher/screenshot-stitcher.tsx
components/tools/screenshot-stitcher/connection-editor.tsx
components/tools/screenshot-stitcher/image-list.tsx
lib/tools/screenshot-stitcher/types.ts
lib/tools/screenshot-stitcher/validation.ts
lib/tools/screenshot-stitcher/overlap.ts
lib/tools/screenshot-stitcher/confidence.ts
lib/tools/screenshot-stitcher/geometry.ts
lib/tools/screenshot-stitcher/worker-protocol.ts
workers/screenshot-stitcher.worker.ts
tests/fixtures/screenshot-stitcher/*
tests/screenshot-stitcher-browser.mjs
```

- overlap score·confidence·geometry는 Worker/DOM과 분리된 순수 TypeScript 함수로 둔다.
- Worker protocol은 discriminated union으로 정의하며 `any`를 사용하지 않는다.
- page는 Server Component와 metadata를 유지하고 파일 상태 UI만 Client Component다.
- 신규 runtime dependency는 추가하지 않는다.

## 22. 수용 기준

1. 사용자는 PNG/JPEG/WebP 2~20장을 선택·Drop·추가하고 순서를 drag 또는 버튼으로 바꿀 수 있다.
2. 잘못된 형식·손상·개별/전체/차원 제한을 구체적인 복구 문구로 거부한다.
3. 자동 분석은 인접 쌍마다 overlap·추정 confidence·상태·진행률을 제공한다.
4. PNG synthetic unique fixture의 overlap을 ±2px, JPEG/WebP를 ±5px 안에서 찾는다.
5. unrelated·단색·모호·반복 UI fixture를 confidence gate 없이 자동 crop하지 않는다.
6. 사용자는 overlap과 고정 UI 제외 px를 1px 단위로 수정하고 연결을 명시적으로 확인할 수 있다.
7. 미해결 연결이 있으면 결과를 만들 수 없으며 0px 연결도 사용자 확인으로 처리할 수 있다.
8. 결과 width·height·제거 px·이미지 수·파일 크기가 실제 PNG와 일치한다.
9. lossless synthetic round trip 결과는 원본과 pixel 기준 동일하거나 SSIM ≥0.999다.
10. 폭이 다른 이미지는 첫 이미지 폭으로 비율 유지 scale되고 >2%/>10% 안내 규칙을 따른다.
11. 결과/preview pixel은 light/dark theme의 영향을 받지 않는다.
12. 이미지 내용·파일명·결과가 네트워크나 client storage에 기록되지 않는다.
13. Clear·삭제·재분석·unmount에서 임시 자원이 정리되고 stale 응답이 무시된다.
14. 320~1440px와 keyboard-only에서 핵심 흐름을 완료할 수 있다.
15. ko/en/ja 직접 URL·메뉴·metadata·canonical·hreflang·sitemap이 제공된다.

## 23. QA 필수 계획

### 필수 명령

```text
npm run lint
npm run type-check
npm test -- --run
npm run build
node tests/screenshot-stitcher-browser.mjs
```

필수 테스트에 fail, skip, todo가 있으면 PASS가 아니다.

### 도메인·합성 자동 테스트

- 2장, 3장, 5장 unique synthetic PNG overlap과 output dimensions
- PNG ±2px, encoded JPEG/WebP ±5px
- 한글·일본어·Emoji처럼 보이는 glyph/shape와 1px line이 포함된 fixture seam
- 채팅 bubble, 상품 card, 반복 list, 고정 header/footer fixture
- 큰 overlap, 작은 overlap, overlap 없음
- unrelated, solid, ambiguous candidates의 자동 적용 거부
- 잘못된 순서, 서로 다른 폭 2%/10% 경계
- exclude margin 적용 전/후
- manual 0/min/max/out-of-range normalization
- lossless stitched pixel diff 또는 SSIM
- output limit·dimension overflow·decode/Canvas/Worker 오류
- 취소·generation race·resource cleanup

### 실제 Chrome

- 여러 파일 선택, Drop, 추가, drag reorder, 위/아래, 삭제, Clear
- 2장/5장 분석, confidence, 진행률, 취소와 재실행
- 수동 slider·number·제외 margin·확인·stale 결과
- PNG/JPEG/WebP decode와 PNG download signature/dimensions/file size
- 20장과 고해상도 fixture에서 crash·freeze·메모리 선형 증가 없음
- 320/375/768/1280/1440px, keyboard-only
- ko/en/ja route·문구·menu·metadata
- light/dark pixel hash 동일
- image content network request 0, storage write 0
- Console Error 0, page error 0, unhandled rejection 0

수동 실사진 QA는 웹페이지 2장/5장, 채팅, 상품 상세, 반복 목록, 고정 상단/하단 UI를 포함한다. fixture가 공개 저장소에 들어가면 직접 제작하거나 재배포 가능한 라이선스만 사용한다.

## 24. Critic 필수 질문

Critic은 결과를 보기 전에 아래를 포함해 최소 10개 질문을 확정한다.

1. 처음 방문한 사용자가 일반 세로 합치기와 자동 중복 제거의 차이를 이해하는가?
2. 이미지 순서와 이를 바꾸는 방법이 drag를 모르는 사용자에게도 명확한가?
3. 자동 감지의 성공·불확실 상태와 추정 confidence 의미를 이해할 수 있는가?
4. 불확실한 이미지가 사용자 확인 없이 잘리지 않는가?
5. 연결부의 글자·선·UI가 끊기거나 중복되지 않았는지 쉽게 확인할 수 있는가?
6. 수동 overlap과 고정 UI 제외 설정이 비전문 사용자에게 직관적인가?
7. 반복 목록·고정 header/footer가 오탐을 만들 때 복구 경로가 충분한가?
8. 서로 다른 폭·순서·화면을 넣었을 때 위험을 명확히 알리는가?
9. 긴 분석·합성 중 진행과 취소가 명확하고 UI가 응답하는가?
10. 모바일에서 여러 파일과 연결 card를 관리하고 다운로드할 수 있는가?
11. 키보드·스크린리더 사용자가 순서 변경, slider, 상태를 이해할 수 있는가?
12. 서버에 업로드되지 않는다는 안내가 업로드 전에 보이는가?
13. 제한·decode·Canvas 오류에서 작업을 복구할 수 있는가?
14. 다시 작업할 때 Clear와 resource lifecycle이 예측 가능한가?
15. ko/en/ja에서 문구가 잘리거나 confidence 의미가 달라지지 않는가?

## 25. 완료 조건

- Critic 평가 ≥90/100
- Critical Issue 0, High Issue 0
- TypeScript 오류 0, lint 오류·warning 0
- 필수 자동 테스트 fail·skip·todo 0
- 2장·5장 Stitch PASS
- synthetic overlap 정확도와 pixel round trip PASS
- 수동 overlap·고정 UI 제외·잘못된 자동 연결 방지 PASS
- PNG/JPEG/WebP 입력, PNG 다운로드 PASS
- 긴 이미지·20장·고해상도에서 crash 및 차단성 freeze 0
- Console Error·page error·unhandled rejection 0
- 320/375/768/1280/1440px 모바일·반응형 PASS
- ko/en/ja와 SEO PASS
- 이미지 서버 전송·외부 API·client storage 저장 0
- 기존 `docs/EVALUATION.md`의 모든 PASS gate 충족
- 개선 반복 최대 5회

5회차 재검증 뒤 하나라도 미달이면 억지로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 기록한다. Builder는 자체 결과를 최종 승인하지 않고 Critic은 코드를 수정하지 않으며 QA는 객관적 증거만 기록하고, 평가 이후 수정은 Optimizer만 수행한다.

## 26. Architect 검토 결과

### 기존 구조와의 충돌

- `/{locale}/tools/{slug}`, Server page + Client tool, `lib/tools`, messages, browser QA 구조와 일치한다.
- browser-only 원칙, 로그인 없음, server 최소화, TypeScript, Next.js, Tailwind, ko/en/ja 계약과 충돌하지 않는다.
- 파일 수·pixel·output 제한과 순차 decode는 기존 이미지 도구의 memory 정책과 일관된다.
- 전역 dark mode는 UI surface에만 적용하고 image/canvas pixel을 변형하지 않는다.
- 신규 library나 서버 route가 필요하지 않으므로 전역 Architecture 변경은 없다.

### 확정 기술 결정

1. overlap: 360px grayscale MAE + gradient MAE, 5-band 합의, coarse/refine 탐색
2. downscale: `createImageBitmap` high-quality resize, 360px 분석 + 최대 720px refine
3. confidence: 절대 error·차선 gap·band 분산·texture·refine 안정성의 gate와 0~100 추정치
4. 반복 UI: band 합의, ambiguity/texture gate, A 하단/B 상단 사용자 제외 margin
5. Worker: 자동 분석과 OffscreenCanvas 합성을 module Worker에서 실행
6. Canvas: 8,192×32,767·48MP 보수 제한 + runtime probe, 초과 시 명시 오류
7. 수동 UI: 쌍별 number+slider+seam preview+명시적 확인, 0px 허용
8. synthetic QA: seeded 720×3,000 source crop, PNG ±2px/JPEG·WebP ±5px, pixel/SSIM round trip

### 주요 위험과 통제

- 반복 UI 오탐: 다중 band·차선 gap·texture·refine gate와 수동 확인
- JPEG/WebP 노이즈: gradient 혼합 점수와 형식별 tolerance
- 고정 chrome: 제외 margin과 unresolved 안전 상태
- 모바일 OOM: 20장/100MiB/30MP/48MP 제한, 순차 decode, Worker, 즉시 close/revoke
- Canvas 구현별 한계: 고정 제품 cap과 runtime probe를 함께 사용
- Worker race: generation ID, cancel, stale response 폐기
- drag 접근성: 위/아래 button을 동등한 기능으로 제공

### 공식 기술 근거

- MDN `WorkerGlobalScope.createImageBitmap`: Worker에서 Blob decode, crop, orientation과 resize option 지원
- MDN `OffscreenCanvas.convertToBlob`: Worker에서 PNG/JPEG/WebP encode 가능하며 PNG는 필수 지원
- MDN `<canvas>` maximum canvas size: 실제 최대 dimensions는 브라우저와 환경에 의존하고 초과 시 unusable할 수 있음
- WHATWG HTML Canvas: Canvas bitmap, context와 Blob serialization의 표준 동작
- MDN Transferable objects: `ImageBitmap`, `OffscreenCanvas`, `ArrayBuffer` 전송 지원

### 판정

- Product Owner 범위: `APPROVED`
- Architect 기술 검토: `APPROVED FOR BUILD`
- Builder 인계 상태: `COMPLETED` (Builder 자체 최종 승인 아님)
- 최종 판정: Critic 97/100, Critical 0, High 0, 자동 테스트·Chrome QA·Console Error 0·모바일 조건을 충족하여 Product Owner `DONE`
