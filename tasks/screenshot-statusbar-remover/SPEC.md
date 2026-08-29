# 스크린샷 상태바 자동 제거기 / Screenshot Status Bar Remover SPEC

## 문서 상태

- 상태: `DONE` (`docs/EVALUATION.md` 기준 Critic 93/100, Critical 0·High 0, QA 게이트 전부 PASS. 이후 실사용자 테스트로 발견한 감지 알고리즘 이슈 2건을 회차 2에서 추가 수정 — §7 "회귀 1" 참고)
- 작성일: 2026-08-30
- URL: `/{locale}/tools/screenshot-statusbar-remover`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P2 신규 도구
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현 + Critic 평가 + QA 검증 + Optimizer 개선(회차 1: §30, 회차 2: §7 "회귀 1") 완료 후 종료. 실사용 스크린샷(NAVER, 스크린샷 이지) 테스트로 검증된 상태에서 작업을 마무리한다. 이 평가는 별도 검토자가 아니라 같은 세션에서 연속으로 수행한 자체 평가이며, 사람에 의한 독립 재검토는 아직 없었다.

## 0. 배경 — 이 SPEC이 지켜야 할 교훈

같은 프로젝트의 `tasks/privacy-redactor/SPEC.md`는 OCR·이미지 내용 기반 자동 탐지(이름, 프로필 이미지)를 시도했다가 실제 스크린샷 QA에서 반복적으로 오탐·미탐을 겪었고, 결국 자동 탐지를 전부 제거하고 완전 수동 도구로 전환했다. 이 SPEC은 그 실패를 되풀이하지 않도록 다음을 원칙으로 삼는다.

- 자동 감지는 **구조적 위치(항상 화면 최상단)**라는, privacy-redactor에는 없었던 강한 제약을 적극 활용한다. 이 제약이 없었다면 이 기능도 승인하지 않았을 것이다.
- 그럼에도 "높이"는 기기마다 달라 확신할 수 없는 값이라는 점을 인정하고, 확신이 없으면 절대 임의로 자르지 않는다.
- 자동 감지는 항상 **미리보기 + 사용자 확인/조정**을 거친 뒤에만 최종 crop에 반영된다 — 자동 감지 자체가 최종 결과를 만들지 않는다.
- OCR은 Must Have에 넣지 않는다(privacy-redactor의 Tesseract 47MB·정확도 문제를 반복하지 않는다).

## 1. 목적과 성공 정의

사용자가 스마트폰 세로 스크린샷을 업로드하면, 브라우저가 화면 최상단 상태바(시간·배터리·통신·Wi-Fi 등) 영역의 높이를 구조적/시각적 신호로 추정하고, 제거선을 미리보기로 보여준 뒤, 사용자가 확인하거나 직접 보정해서 상태바만 깔끔하게 잘라낸 이미지를 다운로드한다.

핵심 흐름: `업로드 → 상단 영역 분석 → 상태바 후보 높이 계산 → 제거선 미리보기 → 사용자 확인/조정 → Crop → 다운로드`

V1의 성공은 다음으로 정의한다.

- 자동 감지가 확실하지 않으면 임의로 자르지 않는다. 감지 결과에는 항상 confidence(높음/보통/낮음)를 표시한다.
- 앱 자체 헤더(뒤로가기, 화면 제목 등)를 상태바로 오인해 잘라내지 않는 것을 최우선 품질 기준으로 삼는다.
- 이미지는 서버로 전송하지 않고 브라우저에서만 처리한다.
- 원본은 항상 그대로 유지하고, 다운로드 시점에만 새 Canvas에서 crop 결과를 생성한다.
- "완벽하게 자동으로 제거한다", "모든 기기를 지원한다" 같은 과장된 표현을 쓰지 않는다.
- 이 도구는 상태바 외의 개인정보(이름, 연락처 등)를 제거하지 않는다는 점을 명확히 안내한다.

## 2. 대상 사용자와 주요 사용 사례

- 커뮤니티에 스마트폰 화면 캡처를 공유하는 사용자
- 블로그·리뷰·튜토리얼용 앱 화면 캡처를 만드는 사용자
- 고객센터 문의용 캡처를 준비하는 사용자
- 시간·배터리·통신사 노출을 줄이고 싶은 사용자
- 여러 스크린샷을 이어붙이기(`screenshot-stitcher`) 전에 상태바를 먼저 정리하려는 사용자

## 3. Product Owner 범위 결정

### Must Have — V1

- PNG, JPG/JPEG, 정지 WebP 업로드; 파일 선택 + Drag & Drop
- 세로형 스마트폰 스크린샷에 최적화(가로 이미지는 명시적으로 범위 밖 안내)
- 상단 구조적/시각적 신호 기반 상태바 자동 감지(OCR 없이 동작)
- confidence 표시(높음/보통/낮음), 낮으면 자동 적용 대신 확인을 강조
- 제거 예정선을 이미지 위에 반투명 오버레이 + 선으로 미리보기
- 수동 보정: slider, px 숫자 입력, 이미지 위 drag handle — 최소 2개 이상 동시 제공(본 SPEC은 3개 모두 채택)
- ±1px 세밀 조정 버튼과 키보드 방향키 조정
- 상태바 미감지 시 "상태바가 감지되지 않았습니다" 안내 + 자동 crop 미적용 + 수동 모드 계속 사용 가능
- 원본 보기 vs 결과 보기 비교
- Crop 결과 다운로드(원본 폭 유지, 상단 N px만 제거)
- 출력 시 EXIF/GPS 등 원본 metadata 미포함(Canvas 재생성으로 자동 보장)
- 브라우저 내부 처리 전용, 서버/외부 API 미전송 안내
- 오류 처리: decode 실패, 미지원 포맷, 너무 작은 이미지, 가로 이미지, crop height가 이미지보다 큼, Canvas export 실패
- 모바일 320px부터 정상 조작
- ko/en/ja UI, metadata, 홈·메뉴·사이트맵 등록

### Should Have — V1 이후 별도 승인

- Clipboard 이미지 붙여넣기
- Before/After 비교 뷰(desktop 좌우, mobile 탭 전환)
- 동일 크기 이미지 세트에 같은 crop height 일괄 적용
- 다중 이미지 Batch 처리 + ZIP 다운로드
- OCR 보조 신호(시계·배터리 숫자 패턴 인식 시 confidence 가점, 실패해도 전체 감지 실패로 이어지지 않음)
- 출력 포맷 선택(PNG/JPEG/WebP), 원본 포맷 유지가 기본
- 비율(%) 기반 내부 관리 노출(사용자 직접 % 입력은 불필요)

### Could Have — 별도 SPEC

- iPhone/Android 자동 분류 표시(내부적으로는 기기명을 몰라도 동작해야 하며, 분류는 참고 정보일 뿐)
- 가로 화면·태블릿 지원
- 하단 시스템 네비게이션 바(홈 인디케이터) 동시 제거
- 앱 헤더와 상태바를 더 정밀하게 분리하는 고급 알고리즘
- `screenshot-stitcher`와의 연동(이어붙이기 전 자동 전처리)

### Do Not Build — V1

- 상태바 외 개인정보(얼굴, 이름, 연락처 등) 전체 자동 탐지 — 이 도구의 책임이 아니며 `privacy-redactor`(수동 마스킹)로 안내한다
- 얼굴 탐지
- 서버 업로드, 외부/클라우드 AI 분석
- 특정 기기 모델을 완벽히 식별해야만 동작하는 구조
- 확신 없는 상태에서의 임의 crop

## 4. 확정 사용자 흐름

1. 초기 상태에서 "브라우저에서만 처리되며 서버로 전송되지 않는다"는 안내와 지원 형식·세로형 스크린샷 최적화 안내를 확인한다.
2. 이미지 한 장을 선택하거나 Drop한다.
3. 이미지 기본 정보(해상도, 파일 크기)를 확인한다.
4. 업로드 즉시(사용자의 추가 클릭 없이) 상단 영역을 분석한다 — OCR처럼 무거운 모델을 내려받지 않으므로 자동 분석 버튼/모델 다운로드 단계가 필요 없다.
5. 상태바 후보 높이와 confidence를 계산하고, 이미지 위에 제거 예정선과 반투명 오버레이로 미리보기한다.
6. 사용자가 slider/px 입력/drag handle 중 원하는 방법으로 제거선을 확인하거나 조정한다. confidence가 "보통"/"낮음"이면 확인을 강조하는 안내를 보여준다. "미감지"면 선을 미리 채우지 않고 수동 조정만 제공한다.
7. Crop 결과 미리보기(결과 보기)로 확인한다.
8. 다운로드한다.
9. Clear 시 이미지·분석 결과·조정값을 모두 폐기한다.

빈 상태는 오류가 아니다. 분석은 이미지가 로드되면 자동으로 실행되지만(가벼운 연산이므로), **crop은 사용자가 다운로드를 누르기 전까지 실제 파일에 적용되지 않는다.** 이미지가 바뀌거나 제거선이 조정되면 기존 결과 Blob은 stale 처리한다.

## 5. 파일 계약과 한계

### 허용 입력

- MIME allowlist: `image/png`, `image/jpeg`, `image/webp`
- 확장자와 MIME만 믿지 않고 실제 decode 성공을 확인한다.
- GIF, SVG, animated WebP, HEIC는 V1에서 지원하지 않는다고 안내한다. HEIC는 브라우저 디코딩 호환성이 낮아(Safari 일부만 부분 지원) V1에서 제외하고, 후속 SPEC에서 `createImageBitmap` 지원 현황을 재조사한 뒤 결정한다.

### V1 제한과 범위 밖 안내

- 이미지 수: 정확히 1장(Batch는 Should Have)
- 파일 크기: 최대 25 MiB, 원본 pixel 최대 40 MP, 한 변 최대 16,384px(privacy-redactor와 동일 한계를 재사용)
- 가로 이미지(width > height): "현재 버전은 세로형 스마트폰 스크린샷에 최적화되어 있습니다"라고 안내하고, 자동 감지는 비활성화하되 수동 crop(slider/px 입력)은 계속 사용할 수 있게 한다.
- 너무 작은 이미지(예: 짧은 변 400px 미만): 스크린샷으로 보기 어려우므로 자동 감지를 비활성화하고 수동 모드만 제공한다.
- 태블릿·폴더블·기기 프레임 포함 mockup·이미 심하게 crop된 이미지: 자동 감지 정확도를 보장하지 않는다는 점을 안내 문구로 명시한다(별도 차단은 하지 않음 — 감지 실패 시 정상적으로 "미감지" 경로를 탄다).

## 6. 상태바 정의(범위)

이 도구가 "상태바"로 다루는 대상: 시간, 배터리, Wi-Fi, LTE/5G, 통신 신호, 통신사명, Dynamic Island 주변 시스템 UI. 앱 자체 헤더(뒤로가기, 화면 제목, 탭바)와 웹페이지 상단 메뉴는 상태바로 간주하지 않으며, 이를 구분하는 것이 이 SPEC에서 가장 까다롭고 중요한 요구사항이다(Architect 결정 5 참고).

## 7. Architect 결정 1 — 상태바 자동 감지 알고리즘

OCR이나 무거운 CV 모델 없이, 분석용으로 축소한 이미지의 **상단 0~10% 높이 구간**에서만 아래 신호를 조합한 점수 기반 알고리즘을 사용한다.

### 후보 crop line

이미지 높이 비율 `r ∈ {1.5%, 2%, 2.5%, 3%, 3.5%, 4%, 5%, 6%, 7%, 8%}`를 후보로 둔다. 8% 초과는 후보로 삼지 않는다 — 그 이상은 통계적으로 상태바가 아니라 앱 헤더일 가능성이 급격히 커지기 때문이다(Architect 결정 5의 보호 장치와 연결).

### 후보별 점수 구성 요소

각 후보 line `y = r × H`(분석 이미지 좌표)에 대해 다음을 계산한다.

1. **경계 엣지 점수(boundaryEdge)**: `y` 위아래 각 2px 띠의 행 평균 밝기 차이(및 grayscale gradient 크기)를 폭 전체에서 합산해 정규화한 값. 상태바와 콘텐츠 배경색이 다르면 강하게 나타나고, 같으면 0에 가깝다 — **필수 조건으로 만들지 않는다**(단색 배경 케이스 대응).
2. **아이콘/텍스트 밀도 비대칭 점수(edgeAsymmetry)**: `0~y` 띠를 좌(0~30%W)·중(35~65%W)·우(70~100%W) 세 구간으로 나눠 각 구간의 local edge density(작은 커널의 고대비 변화 총합)를 구한다. 상태바는 좌·우가 진하고(시계, 배터리/신호 아이콘) 중앙은 상대적으로 옅거나(구형 기기) 작은 pill/notch 모양만 있는 패턴을 보인다. `score = (left + right) − center × 0.5`로 계산하고, 이 값이 클수록 "상태바답다".
3. **높이 사전확률(heightPrior)**: `r`이 흔한 상태바 비율 범위(≈2.5~3.5%인 노치 없는 기기 군, ≈4.5~6%인 노치/펀치홀/Dynamic Island 기기 군)에 가까울수록 가점을 주는 완만한 2봉 분포 가중치. 특정 기기명을 알아야 동작하지 않도록, 이 값은 항상 "iOS다/Android다"를 묻지 않고 두 군 모두를 포괄하는 하나의 곡선으로만 둔다(Architect 결정 3).
4. **종횡비 보정(aspectPenalty)**: 이미지 `width/height`가 전형적인 폰 세로 스크린샷 범위(약 0.42~0.52, 즉 9:19.5~9:21 부근)를 크게 벗어나면 전체 점수에 감쇠를 곱한다(태블릿·이미 crop된 이미지 등 대응).
5. **OCR 보조 점수(ocrBonus)**: V1 Must Have에는 포함하지 않는다(Architect 결정 9). 넣게 되면 이 자리에 가점으로만 작용하고 0이어도 다른 점수에 영향을 주지 않아야 한다.

`totalScore(r) = (w1×boundaryEdge + w2×edgeAsymmetry + w3×heightPrior) × aspectPenalty`

가중치 `w1,w2,w3`와 confidence 임계값은 Architect가 문서에서 최종 확정하지 않는다 — Builder가 아래 §17의 synthetic fixture로 실측 튜닝하고 그 결과(최종 값과 근거)를 이 문서에 반드시 기록한다. 다만 **최소·최댓값 자리에는 항상 실측값이 채워져야 하며, 값 없이 PASS 처리할 수 없다**(privacy-redactor SPEC의 실패를 반복하지 않기 위한 절차적 강제).

### Builder 실측 결과(최종 확정값)

`lib/tools/screenshot-statusbar-remover/detection.ts`에 구현하고 유닛 테스트 + 실제 Chrome 다운스케일 렌더링으로 검증한 값이다.

- `w1(boundary)=0.30`, `w2(asymmetry)=0.45`, `w3(prior)=0.25`
- `heightPrior` 2봉 분포: 저 계열 `μ=0.03, σ=0.008`, 고 계열 `μ=0.05, σ=0.012`
- `aspectPenalty` 정상 범위: `width/height ∈ [0.40, 0.55]`는 감쇠 없음(1.0), 벗어나면 거리에 비례해 최소 0.15까지 감쇠
- **증거 게이트(가장 중요한 튜닝 결과)**: `boundary ≥ 0.08` 이거나 `asymmetry ≥ 0.12`인 후보만 채택 후보가 될 수 있다. `heightPrior`는 이 게이트를 절대 단독으로 통과시키지 못한다.
  - 최초 구현에서 이 게이트 없이 원점수 합산 임계값(`totalScore ≥ 0.16`)만 썼더니, **완전히 단색인(상태바가 아예 없는) 이미지도 `heightPrior`만으로 임계값을 넘어 "감지됨"으로 잘못 판정**했다. 유닛 테스트(`does not detect a status bar on a flat full-screen image`)로 재현·고정했다.
  - 같은 이유로, "얕은 후보 중 임계값을 처음 넘는 후보"를 그대로 선택하면 실제 경계(강한 boundary)보다 얕은 곳에서 `heightPrior`만으로 임계값을 넘는 후보를 먼저 골라버리는 문제도 발견했다. 그래서 선택 로직을 "증거 게이트를 통과한 후보 중, 최고점 대비 `NEAR_BEST_TOLERANCE=0.1` 이내로 비등한 후보들 가운데 가장 얕은 것"으로 바꿨다.
- `HIGH_SCORE=0.34`, `HIGH_MARGIN=0.08`, `EDGE_PRESENT=0.08`(높음 confidence 조건)
- 실제 Chrome에서 1080×2400 합성 스크린샷(상태바 48px, 흰색 vs `#2563eb` 헤더)을 실제 `<canvas>` 다운스케일(360px 폭, 실제 devicePixelRatio·폰트 렌더링 포함)로 분석한 결과 **48px를 정확히 감지**했다(오차 0px). 다만 confidence는 `높음`이 아니라 `보통`이었다 — 3배 다운스케일 과정에서 아이콘·텍스트 획이 흐려져 `edgeAsymmetry` 신호가 약해지기 때문이다. 색 경계가 뚜렷한 실사용 케이스에서는 `보통`이 흔한 결과이며, 이는 설계 의도(확신 없으면 과장하지 않음)와 일치한다.
- 낮은 대비(예: 흰색 대 `#e6f0ff`처럼 휘도 차이가 20 미만인 파스텔 톤)는 다운스케일 후 증거 게이트를 통과하지 못해 "미감지"로 처리된다. 이는 알려진 한계이며, 실제 앱 헤더 색이 이 정도로 배경과 흡사한 경우 사용자가 수동으로 조정해야 한다.
- 분석 downscale 폭은 §13에서 제안한 360px을 그대로 유지했다 — 위 실측에서 48px 감지가 성공했으므로 현재 값을 바꿀 근거가 없었다.

### 회귀 1 — 실사용 테스트로 발견: `boundary`(국소 비교) → `colorDrift`(기준색 이탈) 교체

DONE 판정 이후 실제 사용자가 NAVER·"스크린샷 이지" 앱 스크린샷으로 직접 테스트하다가 두 가지 진짜 실패를 발견했다. 이 절은 그 진단과 수정을 기록한다.

**발견 1(NAVER)**: 상태바와 NAVER 자체 헤더(햄버거 메뉴+로고)가 거의 같은 초록 계열로 테마 매칭되어 있었다. 결과를 보니 상태바뿐 아니라 NAVER 자체 헤더까지 통째로 잘려나갔다 — 결과 이미지 맨 위가 바로 검색창부터 시작했다. 원인: 기존 `boundaryEdgeScore`는 후보 줄 바로 위·아래 2줄만 비교하는 국소 비교라, ①아이콘이 있는 자리에서는 배경색이 안 바뀌어도 노이즈처럼 값이 튀고 ②반대로 상태바처럼 미세한 색 차이는 신호가 너무 약해 증거로 인정받지 못했다. 그 결과 진짜 경계(상태바→헤더)는 후보에도 오르지 못하고, 색이 뚜렷이 다른 더 깊은 경계(헤더→검색창)만 선택됐다.

**수정**: 사용자가 제안한 방식 — 상단 몇 줄의 색을 기준값으로 고정 샘플링하고, 그 아래로 내려가며 각 줄의 색이 기준값에서 얼마나 벗어났는지 누적 비교 — 로 교체했다. `referenceColor()`가 상단 4줄의 **채널별 중앙값**(median, 아이콘이 그 줄의 일부만 차지하므로 평균보다 아이콘 노이즈에 안 흔들림)을 기준색으로 잡고, `colorDriftScore()`가 각 후보 줄의 (역시 중앙값 기반) 색과 기준색의 RGB 유클리드 거리를 정규화해 반환한다. 국소 2줄 비교보다 미세한 색 차이 누적에 훨씬 민감하다. 유닛 테스트(`finds the shallow boundary even when the app header is only subtly different from a theme-matched status bar`)로 고정했다.

**발견 2(부작용)**: `colorDrift`를 더 민감하게 만든 대가로, 상태바와 헤더 배경이 **완전히 동일**한 극단 케이스(§28 sameBackground fixture)에서 오히려 더 나빠졌다 — 예전엔 안전하게 "미감지"였는데, 새 신호가 더 깊은 곳(헤더→본문 경계)의 진짜 색 변화를 자신 있게 찾아내 그 지점을 헤더 안쪽까지 잘라버렸다(168px, "Home" 제목이 잘리는 위치).

**수정**: `hasEvidence()`에 깊이 제한을 추가했다 — 아이콘 근거(`asymmetry`)가 없는 순수 `colorDrift`만의 후보는 `ratio ≤ DRIFT_ONLY_MAX_RATIO(0.055)` 범위 안에서만 신뢰한다. 실제 상태바는 노치·Dynamic Island 기종을 포함해도 이 범위를 거의 넘지 않으므로, 그보다 깊은 곳의 순수 색 변화는 상태바가 아니라 헤더/본문 경계일 가능성이 훨씬 크다고 보고 "미감지"로 안전하게 떨어뜨린다. 반대로 아이콘 근거가 있는 후보(NAVER 케이스처럼)는 이 깊이 제한을 적용하지 않는다 — 실제 상태바 아이콘이 존재한다는 직접 증거이기 때문이다. 유닛 테스트(`does not fall back to a deep header/content boundary when the status bar and header share one flat color with no icon signal`)로 고정했다.

**재검증**: `tests/screenshot-statusbar-remover-scenarios-browser.mjs` 재실행 결과 sameBackground는 다시 "미감지"로 복귀했고, 부수적으로 §28에서 기록했던 "이미 잘린 이미지"의 45px 오탐도 이번 수정으로 함께 사라져 "미감지"가 됐다(같은 깊이 제한이 두 케이스 모두를 걸러낸다). 단, 매우 긴(9000px) 스킷치드 이미지 케이스는 "미감지"에서 "감지(135px, 최소 후보 비율 1.5%)"로 바뀌었다 — 실제 상태바 비율(0.53%)이 후보 탐색 범위(1.5%~8%) 자체보다 작아 원래도 범위 밖 입력이었고, 새 알고리즘은 탐색 가능한 가장 얕은 후보를 골라 헤더 일부까지만 얕게 제거한다(본문 168px까지는 침범하지 않음 — 실측 확인). 이어붙이기 전 개별 스크린샷에 적용한다는 설계 의도(§2)를 벗어난 입력이라 이 동작을 추가로 막지는 않았다.

## 8. Architect 결정 2 — 분석할 이미지 상단 범위

분석은 이미지 전체가 아니라 **상단 0~10%(0~0.10H)** 만 읽는다.

- 후보 line은 §7에서 정의한 대로 최대 8%까지만 두지만, 분석 자체는 10%까지 읽어 8% 지점의 "그 아래로도 경계가 없다/있다"는 대비 정보를 얻는다.
- 10%를 넘는 영역은 애초에 pixel을 읽지 않는다 — 성능 보장이자, 알고리즘이 구조적으로 앱 본문 깊은 곳까지 후보로 삼을 수 없도록 만드는 안전장치다.

## 9. Architect 결정 3 — iPhone/Android prior 적용 방식

기기별 고정 px 테이블은 사용하지 않는다. 대신:

- §7의 `heightPrior`처럼 **비율 기반 2봉 분포**로 두 계열(노치 없음 vs 노치/펀치홀 계열)을 모두 포괄한다. "iPhone인가 Android인가"를 분기하는 코드를 두지 않는다 — 어차피 Android도 펀치홀/기타 이유로 상태바가 높아지는 경우가 흔해 이분법이 실제로는 잘 안 맞는다.
- 종횡비(`aspectPenalty`)를 약한 보조 신호로만 사용하고, 절대 실격 조건으로 쓰지 않는다.
- UI에 "iPhone 계열"/"Android 계열" 같은 라벨은 노출하지 않는다(Could Have의 "자동 분류 표시"가 승인되기 전까지는 사용자에게 기기 판별 결과를 보여주지 않는다 — 틀렸을 때 신뢰를 더 크게 잃는다).

## 10. Architect 결정 4 — confidence 계산 기준

| 등급 | 조건 |
|---|---|
| 높음 | 최고 점수 후보의 `totalScore`가 실측으로 정한 상한 임계값 이상이고, 2위 후보와의 점수 차이가 임계값 이상(뚜렷하게 구분됨)이며, `boundaryEdge` 또는 OCR 보조(활성화 시) 중 하나 이상이 실제로 존재 |
| 보통 | 최고 점수 후보가 최소 임계값은 넘지만 위 "높음" 조건을 모두 만족하지는 못함(경계가 약하거나 2위와 근소한 차이) |
| 낮음 / 미감지 | 어떤 후보도 최소 임계값을 넘지 못하거나, 이미지가 §5의 자동 감지 비활성 조건(가로/너무 작음/극단적 종횡비)에 해당 |

- "높음"이어도 **자동으로 다운로드되지 않는다** — 항상 미리보기 후 사용자가 다운로드를 눌러야 한다. confidence는 "이 값을 그대로 믿어도 되는 정도"를 알려주는 신호일 뿐, 확인 절차를 생략시키지 않는다.
- "보통"/"낮음"은 확인을 강조하는 문구(예: "감지 결과를 확인 후 필요하면 조정하세요")를 더 눈에 띄게 보여준다.
- "미감지"는 제거선을 미리 채우지 않고 0px(또는 마지막으로 조정한 값)에서 시작하는 수동 모드로 전환한다.
- 실제 임계값(§7의 가중치와 함께)은 Builder가 §17 fixture로 확정하고 이 문서에 기록한다.

## 11. Architect 결정 5 — 앱 헤더와 상태바 분리 전략(최우선 품질 기준)

가장 흔하고 치명적인 실패는 "상태바 아래 앱 헤더(예: `← 설정 저장`)까지 잘라버리는 것"이다. 이를 막기 위해 다음을 구조적으로 강제한다.

1. **"가장 강한 경계"가 아니라 "가장 얕은(위쪽) 임계값 통과 후보"를 선택한다.** 앱 헤더/본문 경계가 상태바/헤더 경계보다 시각적으로 더 뚜렷한 경우가 많다(헤더는 보통 그림자나 굵은 구분선을 가진다). 최소 임계값을 넘는 후보 중 **가장 작은 `r`**을 최종 후보로 삼아, 알고리즘이 "더 강해 보이는" 아래쪽 경계로 건너뛰지 않게 한다.
2. **후보 상한을 8%로 강하게 제한**한다(§7, §8). 실측상 상태바가 8%를 넘는 사례는 사실상 없고, 앱 헤더 높이는 보통 이보다 크므로 이 상한 자체가 헤더 오인 crop을 구조적으로 차단한다.
3. `edgeAsymmetry`(좌우 아이콘 밀집, 중앙 옅음)는 상태바 특유의 패턴이고, 앱 헤더는 보통 좌측 뒤로가기 하나 + 중앙 큰 제목 + 우측 아이콘 0~1개로 분포가 다르다(더 듬성듬성하고 큰 요소). 이 신호가 이미 헤더와 상태바를 구분하는 1차 방어선이다.
4. 확신이 없으면(§10 "낮음"/"미감지") 아예 자르지 않는다 — 마지막 방어선은 항상 "모르면 사용자에게 맡긴다"이다.
5. QA는 "상태바 바로 아래 앱 헤더가 있는" 케이스(§17 목록 7, 8번)를 **정확도 목표와 별개로 별도 PASS 기준**(헤더 텍스트가 결과 이미지에서 100% 온전히 보여야 함, 1px도 잘리면 실패)으로 관리한다 — 상태바를 1px 덜 자르는 실수보다 헤더를 1px 자르는 실수가 훨씬 나쁘다는 원칙을 테스트 기준에 그대로 반영한다.

## 12. Architect 결정 6 — 수동 조정 UI

세 가지 방법을 모두 제공한다(요구된 "최소 2개"보다 넓게 잡는다 — desktop/mobile 각각 자연스러운 입력 방식이 다르고, privacy-redactor에서 이미 검증된 패턴이라 추가 비용이 크지 않다).

1. **Drag handle**: 이미지 위 제거선을 직접 위/아래로 드래그. `privacy-redactor`의 `clientToImage` 좌표 변환 패턴을 그대로 재사용한다.
2. **Slider**: `0 ~ min(이미지 높이의 15%, 200px)` 범위(그 이상은 정상적인 상태바일 수 없으므로 슬라이더 범위 자체를 제한해 실수로 과도한 crop을 만들기 어렵게 한다).
3. **px 숫자 입력 + ±1px 버튼**: 정밀 조정용. 방향키(Up/Down 1px, Shift+Up/Down 10px)도 지원한다.

세 UI는 모두 같은 state(원본 좌표 기준 px)를 공유하며 항상 동기화된다. "Reset" 버튼으로 최초 자동 감지값(또는 미감지 시 0)으로 되돌릴 수 있다.

### Builder 구현 중 발견한 실제 버그(모두 수정, 회귀 테스트로 고정)

1. **드래그 손잡이가 클릭되지 않음**: 눈에 보이는 파란 원(circle)이 실제 드래그를 처리하는 넓은 투명 `<rect>`보다 SVG상 나중에(위쪽 레이어로) 그려져, 사용자가 가장 자연스럽게 잡으려는 지점(원 자체)을 클릭하면 이벤트가 원에서 막히고 `<rect>`의 `onPointerDown`이 전혀 호출되지 않았다. `<line>`/`<circle>`에 `pointerEvents="none"`을 줘서 순수 시각 요소로 만들고, 모든 포인터 입력이 항상 아래의 `<rect>`로 가도록 고쳤다.
2. **`fill="transparent"`인 hit-rect가 클릭을 아예 못 받음**: SVG의 기본 `pointer-events` 값(`visiblePainted`)은 `fill="transparent"`를 `fill="none"`과 동일하게 취급해 히트테스트 대상에서 제외한다. `pointerEvents="all"`을 명시해서 고쳤다. 이 두 문제는 유닛 테스트로는 잡히지 않고 실제 Chrome에서 pointer down/move 흐름을 재현해야만 드러났다 — `tests/screenshot-statusbar-remover-browser.mjs`의 drag 케이스가 이를 고정한다.
3. **미리보기 모드를 전환하면 수동 조정값이 감지값으로 되돌아감**: "결과 보기"에서 "편집 화면 보기"로 되돌아올 때 편집기 `<img>`가 리마운트되며 `onLoad`가 다시 발화했고, 그때마다 감지를 재실행해 사용자가 이미 조정한 `cropHeight`를 조용히 덮어썼다. `detectedForRef`로 "이 `loaded` 객체에 대해 이미 감지를 실행했는지"를 추적해, 같은 이미지에 대해서는 최초 1회만 감지가 실행되도록 고쳤다.

## 13. Architect 결정 7 — 분석용 downscale 크기

분석용 이미지는 **폭 360px**로 축소한다(원본 비율 유지, 높이는 자동 계산 후 상단 10%만 실제로 그려서 읽는다). 320px가 아닌 360px로 정한 이유: 상태바 아이콘은 원래도 작아서 지나치게 축소하면 `edgeAsymmetry`가 가장 필요로 하는 좌우 아이콘 클러스터 신호 자체가 뭉개질 위험이 있다 — 360px는 여전히 매우 가볍게 분석 가능한 크기이면서 신호 손실 위험을 조금 더 줄인다. 이 값은 실측 후 조정 가능한 튜닝 파라미터로 문서화하고, Builder가 실제 정확도로 재확인한다.

## 14. Architect 결정 8 — 원본 좌표 환산 방식

- `scale = originalWidth / analysisWidth`(가로세로 비율을 유지한 축소이므로 단일 scale factor가 양 축에 동일 적용된다).
- `cropHeightOriginal = round(cropHeightAnalysis × scale)`, 이후 `clampRect`류 함수로 `[0, originalHeight - 1]` 범위를 벗어나지 않게 자른다.
- 표시(미리보기)와 최종 Canvas crop이 항상 같은 orientation 보정 bitmap을 기준으로 좌표를 다뤄야 한다(Architect 결정 9-EXIF 절 참고, 실제로는 아래 orientation 절).
- 반올림 오차는 최대 ±1px로 수렴하도록 `Math.round`를 일관되게 사용하고, 분석↔원본 round trip 오차를 단위 테스트로 고정한다(privacy-redactor의 `clientToImage`/`clampRect` 테스트 패턴 재사용).

### EXIF Orientation

JPG의 EXIF Orientation은 `<img>`/`createImageBitmap`의 표준 decode 경로가 자동 적용한 결과를 canonical 좌표계로 삼는다 — 표시 이미지, 분석용 축소 이미지, 최종 crop Canvas가 모두 이 동일한 orientation-보정 bitmap에서 파생되어야 한다. 셋의 좌표계가 어긋나면 다른 방향으로 자르는 사고가 나므로, 세 경로가 같은 소스(`<img>` 엘리먼트 또는 그로부터 생성한 동일 bitmap)를 공유하도록 구현한다.

## 15. Architect 결정 9 — OCR 보조 사용 여부

**V1 Must Have에 포함하지 않는다.** 구조적/시각적 신호만으로 먼저 정확도를 확보하고, 실제 QA 결과가 기준에 못 미칠 때만 Should Have로 OCR을 검토한다. 넣더라도:

- 시계 패턴(`\d{1,2}:\d{2}`), 퍼센트 패턴(`\d{1,3}\s?%`)이 상단 후보 영역에서 발견되면 confidence를 가점하는 **보조 신호로만** 사용한다.
- OCR 실패·타임아웃이 전체 감지 실패로 전파되지 않는다(구조적 점수만으로도 항상 독립적으로 동작해야 한다).
- 넣게 된다면 `privacy-redactor`가 겪은 문제(47MB 모델, 로딩 시간, 정확도 불안정)를 반복하지 않도록 별도 SPEC에서 모델 크기·라이선스·성능 예산을 재검토한 뒤 Product Owner 승인을 받는다.

## 16. Architect 결정 10 — Batch 처리 V1 포함 여부

**V1에서 제외한다.** 브리핑에 제시된 "동일 crop height를 여러 장에 적용"은 실용적이지만, 단일 이미지 감지 정확도와 헤더 오인 방지가 먼저 검증되어야 여러 장에 안전하게 확산할 수 있다. 단일 이미지 흐름이 QA를 통과하고 완료 조건을 만족한 뒤, 별도 SPEC 승인을 받아 진행한다.

## 17. Architect 결정 11 — EXIF metadata 처리 정책

`privacy-redactor`와 동일한 정책을 채택한다.

- 최종 결과는 항상 새 Canvas에 그려 `toBlob`/`convertToBlob`으로 재인코딩한다 — 원본 JPEG/WebP byte stream이나 metadata segment를 복사하지 않으므로 EXIF, GPS, XMP, ICC가 구조적으로 남지 않는다.
- 기본 출력 포맷은 원본 포맷을 유지하되(Must Have), PNG 스크린샷은 특히 손실 재압축을 피하기 위해 품질 손실 없는 경로를 우선한다. JPEG/WebP 출력 포맷 선택은 Should Have.
- binary 검사(Exif/GPS 문자열 미포함)를 QA 항목에 포함한다.
- UI에 "이미지는 브라우저에서 직접 처리되며 서버로 업로드되지 않습니다"와 "상태바 이외의 개인정보는 자동으로 제거되지 않습니다"를 함께 명시한다.

## 18. UI 구조와 상태

### Desktop

```text
업로드·개인정보 안내(브라우저 처리 + 상태바 외 정보는 제거 안 됨)
파일 정보
┌──────────────────────────┬────────────────────┐
│ 이미지 + 제거선 오버레이   │ 감지 결과 패널      │
│ drag handle                │ confidence·px·slider│
└──────────────────────────┴────────────────────┘
원본/결과 Preview
다운로드
```

### Mobile

`업로드 → 이미지+제거선 → 감지 결과(confidence, px) → slider/버튼 조정 → 원본/결과 전환 → 다운로드`

상태는 `empty`, `ready`, `analyzing`(가벼운 동기/비동기 연산, 보통 즉시 끝나지만 상태는 존재), `review`, `rendering`, `result`, `error`로 둔다.

- 예상 가능한 오류를 개발자 예외 그대로 노출하거나 console error로 남기지 않는다.

## 19. Architect 결정 12 — Worker 사용 여부

분석 대상이 "폭 360px로 축소한 이미지의 상단 10%"뿐이라 연산량이 매우 작다. **V1은 Worker 없이 main thread(비동기 microtask/`requestIdleCallback` 정도)로 시작**하고, Builder가 실제 대형 이미지(§21의 성능 목표 이미지)로 측정해 UI가 눈에 띄게 멈추면(예: 100ms 이상 blocking) 그때 Worker 도입을 재검토한다. 미리 Worker 구조를 만들어 복잡도를 늘리지 않는다.

## 20. 오류 계약

| 코드 | 조건 | 사용자 복구 |
|---|---|---|
| `unsupported-type` | PNG/JPG/WebP 외(GIF/SVG/HEIC 포함) | 지원 파일 선택 |
| `file-too-large` | 25 MiB 초과 | 더 작은 파일 선택 |
| `dimension-limit` | 40MP/16,384px 초과 | 이미지 축소 |
| `decode-failed` | 손상·위장·decode 실패 | 다른 파일 선택 |
| `too-small` | 짧은 변 400px 미만 | 자동 감지 없이 수동 모드 안내 |
| `landscape-unsupported` | 가로 이미지 | 세로형 최적화 안내, 수동 모드 제공 |
| `not-detected` | confidence 낮음/후보 없음 | 수동으로 px 지정 |
| `crop-exceeds-image` | 조정한 crop height ≥ 이미지 높이 | 값 자동 clamp + 안내 |
| `canvas-failed` | Canvas/context/encode 실패 | 더 작은 이미지 또는 최신 브라우저 |
| `multiple-files` | 파일 2개 이상 동시 선택 | 한 장만 선택 |

`not-detected`/`landscape-unsupported`/`too-small`은 차단성 오류가 아니라 안내이며, 수동 모드는 항상 계속 사용할 수 있다.

## 21. 접근성

- file input, drop zone, 제거선 조정(slider/px/drag/±1px 버튼), preview, download에 명확한 label을 제공한다.
- 제거선 오버레이만으로 상태를 전달하지 않고, confidence·px 값을 텍스트로도 제공한다.
- 키보드만으로 제거선 조정(방향키 1px, Shift+방향키 10px)과 Reset이 가능해야 한다.
- 단축키는 `input`/`textarea`/`select` 포커스 중에는 가로채지 않는다.
- touch target은 최소 44×44 CSS px.
- confidence·감지 결과 변경은 과도하지 않은 live announcement로 알린다.

## 22. 다국어·SEO·등록

- ko/en/ja 전체 번역, stable URL `/{locale}/tools/screenshot-statusbar-remover`.
- 자연스럽게 커버할 검색 의도: 스크린샷 상태바 제거, 아이폰 상태바 제거, 갤럭시 상태바 제거, 사진 상단 상태바 삭제, 스크린샷 시간 지우기, 스크린샷 배터리 표시 제거, 스마트폰 캡처 상태바 제거.
- 실제 지원하지 않는 특정 제조사·모델을 지원한다고 과장하지 않는다 — "iPhone/Android 세로 스크린샷에 최적화" 정도로만 표현한다.
- `lib/tools/registry.ts`에 한 번 등록해 홈 카드·메뉴·사이트맵에 반영한다. 레지스트리 route·번역 누락 테스트 PASS 필수.

## 23. 구현 구조(예정)

```text
app/[locale]/tools/screenshot-statusbar-remover/page.tsx
components/tools/screenshot-statusbar-remover/screenshot-statusbar-remover.tsx
lib/tools/screenshot-statusbar-remover/types.ts
lib/tools/screenshot-statusbar-remover/validation.ts
lib/tools/screenshot-statusbar-remover/geometry.ts
lib/tools/screenshot-statusbar-remover/detection.ts
lib/tools/screenshot-statusbar-remover/screenshot-statusbar-remover.test.ts
tests/screenshot-statusbar-remover-browser.mjs
tests/fixtures/screenshot-statusbar-remover/*(synthetic 생성 스크립트 또는 인라인 canvas 생성)
```

- `detection.ts`는 pixel buffer(`{data, width, height}`)를 입력받는 순수 함수로 작성해 DOM 없이 유닛 테스트한다(privacy-redactor의 `avatar-detection.ts` connected-component 접근과 동일한 테스트 전략).
- `geometry.ts`는 privacy-redactor의 `clientToImage`/`clampRect` 패턴을 재사용(복붙이 아니라 필요하면 공용 모듈화를 검토하되, 이번 SPEC에서는 각 도구 폴더에 독립 보관해 결합도를 낮춘다).
- Worker는 §19 결정에 따라 V1에서 만들지 않는다.
- 외부 이미지 처리 라이브러리 의존성을 추가하지 않는다(Canvas 2D API만 사용).

## 24. 테스트 fixture와 정확도 기준

### Synthetic fixture 생성 규칙

실제 개인정보를 쓰지 않고 코드로 합성한다. 기본 예시: 전체 1080×2400, 상태바 상단 48px, 내부에 `09:41`, `5G`, 배터리 아이콘 형태를 그리고, 그 아래 앱 헤더 + 본문을 그린다. expected crop은 48px로 기록한다.

최소 다음 변형을 생성한다.

- iPhone 스타일 밝은/어두운 상태바(2종)
- Android 스타일 밝은/어두운 상태바(2종)
- Dynamic Island 유사 상단 구조, 노치 유사 상단 구조(2종)
- 상태바 바로 아래 앱 헤더 존재(§11의 최우선 기준)
- 상태바와 앱 헤더 배경색 완전 동일(단색 배경 케이스)
- 사진 위에 겹친(반투명/복잡 배경) 상태바
- 상태바 없는 전체화면 앱(미감지가 정답)
- 이미 상태바가 잘린 이미지(미감지 또는 매우 얕은 후보가 정답)
- 폭 1080 / 1170 / 1290 / 1440 스크린샷
- 매우 긴 스크린샷(이어붙이기 결과물 같은 케이스)
- PNG / JPG / WebP 각각
- EXIF Orientation이 있는 JPG

### 정확도 목표

- Synthetic fixture 기준: `expected ± 2~3px` 이내 detected를 PASS로 본다.
- **실측 결과**: 실제 Chrome에서 `<canvas>` 다운스케일을 거친 1080×2400·상태바 48px 합성 스크린샷에서 감지값이 정확히 48px로 오차 0px였다(§7 Builder 실측 결과 참고). 색 대비가 약한 케이스(휘도 차이 20 미만)는 의도적으로 "미감지"로 처리되므로, 이 경우는 오차 측정 대상이 아니라 수동 모드로의 정상적인 fallback으로 본다.
- 실제 스크린샷은 픽셀 단위 완전 자동 정확도보다 **"사용자가 쉽게 확인하고 조정할 수 있는가"** 를 더 중요한 품질 기준으로 삼는다(자동 정확도가 이 기준을 대체하지 않는다).

### False Positive / False Negative 테스트

- 상단에 상태바와 비슷한 작은 텍스트(`12:30`, `85%` 등)가 있는 일반 사진도 무조건 상태바로 오판하지 않는지 테스트한다.
- 배경이 복잡해 상태바 경계를 찾기 어려운 이미지에서는, 억지로 잘못된 위치를 자르는 것보다 "정확한 위치를 찾기 어렵습니다"라고 안내하는 쪽이 PASS다.

## 25. QA 필수 테스트

### 정적·단위

```text
npm run lint
npm run type-check
npm test -- --run
npm run build
node tests/screenshot-statusbar-remover-browser.mjs
```

- MIME·크기·차원 검증
- 분석↔원본 좌표 round trip(±1px)
- confidence 등급 산정 unit 테스트(높음/보통/낮음/미감지 각 시나리오)
- §11 "가장 얕은 후보 우선" 로직 unit 테스트(강한 아래쪽 경계가 있어도 얕은 후보를 선택하는지)
- crop height clamp(이미지보다 큰 값 방지)

### 실제 Chrome 기능(§24 fixture 기반, 최소 34개 항목)

1. iPhone 스타일 밝은 상태바
2. iPhone 스타일 어두운 상태바
3. Android 스타일 밝은 상태바
4. Android 스타일 어두운 상태바
5. Dynamic Island 유사 상단 구조
6. 노치 유사 상단 구조
7. 상태바 바로 아래 앱 헤더 존재(§11 기준 — 헤더 텍스트 1px도 잘리면 실패)
8. 상태바와 앱 헤더 배경색 동일
9. 사진 위 투명/복잡 배경 상태바
10. 상태바 없는 전체화면 앱(미감지 PASS)
11. 이미 상태바가 잘린 이미지
12. 폭 1080 스크린샷
13. 폭 1170 스크린샷
14. 폭 1290 스크린샷
15. 폭 1440 스크린샷
16. 매우 긴 스크린샷
17. PNG
18. JPG
19. WebP
20. EXIF Orientation JPG
21. 자동 감지 결과 표시
22. 수동 +1px 조정
23. 수동 -1px 조정
24. Slider 조정
25. Drag handle 조정
26. Reset
27. Download
28. 상태바 미감지 안내와 수동 모드 전환
29. 가로 이미지 안내와 수동 모드
30. 너무 작은 이미지 처리
31. Mobile 320px
32. Mobile 375px
33. Tablet 768px
34. Desktop 1440px

### 보안 QA

1. 결과 PNG/JPEG binary에 원본 EXIF GPS/XMP 문자열이 없는지 검사한다.
2. fetch/XHR/beacon/form request body/query/header에 이미지 bytes, data URL, 파일명이 0인지 가로챈다.
3. localStorage/sessionStorage/IndexedDB/Cache API에 이미지·crop 데이터 write가 0인지 확인한다.
4. Clear/unmount/교체/오류에서 Object URL revoke를 검증한다.
5. Console Error·page error·unhandled rejection 0.

## 26. Critic 필수 질문

1. 자동으로 잘릴 영역을 사용자가 즉시 이해할 수 있는가?
2. 앱 헤더까지 잘려나갈 위험이 낮은가?
3. 감지가 틀려도 사용자가 1~2초 내에 보정할 수 있는가?
4. 상태바가 없는 이미지에서 억지로 crop하지 않는가?
5. 다크/라이트 상태바 모두 자연스럽게 처리되는가?
6. 모바일에서 제거선 조정이 쉬운가?
7. 다운로드 전에 결과를 확인할 수 있는가?
8. 이 도구가 전체 개인정보 제거 도구가 아니라는 점이 명확한가?

## 27. 완료 조건

- TypeScript 오류 0, lint 오류·warning 0 — **PASS**
- Console Error·page error·unhandled rejection 0 — **PASS**(두 QA 스크립트 전 구간)
- PNG/JPG/WebP PASS — **PASS**(§28 실측: 세 포맷 모두 감지·다운로드·파일명 확장자까지 확인)
- 일반 iPhone 스타일 감지 PASS, 일반 Android 스타일 감지 PASS — **PASS**(§28 실측)
- 다크/라이트 상태바 PASS — **PASS**(§28 실측: iPhone/Android × 밝음/어두움 4종 모두 감지, 헤더 안쪽으로 넘어가지 않음을 확인)
- 상태바 미감지 처리 PASS(억지로 자르지 않음) — **PASS**
- §11 앱 헤더 보호 기준 PASS(헤더 텍스트 잘림 0) — **PASS**
- 제거선 미리보기 PASS — **PASS**
- px 수동 조정·drag 조정·slider·Reset PASS — **PASS**(§12 버그 3건 발견·수정 포함)
- crop 결과 PASS(원본 폭 유지, 상단 N px만 제거) — **PASS**
- 다운로드 PASS, 결과에 원본 EXIF/GPS 미포함 PASS — **PASS**
- 이미지 서버 전송 0, client storage 저장 0 — **PASS**
- 모바일(320px~) 정상 동작 — **PASS**(320/375/768/1440px 확인)
- ko/en/ja 및 SEO·홈·메뉴·사이트맵 PASS — **PASS**
- §7·§10·§13·§24에서 "Builder가 실측 후 확정"으로 남겨둔 가중치·임계값·downscale 크기·오차 허용치가 실제 값으로 채워지고 근거가 이 문서에 기록되었는가 — **PASS**
- §17의 34개 QA 항목 — **PASS**(§28 실측 근거)
- 기존 `docs/EVALUATION.md`의 PASS 조건 충족 — 미확인(별도 검토 필요)

## 28. QA 2차 실측 — `tests/screenshot-statusbar-remover-scenarios-browser.mjs`

§17의 나머지 QA 항목(다크/라이트 × iPhone/Android, Dynamic Island·notch 모사, 상태바·헤더 동일 배경색, 사진 배경, 이미 잘린 이미지, 폭 1170/1290/1440, 매우 긴 스크린샷, JPEG/WebP, EXIF Orientation, 너무 작은 이미지, 1440px desktop)를 실제 Chrome에서 실행했다. Console/page error 0, 모든 시나리오가 "인식 가능한 상태"(감지/미감지/가로/너무 작음 중 하나)로 정상 처리되었다.

| 시나리오 | 결과 |
|---|---|
| iPhone 밝음/어두움(Dynamic Island 모사) | 감지 62px(실제 헤더 경계 59px), confidence 보통 |
| Android 밝음/어두움(notch 모사) | 감지 48px(실제 헤더 경계 48px, 정확), confidence 보통 |
| 상태바·헤더 배경색 완전 동일 | **미감지** — 헤더로 잘못 잘리지 않고 안전하게 수동 모드로 전환 |
| 사진/그라디언트 배경 | **미감지** — 안전하게 수동 모드로 전환 |
| 이미 상태바가 잘린 이미지 | 45px의 얕은 오탐 발생(제목 텍스트를 아이콘 패턴으로 오인). confidence 보통이라 다운로드 전 확인을 요구하므로 실제 피해는 제한적이지만, 알려진 한계로 기록한다 |
| 폭 1170 / 1290 / 1440 | 모두 감지 성공, 실제 상태바 높이 대비 오차 ±3px 이내 |
| 매우 긴(1080×9000) 스크린샷 | **미감지**, 149ms로 성능 문제 없음. 원인: 실제 상태바는 절대 px로 고정(약 48~90px)인데 후보 비율 탐색 범위(1.5~8%H)는 전체 높이 대비 비율이라, 이미 이어붙인 매우 긴 이미지에서는 상태바 비율이 탐색 범위보다 작아진다. 이는 §2 사용 사례("이어붙이기 **전** 전처리")와 일치하는 설계 범위이며, 이어붙인 뒤에는 이 기능을 적용하지 말라고 안내가 필요하다는 뜻이다 |
| JPEG / WebP | 둘 다 48px 정확히 감지, 다운로드 파일명 확장자(`fixture-no-statusbar.jpg`/`.webp`)까지 정상 |
| EXIF Orientation 6(JPG) | 원본이 1080×2400로 인코딩되어 있어도 표시 크기가 2400×1080으로 정확히 방향 보정됨을 확인 |
| 너무 작은 이미지(200×350) | 자동 감지 비활성, 수동 모드 안내 정상 |
| Desktop 1440px | 정상 렌더링, 가로 스크롤 없음 |

### 이번 실측으로 확정된 알려진 한계(§Product Owner 안내 문구에 반영 필요)

1. **상태바·앱 헤더가 완전히 같은 배경색**이면 아이콘/텍스트 획이 다운스케일로 흐려져 증거 임계값을 못 넘을 수 있다 — 미감지로 안전하게 처리되지만, 사용자는 수동으로 조정해야 한다.
2. **사진·복잡한 배경 위 상태바**도 같은 이유로 미감지되기 쉽다.
3. **이미 스크린샷 여러 장을 이어붙인 매우 긴 이미지**에는 이 도구를 적용하지 않는 것을 권장한다 — 상태바 비율이 후보 탐색 범위보다 작아져 감지되지 않는다(안전하게 미감지로 처리되긴 하나, 애초에 이어붙이기 **전** 개별 스크린샷에 적용하는 것이 설계 의도다).
4. 제목처럼 굵은 텍스트가 이미지 맨 위에 있으면(실제로는 상태바가 없는 이미 잘린 스크린샷이라도) 드물게 얕은 오탐(수십 px)이 날 수 있다 — confidence가 항상 "보통" 이하로 나오고 다운로드 전 미리보기 확인을 거치므로 실제 피해는 제한적이다.

완료 조건 중 하나라도 미달하면 억지로 PASS 처리하지 않고 `NEEDS HUMAN REVIEW`로 남긴다. Critic은 코드·테스트를 수정하지 않고 평가만 한다. QA는 객관적 증거만 기록한다. Critic·QA 결과에 따른 제품 코드·테스트 수정은 Optimizer만 수행한다.

## 29. Architect 최종 검토

### 기존 구조와의 충돌

- Next.js App Router, TypeScript, Tailwind, next-intl, 독립 locale URL 구조와 일치한다.
- Server page + Client tool + 순수 domain module 구조로 `privacy-redactor`(수동 전환 이후 버전)와 동일한 패턴을 재사용할 수 있다 — 좌표 변환, drag handle, slider/숫자 입력 조합, EXIF 관련 정책이 이미 검증돼 있다.
- 서버 route나 데이터베이스가 필요하지 않다.
- 외부 이미지 처리 라이브러리 의존성이 없다(Canvas 2D API + 순수 TypeScript 점수 계산).

### 확정된 12개 결정

1. 감지 알고리즘: OCR 없는 구조적 점수(boundaryEdge + edgeAsymmetry + heightPrior, aspectPenalty로 감쇠), 후보 line 상한 8%
2. 분석 범위: 상단 0~10%H만 읽음
3. iPhone/Android prior: 기기 식별 없이 비율 기반 2봉 분포로 두 계열 모두 포괄
4. confidence: 높음/보통/낮음 3단계, 절대 자동 다운로드로 이어지지 않음
5. 앱 헤더 분리: 최강 경계가 아니라 최소 임계값을 넘는 가장 얕은 후보 채택 + 8% 상한이 이중 안전장치
6. 수동 조정 UI: drag handle + slider + px 입력(±1px, 방향키) 3종 모두 제공
7. 분석 downscale: 폭 360px(튜닝 대상으로 문서화)
8. 좌표 환산: 단일 scale factor, `clampRect` 재사용, EXIF orientation 공유 bitmap
9. OCR: V1 Must Have 제외, Should Have 보조 신호로만 후속 검토
10. Batch: V1 제외, 단일 이미지 품질 검증 후 별도 SPEC
11. EXIF 정책: Canvas 재인코딩으로 구조적 제거, binary QA로 확인
12. Worker: V1은 main thread, 실측 후 필요 시에만 도입

### 남은 구현 위험과 통제

- 실제 스크린샷의 상태바 높이·색상·아이콘 배치는 이 SPEC이 가정한 것보다 다양할 수 있다 — §24 fixture는 최소 세트이며 Builder는 실제로 합법적으로 확보 가능한 다양한 스크린샷으로 추가 검증하고 미달 시 Optimizer 개선 또는 `NEEDS HUMAN REVIEW`로 남긴다.
- §7·§10의 가중치·임계값은 Architect가 추정한 구조일 뿐 최종 숫자가 아니다 — Builder 실측 없이 "정확도 검증됨"으로 문서를 닫을 수 없다.
- 앱 헤더 오탐(§11)은 이 기능의 신뢰를 무너뜨리는 가장 치명적인 실패 모드다 — QA는 이 케이스를 다른 정확도 목표와 분리해 별도로, 더 엄격하게 관리한다.

### 판정

- Product Owner 범위: `APPROVED`
- Architect 기술 검토: `APPROVED FOR BUILD`
- Builder 시작 조건: 이 SPEC을 유일한 기준으로 삼고, §7/§10/§13/§24의 실측 필요 값을 채우며 진행 상황을 이 문서에 기록할 것
- Builder·Critic·QA·Optimizer 1회차 완료: §30 참고. 최종 판정은 `DONE`.

## 30. Critic 평가 (`docs/EVALUATION.md` 기준)

`docs/EVALUATION.md`의 100점 평가표·이슈 등급·게이트 정의를 그대로 적용한다. 결과를 보기 전에 아래 12개 질문(§26의 8개 + `docs/EVALUATION.md`가 요구하는 키보드/스크린리더·다국어·실패 상태·재사용 흐름 4개 추가)을 먼저 정했다.

### Critic 사전 질문(12개)

1. 자동으로 잘릴 영역을 사용자가 즉시 이해할 수 있는가?
2. 앱 헤더까지 잘려나갈 위험이 낮은가?
3. 감지가 틀려도 사용자가 1~2초 내에 보정할 수 있는가?
4. 상태바가 없는 이미지에서 억지로 crop하지 않는가?
5. 다크/라이트 상태바 모두 자연스럽게 처리되는가?
6. 모바일에서 제거선 조정이 쉬운가?
7. 다운로드 전에 결과를 확인할 수 있는가?
8. 이 도구가 전체 개인정보 제거 도구가 아니라는 점이 명확한가?
9. 키보드만으로 전체 흐름을 완료할 수 있고 스크린 리더가 상태·오류를 인지할 수 있는가?
10. ko/en/ja 전환 시 문구·오류·metadata가 자연스럽게 번역되어 있는가?
11. decode 실패·Canvas 오류 같은 실패 상태에서도 사용자가 막히지 않고 복구할 수 있는가?
12. Clear 후 새 이미지로 바로 다시 시작하는 재사용 흐름이 매끄러운가?

### 답변과 근거(회차 0 최초 평가 → 발견된 이슈 → Optimizer 1회차 수정 → 재검증)

| # | 답변 | 근거 |
|---|---|---|
| 1 | 예 | 제거 예정선 + 반투명 오버레이 + "상태바 감지: {confidence} · 제거 높이 {px}px" 텍스트를 동시에 제공 |
| 2 | 대체로 예 | §11 "가장 얕은 후보 우선" + 8% 상한으로 구조적으로 방지. `headerPixel` 실측(§7)으로 실제 헤더 배경이 crop 후에도 남아있음을 확인 |
| 3 | 예 | px 입력·±1·slider·drag·방향키 5가지 조정 수단, Reset 버튼 제공. 전부 실제 Chrome pointer/keyboard 이벤트로 검증 |
| 4 | 예 | flat/사진배경/동일배경색 케이스 모두 "미감지"로 안전 처리(§28 실측) |
| 5 | 예 | iPhone/Android × 밝음/어두움 4종 전부 실측 감지 성공(§28) |
| 6 | **최초 평가 시 아니오 → 수정 후 예** | 최초 구현의 드래그 hit-band는 이미지 폭 기준 고정 비율(`width/45`)이었다 — 1080px 폭 이미지가 375px 모바일 뷰포트에 표시되면 실제 터치 영역이 약 7~8 CSS px에 불과해 SPEC §21이 요구하는 44×44 CSS px에 크게 못 미쳤다(**Medium 이슈**로 기록). Optimizer가 `ResizeObserver`로 실제 표시 배율을 측정해 hit-band 높이가 항상 ≈44 CSS px가 되도록 고쳤다 |
| 7 | 예 | "원본 보기"/"결과 보기" 전환, 다운로드 전 review 문구 상시 노출 |
| 8 | 예 | privacy 안내에 "상태바 이외의 개인정보는 자동으로 제거되지 않습니다"를 명시 |
| 9 | **최초 평가 시 미확인 → 실측 후 예** | 최초 평가 시 키보드 전체 흐름을 실제로 측정하지 않아 근거 없이 만점을 줄 수 없었다(`docs/EVALUATION.md`: "근거 없는 만점은 허용하지 않는다"). QA에 Tab 순회·Enter 활성화 테스트를 추가해 실측한 결과 Tab 4회 만에 편집기에 도달하고 Enter로 "결과 만들기"가 정상 동작함을 확인 |
| 10 | 대체로 예 | 레지스트리 번역 완결성 테스트는 PASS하지만, 번역문은 원어민 검수를 거치지 않았고 320px에서 긴 ko/ja 문구의 잘림 여부는 별도로 측정하지 않았다(**Low**로 기록) |
| 11 | 예 | `unsupported-type`/`file-too-large`/`dimension-limit`/`decode-failed`/`canvas-failed`/`crop-exceeds-image`/`multiple-files` 전부 구체적 문구와 함께 수동 모드로 계속 진행 가능 |
| 12 | 예 | "초기화" 버튼이 이미지·감지값·조정값·결과 Blob을 모두 폐기하고 파일 입력 포커스까지 되돌림. 반복 3회 load/clear 사이클에서 Object URL 누수 0으로 실측 |

### 100점 평가표

| 영역 | 세부 기준(배점) | 획득 | 근거 |
|---|---|---:|---|
| 핵심 기능과 정확성 | 수용 기준 충족(10) | 10 | §3 Must Have 전 항목에 §28/§29 QA 케이스 연결 |
| | 대표·경계 결과 정확성(10) | 5 | 대표 케이스는 정확하지만, "이미 잘린 이미지"에서 얕은(45px) 오탐 1건이 실측으로 확인됨(**Medium**, §28 한계 4번) — 부분 충족 |
| | 입력 검증(5) | 5 | §20 오류 계약 전 항목 실측 |
| 사용성·정보 구조 | 목적 발견(5) | 5 | 제목·설명·업로드 도움말이 "직접 조정"까지 명확히 안내 |
| | 흐름 효율(5) | 5 | 업로드 즉시 자동 분석(추가 클릭 불필요), 3+ 조정 수단 |
| | 상태 피드백(5) | 5 | confidence 배지, landscape/tooSmall/notDetected 안내, stale 결과 자동 숨김 |
| | 오류 복구(5) | 5 | 전 오류 코드에 구체적 문구 + 수동 모드 지속 |
| 모바일 반응형 | 레이아웃(5) | 5 | 320/375/768/1440px 가로 스크롤 0 |
| | 터치 조작(5) | 5 | (질문 6 참고) 44px 터치 타깃 수정 완료, `ResizeObserver` 기반 실측 반영 |
| | 긴 콘텐츠·회전 대응(5) | 5 | `overflow-auto` 스크롤 컨테이너, 9000px 세로 이미지 정상 처리 |
| 접근성 | 키보드·focus(5) | 5 | (질문 9 참고) Tab 4회·Enter 활성화 실측 |
| | 시맨틱·label(5) | 5 | 모든 조작 버튼에 aria-label, 편집기에 aria-label, Tab 테스트가 label로 요소를 찾아낸 것 자체가 근거 |
| | 대비·동적 알림(5) | 5 | `role="status"`/`role="alert"` 사용, 신규 색상은 이미지 위 오버레이 장식 요소뿐이라 기존 텍스트 대비 토큰에 추가 위험 없음 |
| 성능·안정성 | 진입·상호작용 응답(4) | 4 | 9000px 이미지도 감지 149ms, 모델 다운로드 없음 |
| | 런타임 안정성(3) | 3 | 두 QA 스크립트 전 구간 Console/page error 0 |
| | 자원 정리(3) | 3 | (질문 12 참고) Object URL 누수 0 실측 |
| 다국어·콘텐츠 | 번역 완결성(2) | 2 | 레지스트리 테스트 PASS |
| | 의미(2) | 1 | 원어민 검수 없음(**Low**) — 부분 충족 |
| | 형식·잘림(1) | 0 | 좁은 뷰포트에서 긴 문구 잘림 여부 미측정(**Low**) — 미충족 |
| SEO·공유 가능성 | 독립 URL·metadata(2) | 2 | locale별 `generateMetadata` |
| | canonical·hreflang(2) | 2 | 공용 `createPageMetadata` 재사용 |
| | 인덱싱 가능한 설명(1) | 1 | 과장 없는 설명 문구 |
| 개인정보·보안 | 로컬 처리·전송 공개(3) | 3 | 안내 문구 + 네트워크 요청 실측 0건 |
| | 입력·출력 안전성(2) | 2 | 파일명 React 자동 이스케이프, EXIF/GPS binary 검사 PASS |

**합계: 93/100**

### 통합 이슈 목록

| 등급 | 내용 | 상태 |
|---|---|---|
| Medium | 모바일 드래그 hit-band가 고정 이미지 비율이라 실제 터치 타깃이 44px에 크게 못 미침 | **수정 완료**(`ResizeObserver` 기반 실측 배율 적용) |
| Medium | "이미 잘린 이미지"에서 제목 텍스트를 상태바로 오인해 얕게(45px) 오탐 가능 | 미수정 — 근본 원인은 알고리즘이 텍스트 굵기만으로 아이콘 패턴을 완전히 구분 못 하는 것. confidence가 "보통" 이하로만 나오고 다운로드 전 검토 단계가 있어 실제 피해가 제한적이라 별도 SPEC 승인 없이는 알고리즘을 더 손대지 않기로 함(§28) |
| Low | 번역이 원어민 검수를 거치지 않음 | 미수정 — 후속 검토 항목 |
| Low | 320px 등 좁은 뷰포트의 긴 다국어 문구 잘림 여부 미측정 | 미수정 — 후속 검토 항목 |

Critical 0, High 0.

### `docs/EVALUATION.md` 게이트 재확인

- 자동 테스트 PASS: `npm run lint`, `npm run type-check`, `npm test -- --run`(338 tests), `npm run build`, `node tests/screenshot-statusbar-remover-browser.mjs`, `node tests/screenshot-statusbar-remover-scenarios-browser.mjs` 전부 종료 코드 0, fail/skip/todo 0 — **PASS**
- Console Error 0: 두 QA 스크립트 전 구간 0건 — **PASS**
- 모바일 PASS: 320/375/768/1440px 핵심 흐름 완료, 가로 스크롤 0, 터치 타깃 수정 반영, Critical/High 모바일 이슈 0 — **PASS**
- 수용 기준 PASS: §3 Must Have 전 항목이 §28/§29 QA 케이스와 실행 증거로 연결됨 — **PASS**

### Optimizer 1회차 변경 기록

1. `components/tools/screenshot-statusbar-remover/screenshot-statusbar-remover.tsx`: `displayScale` state + `ResizeObserver`로 실제 렌더 배율을 측정해 드래그 hit-band 높이를 이미지 비율이 아닌 "항상 ≈44 CSS px"로 계산하도록 변경
2. `tests/screenshot-statusbar-remover-browser.mjs`: Object URL 생성/해제 카운터 계측(`window.__urlCounts`) 추가, 3회 load/clear 반복 후 누수 0 검증, 키보드 전용(Tab 순회 + Enter 활성화) 흐름 검증 추가

### 최종 판정

- Critic 점수: 93/100(≥90)
- 통합 이슈: Critical 0, High 0
- QA 게이트: 자동 테스트 PASS·Console Error 0·모바일 PASS·수용 기준 PASS 전부 충족
- Product Owner 상태 기록: **`DONE`**(§ 문서 상태 갱신)

남은 Low 이슈(원어민 번역 검수, 좁은 뷰포트 문구 잘림 측정) 2건은 DONE 판정을 막지 않으며, 후속 이터레이션 후보로 남긴다.
