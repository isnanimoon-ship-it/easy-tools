# 사진 메타데이터 삭제 도구 / Image Metadata Remover SPEC

## 문서 상태

- 기능명: 사진 메타데이터 삭제 / Image Metadata Remover
- 상태: `DRAFT — Product Owner 승인 대기`
- 작성일: 2026-09-13
- 예정 URL: `/{locale}/tools/image-metadata-remover`
- 지원 locale: `ko`, `en`, `ja`
- 카테고리: 이미지
- 유일한 구현 기준: 이 문서
- 현재 단계: Product Owner 요구사항 정리 및 Architect 검토 완료, 구현 미착수

## 1. 목적과 사용자 가치

사용자가 공유하려는 사진에서 GPS 위치, 촬영 시각, 카메라·소프트웨어 정보 등 불필요한 메타데이터를 확인하고 제거한 새 파일을 내려받게 한다. 파일은 서버나 외부 API로 보내지 않고 현재 브라우저 메모리에서만 처리한다.

이 도구는 사진 내용을 가리거나 얼굴을 익명화하지 않는다. 이미지 픽셀에 직접 찍힌 주소, 차량 번호, 얼굴, 문서 내용은 그대로 남으며, 이런 정보는 별도의 이미지 개인정보 가리기 도구가 필요하다.

## 2. 대상 사용자와 사용 사례

- 휴대전화 사진을 커뮤니티·중고거래·메신저에 올리기 전에 위치 정보를 제거하려는 사용자
- 업무용 이미지에서 촬영 기기나 편집 프로그램 정보를 제거하려는 사용자
- 여러 사진의 개인정보성 메타데이터를 한 번에 정리하려는 사용자
- 삭제 전후에 어떤 정보가 발견되고 제거됐는지 확인하려는 사용자

## 3. Product Owner 범위 결정

### Must Have — V1

- JPG/JPEG, PNG, WebP 정적 이미지 업로드
- 파일 선택 및 Drag & Drop, 여러 파일 선택
- EXIF·GPS·XMP·IPTC 등 알려진 메타데이터의 안전한 요약 표시
- GPS 포함 여부를 가장 눈에 띄게 표시하되 지도나 외부 서비스를 호출하지 않음
- 기본 처리 방식 `안전하게 모두 제거`: 브라우저가 이미지를 디코딩한 뒤 새 이미지로 재인코딩
- 입력 형식을 가능한 범위에서 유지하고, 유지할 수 없으면 처리 전에 명확히 안내
- JPEG 출력 품질 선택과 실제 적용 품질 표시
- PNG 투명도 및 WebP 투명도 보존
- EXIF 방향을 화면에 보이는 방향으로 적용한 결과 생성
- 처리 결과를 다시 검사하여 알려진 메타데이터가 남지 않았는지 확인
- 원본·결과 파일명, 형식, 해상도, 용량 및 제거 결과 표시
- 개별 다운로드와 전체 ZIP 다운로드
- 초기화, 파일 교체, 반복 실행
- 지원하지 않는 형식·손상 파일·용량 및 픽셀 제한 초과 오류
- 서버 전송·브라우저 영구 저장·외부 API 호출 없음
- `ko`, `en`, `ja`, metadata, canonical/hreflang, 메뉴·홈·사이트맵 등록
- 320px 이상 모바일 지원 및 기존 light/dark theme 유지

### Should Have — 별도 검증 통과 후

- JPEG 원본 압축 데이터를 유지하면서 APP/COM 메타데이터 구간만 제거하는 `원본 화질 유지` 모드
- 메타데이터 종류별 상세 보기
- 개별 메타데이터 선택 삭제
- 결과 목록에서 실패 파일만 다시 처리
- 파일명 충돌을 처리하는 ZIP 폴더 구조

### Could Have — 별도 SPEC

- HEIC/HEIF 입력 후 JPEG/WebP 변환
- AVIF 지원
- 메타데이터 JSON 내보내기
- 촬영 날짜·저작권 등 허용 항목만 유지
- 이미지 폴더 일괄 처리 및 File System Access API 연동

### Do Not Build — V1

- 메타데이터 수정·위조·새 위치나 촬영 시각 삽입
- RAW 카메라 파일
- 애니메이션 GIF/APNG/WebP 프레임 보존
- SVG
- 이미지 URL 가져오기
- 얼굴·문자·번호판 자동 탐지
- 클라우드 업로드, 공유 링크, 처리 기록 저장
- “모든 형식의 모든 메타데이터를 100% 제거한다”는 보장

## 4. 핵심 사용자 흐름

1. 사용자가 파일 선택 또는 Drag & Drop으로 사진을 추가한다.
2. 파일 형식·signature·크기·decode 가능 여부를 검증한다.
3. 브라우저에서 메타데이터를 분석하고 파일별 요약을 보여준다.
4. 사용자는 기본값인 `안전하게 모두 제거`와 JPEG 품질을 확인한다.
5. `메타데이터 삭제`를 실행한다.
6. 브라우저가 사진을 올바른 방향으로 디코딩하고 새 파일로 재인코딩한다.
7. 결과 파일을 다시 분석해 알려진 EXIF·GPS·XMP·IPTC 등이 남지 않았는지 검증한다.
8. 사용자는 전후 정보와 경고를 확인하고 개별 파일 또는 ZIP을 내려받는다.

빈 파일 목록은 오류가 아닌 초기 상태다. 처리 가능한 파일과 실패 파일이 섞인 경우 전체 작업을 중단하지 않고 파일별 상태를 제공한다.

## 5. 지원 형식과 입력 검증

| 입력 | MIME | signature | V1 출력 |
|---|---|---|---|
| JPEG | `image/jpeg` | `FF D8 FF` | JPEG |
| PNG | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | PNG |
| WebP | `image/webp` | `RIFF` + byte 8~11 `WEBP` | WebP, 브라우저 encoder 미지원 시 처리 전 안내 후 PNG 선택 가능 |

- 확장자만 신뢰하지 않고 MIME, signature, 실제 decode를 모두 확인한다.
- 정적 이미지로 정상 decode되며 폭과 높이가 양의 안전한 정수여야 한다.
- V1 제안 상한은 파일당 25 MiB, 총 20개, 파일별 24MP, 한 변 12,000px다.
- 일괄 작업의 총 decoded pixel 상한은 120MP로 두고 초과 파일은 처리 전에 선택 해제를 안내한다.
- 한도 수치는 구현 시 실제 모바일 메모리 QA 결과가 더 낮은 안전값을 요구하면 Architect 기록과 함께 낮출 수 있다. 더 높이는 변경은 Product Owner 승인이 필요하다.
- 파일 이름은 화면에서 텍스트로만 렌더링하고 경로 구분자·제어문자를 다운로드 이름에 사용하지 않는다.

## 6. 메타데이터 분석 기준

표시 목적의 분석은 다음 컨테이너와 표준 필드를 지원 대상으로 삼는다.

- JPEG: EXIF/TIFF, GPS IFD, XMP, IPTC/IIM, JPEG COM, ICC 존재 여부
- PNG: `eXIf`, `tEXt`, `zTXt`, `iTXt`, ICC 관련 청크 존재 여부
- WebP: `EXIF`, `XMP `, `ICCP` 청크 존재 여부

사용자 화면에는 원시 메타데이터 전체를 무분별하게 펼치지 않고 다음처럼 요약한다.

- 위치 정보: 있음/없음/확인할 수 없음
- 촬영 정보: 촬영 시각, 카메라 제조사·모델, 렌즈 정보의 존재 여부
- 작성·편집 정보: 소프트웨어, 저작권·작성자 정보의 존재 여부
- 기타: EXIF/XMP/IPTC/ICC/주석 블록 존재 여부와 개수

GPS 좌표가 발견돼도 지도 링크나 역지오코딩 요청을 만들지 않는다. 기본 화면은 `위치 정보가 포함되어 있습니다`라고 알리고 상세 보기 기능이 승인된 경우에만 좌표를 로컬에서 표시한다.

`메타데이터 없음`은 지원하는 parser와 컨테이너 검사에서 알려진 블록을 찾지 못했다는 의미다. 임의의 제조사 전용·비표준 데이터를 절대적으로 부정하는 표현은 쓰지 않는다.

## 7. 삭제 방식과 정확성 계약

### 7.1 안전하게 모두 제거 — Must Have

- 브라우저 decoder가 표시 방향을 적용한 pixel을 Canvas에 그린다.
- 새 Canvas 결과를 JPEG, PNG 또는 WebP Blob으로 인코딩한다.
- 원본 파일의 EXIF, XMP, IPTC, ICC, 텍스트 청크, 주석 또는 원본 byte segment를 결과에 복사하지 않는다.
- 결과 Blob을 동일 분석기와 독립적인 컨테이너 scanner로 다시 검사한다.
- EXIF·GPS·XMP·IPTC·주석·텍스트처럼 개인정보를 담을 수 있는 metadata chunk/segment가 남으면 성공으로 표시하거나 다운로드를 활성화하지 않는다.
- 원본 ICC profile은 복사하지 않는다. 다만 브라우저 encoder가 결과의 표준 색상 표현을 위해 새 ICC profile을 생성할 수 있으며, 이 프로필에는 원본 GPS·작성자·촬영·기기 정보가 없으므로 삭제 실패로 세지 않는다.

이 방식은 pixel을 새로 인코딩하므로 JPEG/WebP에서는 손실 재압축이 발생할 수 있고 PNG도 파일 크기가 달라질 수 있다. ICC profile 제거와 sRGB 변환 때문에 색상 관리가 중요한 사진은 색감이 달라질 수 있다. 해당 사실을 실행 전 안내한다.

### 7.2 원본 화질 유지 — Should Have

JPEG entropy-coded image data를 다시 압축하지 않고 metadata segment만 제거하는 모드다. 다음 조건을 모두 충족하는 구현과 fixture가 준비되기 전에는 UI에 노출하지 않는다.

- APP1 EXIF/XMP, APP13 IPTC, APP2 ICC, COM 및 확장 XMP를 누락 없이 식별
- JPEG marker 길이와 scan data를 손상시키지 않음
- 결과가 일반 decoder에서 열리고 pixel checksum이 원본과 동일
- orientation tag 제거 후에도 사진이 돌아가지 않도록 pixel 방향 또는 별도의 안전한 방향 처리 방침 확정
- 남은 segment allowlist와 unknown APP segment 처리 정책 확정

“무손실”은 픽셀 압축 데이터 유지라는 뜻이며 모든 비표준 정보 제거를 자동 보장한다는 뜻이 아니다.

## 8. 방향·색상·투명도·애니메이션

- EXIF orientation 1~8은 결과 이미지의 픽셀 방향으로 반영하고 orientation tag 없이도 동일하게 보이게 한다.
- JPEG 결과에는 alpha가 없으며 투명 이미지를 JPEG로 바꾸는 기능은 V1에 제공하지 않는다.
- PNG/WebP alpha는 결과 pixel 비교 fixture로 보존을 검증한다.
- Canvas 출력의 색상 공간은 sRGB로 정의한다. 원본 ICC/Display P3의 byte-for-byte 색상 보존을 주장하지 않는다.
- 애니메이션이 있는 WebP/APNG/GIF는 V1에서 거부한다. 첫 프레임만 조용히 저장하지 않는다.
- JPEG 품질 기본값은 0.92로 제안하며 UI에는 92%로 표시한다. 구현 시 encoder가 실제로 받은 값을 결과에도 표시한다.

## 9. 다중 파일과 자원 관리

- 분석은 제한된 동시성으로 수행하고, 재인코딩은 기본적으로 한 파일씩 순차 처리한다.
- 전체 원본의 RGBA Canvas를 동시에 유지하지 않는다.
- 파일별 처리 완료 후 bitmap/image reference와 Canvas backing store를 즉시 정리한다.
- Object URL은 결과 미리보기에 필요한 동안만 유지하고 교체·초기화·unmount에서 revoke한다.
- 이전 작업이 진행 중일 때 새 파일을 추가하거나 초기화하면 generation token/AbortController로 stale 결과 반영을 막는다.
- ZIP은 기존 프로젝트의 `fflate`를 재사용해 브라우저에서 생성한다. ZIP에 원본 파일을 포함하지 않는다.
- ZIP 생성 중 메모리 사용량을 안내하며 총 결과 byte 상한을 정한다. 상한을 넘으면 개별 다운로드만 제공한다.

## 10. 파일명과 다운로드

- 개별 파일: 원본 basename 뒤에 `-metadata-removed`를 붙이고 실제 출력 형식 확장자를 사용한다.
- 예: `photo.jpg` → `photo-metadata-removed.jpg`
- 동일 이름은 `-2`, `-3`처럼 충돌을 피한다.
- ZIP 기본 이름: `metadata-removed-images.zip`
- 경로 구분자, NUL, 제어문자, Windows 예약 이름을 정규화한다.
- 결과 다운로드는 생성된 Blob만 사용하고 원본 byte stream으로 fallback하지 않는다.

## 11. UI/UX 구조

1. 공통 `ToolPageHero`와 Breadcrumb
2. 로컬 처리·한계 안내
3. 파일 선택/Drag & Drop 영역
4. 파일별 분석 결과 목록
5. 처리 방식과 JPEG 품질 설정
6. `메타데이터 삭제` 및 `초기화`
7. 진행률과 파일별 상태
8. 결과 요약, 개별 다운로드, 전체 ZIP 다운로드
9. 공통 `ToolDetailContent`

파일 상태는 `분석 중`, `준비됨`, `처리 중`, `삭제 확인됨`, `실패`로 구분한다. GPS 정보는 아이콘과 텍스트를 함께 사용하고 색상만으로 전달하지 않는다.

결과 요약에는 다음을 표시한다.

- 처리 성공/실패 개수
- 원본과 결과 용량
- 형식과 해상도
- 알려진 메타데이터 재검사 결과
- 재인코딩에 따른 화질·색상 변화 가능성

## 12. 오류 계약

| 상황 | 사용자 메시지 원칙 | 복구 |
|---|---|---|
| 지원하지 않는 형식 | 지원 형식 JPG, PNG, WebP 명시 | 다른 파일 선택 |
| MIME/signature 불일치 | 이미지 파일을 확인하도록 안내 | 해당 파일 제거 |
| 손상·decode 실패 | 브라우저에서 읽을 수 없다고 안내 | 다른 파일 선택 |
| 파일·픽셀·총량 초과 | 실제 제한과 초과 대상을 표시 | 일부 파일 제거 |
| 애니메이션 이미지 | 애니메이션 보존을 지원하지 않음을 안내 | 정적 이미지 선택 |
| 분석 실패 | 정보 확인이 불완전함을 표시하고 삭제 실행 정책 안내 | 다시 시도/파일 제거 |
| 인코딩 실패 | 해당 형식 결과를 만들지 못했다고 안내 | PNG 등 허용된 대안 선택 |
| 재검사 실패 | 다운로드 비활성화, 제거를 확인하지 못했다고 안내 | 다시 처리 |
| ZIP 메모리/크기 제한 | 개별 다운로드를 안내 | 개별 다운로드 |

예외 메시지, stack trace, 파일의 metadata 원문을 console 또는 UI 오류에 그대로 노출하지 않는다.

## 13. 개인정보와 보안

- 입력 File과 결과 Blob은 현재 탭의 브라우저 메모리에서만 처리한다.
- 서버 route, Server Action, 외부 분석 API, 원격 이미지 요청을 사용하지 않는다.
- 파일명, 이미지 byte, metadata 값, GPS, 결과는 analytics, console, URL, cookie, localStorage, sessionStorage, IndexedDB에 기록하지 않는다.
- 공통 사용량 집계가 있다면 도구 페이지 방문 또는 익명 실행 횟수만 허용하며 파일 관련 값은 payload에 포함하지 않는다.
- 다운로드는 사용자의 명시적 action으로만 시작한다.
- `createImageBitmap`, Canvas, worker 사용 여부와 관계없이 처리 경계는 client-only module로 제한한다.

## 14. 접근성과 반응형

- 파일 input, drop zone, 품질 control, 처리·초기화·다운로드에 명확한 accessible name을 제공한다.
- 모든 기능을 키보드로 사용할 수 있고 focus indicator가 보인다.
- 처리 진행은 `aria-live="polite"`, 실패는 적절한 alert semantics로 알린다.
- 표 형태 정보는 모바일에서 카드 또는 가로 overflow가 해당 영역 안에만 생기도록 전환한다.
- 320, 375, 768, 1024, 1440px에서 문서 전체 가로 스크롤, 버튼 겹침, 긴 파일명 overflow가 없어야 한다.
- 결과 미리보기만으로 성공을 전달하지 않고 텍스트 재검사 결과를 함께 표시한다.

## 15. 설명 콘텐츠와 SEO

- H1: `사진 메타데이터 삭제`
- 도구 설명은 GPS·EXIF 등 사진 정보를 서버 업로드 없이 브라우저에서 제거한다는 실제 기능을 반영한다.
- 다음 내용을 실제 HTML 콘텐츠로 제공한다.
  - 사진 메타데이터와 EXIF가 무엇인지
  - GPS 정보가 공유 시 문제가 될 수 있는 이유
  - 사용 방법
  - 재인코딩과 무손실 제거의 차이
  - 사진 픽셀 속 개인정보는 제거하지 않는다는 제한
  - 색상 프로파일·화질·파일 크기 변화 가능성
  - 개인정보 및 브라우저 처리 설명
  - 도구별 FAQ 3~5개
- 관련 도구 후보: 이미지 개인정보 가리기, 이미지 용량 줄이기, 이미지 색상 추출기, 이미지 이어붙이기.
- locale별 unique metadata, canonical, `ko/en/ja/x-default` hreflang, Open Graph/Twitter, BreadcrumbList는 기존 helper를 재사용한다.
- 실제 FAQ를 렌더링하되 검색 노출을 목적으로 부적절한 FAQPage structured data를 추가하지 않는다.

## 16. 라이브러리 검토 기준

구현 전에 다음을 최신 공식 저장소와 설치 패키지에서 재확인한다.

| 역할 | 우선 후보 | Architect 판단 기준 |
|---|---|---|
| metadata 읽기 | `exifr` | 브라우저·TypeScript 지원, EXIF/GPS/XMP/IPTC 범위, worker 가능성, 라이선스, 유지보수 상태와 실제 bundle |
| 이미지 재인코딩 | Browser Image/Canvas APIs | 새 dependency 없이 metadata 비복사 가능, orientation·alpha·형식별 encoder QA 필요 |
| 컨테이너 재검사 | 작은 내부 binary scanner | parser와 독립적으로 JPEG APP/COM, PNG ancillary metadata, WebP EXIF/XMP/ICCP를 탐지; 범위를 명시하고 임의 파싱 금지 |
| ZIP | 기존 `fflate` | 이미 설치·고지된 dependency 재사용, 결과 byte 상한 적용 |

`piexifjs`처럼 JPEG 중심이거나 유지보수·형식 범위가 맞지 않는 라이브러리를 편의만으로 채택하지 않는다. metadata parser 하나의 빈 결과만으로 삭제 성공을 판정하지 않고 컨테이너 scanner와 decode 검증을 함께 사용한다. 신규 dependency의 정확한 버전·라이선스·번들 증가는 구현 시 `THIRD_PARTY_NOTICES.md`와 완료 보고에 기록한다.

## 17. 구현 구조 제안

```text
app/[locale]/tools/image-metadata-remover/page.tsx
components/tools/image-metadata-remover/image-metadata-remover.tsx
lib/tools/image-metadata-remover/file-validation.ts
lib/tools/image-metadata-remover/metadata-reader.ts
lib/tools/image-metadata-remover/container-scanner.ts
lib/tools/image-metadata-remover/reencode-image.ts
lib/tools/image-metadata-remover/download.ts
lib/tools/image-metadata-remover/*.test.ts
tests/image-metadata-remover-browser.mjs
messages/{ko,en,ja}.json
```

- page·metadata·설명은 Server Component로 유지한다.
- File, metadata parser, Canvas, Blob, Object URL, ZIP 상태만 Client Component 경계에 둔다.
- validation, scanner, filename과 결과 판정은 React에서 분리된 순수 함수로 구현한다.
- 기존 `ToolPageHero`, `ToolDetailContent`, theme token, Button, registry와 SEO helper를 재사용한다.
- 공통 이미지 도구를 대규모로 리팩터링하지 않는다.

## 18. QA 필수 테스트

### 입력·메타데이터 fixture

1. GPS와 EXIF가 포함된 JPEG
2. EXIF orientation 1~8 JPEG
3. XMP·IPTC·ICC·COM이 각각 또는 함께 포함된 JPEG
4. metadata가 없는 JPEG
5. `eXIf`, `tEXt`, `zTXt`, `iTXt`, ICC가 포함된 PNG
6. 투명 PNG와 metadata 없는 PNG
7. EXIF/XMP/ICCP가 포함된 WebP
8. 투명 WebP와 metadata 없는 WebP
9. 한글·일본어·Emoji·매우 긴 파일명
10. 확장자/MIME/signature 불일치
11. 손상·truncated 파일과 이미지가 아닌 파일
12. 0 byte, 제한 직전·정확히·초과 파일
13. 픽셀/한 변/총량 제한 직전·정확히·초과
14. 애니메이션 GIF/APNG/WebP
15. 여러 정상·실패 파일이 섞인 일괄 입력

### 결과 검증

16. 결과 파일이 선언한 MIME과 signature로 decode됨
17. 결과 해상도와 표시 방향이 원본의 지향된 모습과 같음
18. orientation 1~8 corner fixture가 회전·반전 없이 일치
19. PNG/WebP alpha sample 보존
20. JPEG 품질 60/80/92/100이 encoder에 정확히 전달되고 표시됨
21. EXIF/GPS/XMP/IPTC/주석/텍스트 청크가 결과 scanner에서 발견되지 않고 원본 ICC profile이 복사되지 않음. 브라우저가 새로 생성한 표준 출력 ICC는 별도로 기록
22. 결과를 metadata parser로 다시 읽어 알려진 개인정보 필드가 없음
23. 원본에 metadata가 없어도 정상 결과 생성
24. 원본과 결과 용량이 같거나 커져도 거짓 감소 문구가 없음
25. ICC 제거가 가능한 색상 변화 경고와 일치
26. 개별 다운로드의 bytes/MIME/확장자/파일명 일치
27. ZIP 안 파일이 개별 결과와 byte 단위로 같고 원본이 포함되지 않음
28. 재검사 실패 시 다운로드가 활성화되지 않음
29. 반복 처리·파일 교체·초기화 중 stale 결과 없음
30. Object URL revoke, Canvas reset, bitmap/reference 정리

### 개인정보·브라우저·회귀

31. 파일 고유 marker가 서버·외부 request body, URL, storage, analytics, console에 나타나지 않음
32. 정상·실패·초기화에서 Console Error와 unhandled rejection 0
33. 320/375/768/1024/1440px, light/dark, ko/en/ja
34. keyboard-only로 업로드부터 다운로드까지 수행 가능
35. 메뉴·홈·검색·카테고리·사이트맵·관련 도구 연결
36. 기존 이미지 도구 및 전체 테스트 회귀 없음

### 필수 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 해당 도구 unit/component/browser 테스트
- 신규 dependency가 생기면 `npm audit --audit-level=high`

필수 테스트에는 fail, skip, todo가 없어야 한다. 실제 브라우저·형식 fixture가 없는 항목은 추정으로 PASS 처리하지 않고 `NEEDS HUMAN REVIEW`로 기록한다.

## 19. 수용 기준

1. JPG/JPEG, PNG, WebP 정상 입력을 브라우저에서 처리한다.
2. GPS 포함 fixture에서 위치 정보가 감지되고 결과에서는 제거된다.
3. 지원 대상으로 명시한 EXIF/GPS/XMP/IPTC/주석/텍스트 metadata가 재검사에서 발견되지 않고 원본 ICC profile이 결과에 복사되지 않는다.
4. 결과가 정상 decode되고 지향된 해상도·방향을 유지한다.
5. PNG/WebP 투명도가 보존된다.
6. JPEG 재압축과 ICC 제거에 따른 변화 가능성을 실행 전에 안내한다.
7. 사진 픽셀 속 개인정보는 제거하지 않는다는 한계를 명확히 보여준다.
8. 여러 파일 중 하나가 실패해도 나머지 결과를 받을 수 있다.
9. 개별·ZIP 다운로드의 파일명, MIME, bytes가 화면 결과와 일치한다.
10. 입력·metadata·GPS·결과가 서버, 외부 API, storage, URL, analytics, console로 유출되지 않는다.
11. 모바일·키보드·스크린리더 기본 흐름이 정상이다.
12. ko/en/ja 문구와 metadata, 메뉴, 사이트맵이 완전하다.
13. TypeScript 오류 0, Console Error 0, lint/test/build PASS다.
14. 기존 `docs/EVALUATION.md`의 PASS 조건을 충족한다.

## 20. Critic 사전 질문

1. 사용자가 GPS가 발견됐는지 3초 안에 이해할 수 있는가?
2. `안전하게 모두 제거`가 재인코딩을 뜻한다는 사실이 실행 전에 보이는가?
3. 메타데이터 삭제와 사진 내용 가리기의 차이를 비개발자가 이해하는가?
4. 색상·화질·용량이 달라질 수 있다는 설명이 과도하게 숨겨져 있지 않은가?
5. metadata가 없는 사진도 오류처럼 보이지 않고 정상적으로 정리할 수 있는가?
6. 여러 파일 중 실패한 파일과 완료된 파일을 쉽게 구분할 수 있는가?
7. 재검사 실패 결과를 사용자가 실수로 다운로드할 수 없는가?
8. 모바일에서 긴 파일명과 다중 결과가 레이아웃을 깨뜨리지 않는가?
9. 키보드와 스크린리더로 파일 상태와 결과를 파악할 수 있는가?
10. 개인정보 로컬 처리 설명과 실제 network/storage 동작이 일치하는가?
11. `메타데이터 없음`이 절대적 보장으로 오해되지 않는가?
12. 전체 ZIP이 대량 메모리를 소비할 때 복구 방법이 명확한가?

## 21. Architect 검토 결과

### 기존 구조 적합성

- App Router의 기존 `/{locale}/tools/{slug}` 패턴과 충돌하지 않는다.
- 공통 Hero, 상세 콘텐츠, registry, 검색, 카테고리, metadata, sitemap 구조를 그대로 재사용할 수 있다.
- 파일과 Canvas는 기존 이미지 도구와 유사하지만, metadata 검사와 결과 판정은 독립 모듈이 필요하다.
- 서버 route와 데이터베이스가 필요하지 않아 Vercel Function·대용량 업로드 비용을 만들지 않는다.

### 확정 결정

1. V1 기본 모드는 Canvas 기반 재인코딩이며 이름은 `안전하게 모두 제거`로 한다.
2. JPEG 무손실 제거는 Should Have로 격리하고 V1 구현 승인에 포함하지 않는다.
3. metadata 삭제 성공은 parser 빈 결과만으로 판정하지 않고 독립 container scan과 decode를 함께 통과해야 한다.
4. 원본 ICC는 결과에 복사하지 않고 색상 공간 변화 가능성을 명시한다. 브라우저가 새로 생성한 표준 출력 ICC는 개인정보 잔존으로 오판하지 않는다.
5. orientation은 tag 유지가 아니라 결과 pixel에 적용한다.
6. 다중 파일은 순차 인코딩하고 총량 제한을 적용한다.
7. ZIP은 이미 설치된 `fflate`를 재사용한다.
8. `exifr`는 우선 후보일 뿐 아직 dependency로 승인·설치하지 않는다. 구현 시작 시 최신 상태를 검증한다.

### 주요 위험과 통제

- **비표준 metadata 누락:** 지원 컨테이너 범위를 명시하고 절대적 표현을 금지한다.
- **orientation 중복 적용:** EXIF 1~8 비대칭 corner fixture로 preview와 결과를 검증한다.
- **색상 변화:** sRGB 출력 계약과 ICC 제거 경고를 제공한다.
- **대용량 OOM:** 파일·픽셀·총량 제한, 순차 처리와 즉시 자원 정리를 적용한다.
- **WebP encoder 미지원:** 실행 전 capability 검사와 PNG 대안을 제공한다.
- **삭제 성공 오판:** 결과 재검사 실패 시 다운로드를 차단한다.
- **애니메이션 손실:** 애니메이션 입력을 감지해 V1에서 거부한다.

### Architect 판정

- 구조 충돌: 없음
- 서버/API 필요: 없음
- Vercel 종량제 서버 작업: 없음
- 신규 dependency: 구현 시 metadata parser 1개가 필요할 가능성 있음
- 기술적 구현 가능성: 높음
- 주요 불확실성: 형식별 metadata fixture와 실제 Chrome WebP/ICC/orientation 동작 검증
- Builder 진입 상태: `READY AFTER PRODUCT OWNER APPROVAL`
- 현재 작업 제한: 사용자가 구현을 요청하기 전에는 코드·dependency·registry를 변경하지 않는다.

## 22. 완료 조건과 작업 규칙

구현 승인 후 기존 Product Owner → Architect → Builder → Critic → QA → Optimizer 순서를 따른다. 최초 구현은 개선 회차 0이며 최대 5회까지 개선할 수 있다. Critic 90점 이상, Critical 0, High 0, 모든 필수 자동 테스트·Console Error 0·모바일·수용 기준 PASS가 확인될 때만 `DONE`으로 기록한다.

Builder, Architect, Critic, QA, Optimizer는 자신의 결과를 최종 승인하지 않는다. 필요한 실제 형식 fixture나 브라우저 증거가 없으면 `PASS`로 추정하지 않고 `NEEDS HUMAN REVIEW`로 남긴다.
