# 이미지 → PDF QA 기록

- 기준일: 2026-09-13
- 상태: 핵심 자동 검사 PASS, 전체 SPEC 게이트는 일부 미검증
- 테스트 서버: `http://localhost:3015/ko/tools/image-to-pdf` (로컬 전용)

## Product Owner / Architect / Builder

- 1장당 1페이지, A4/Letter, 세로/가로, 0/10 mm 여백, 목록 순서, JPG/PNG/WebP, 최대 20장·25 MiB/장·24 MP/장·120 MP 합계 구현.
- `pdf-lib` 1.17.1을 도구 화면에서 동적 import. 모든 이미지의 브라우저 JPEG 재인코딩으로 EXIF 방향과 WebP 입력 경로를 통일. 재압축·흰 배경 제한을 UI에 고지.
- 기존 이미지 검증과 컨테이너 검사 재사용. 서버 변환 API는 추가하지 않음.

## Critic 사전 질문 및 결과

1. 빈 상태가 오류인가? → 아니며 PDF 버튼 미표시.
2. 잘못된 형식이 앱 전체를 멈추는가? → 오류 메시지로 처리.
3. 사진 순서가 PDF에 반영되는가? → 브라우저 테스트에서 각 페이지의 실제 JPEG 색상으로 확인.
4. 모바일에서 순서 버튼이 밀리는가? → 320/375px 업로드 후 가로 overflow 0, 버튼은 아래 행.
5. 투명 이미지가 검은색으로 나오는가? → 출력 PDF의 내장 JPEG 픽셀 네 모서리 흰색 확인.
6. 기존 결과가 설정 변경 뒤 남는가? → 변경 즉시 다운로드 버튼 제거.
7. EXIF 회전이 이중 적용되는가? → 방향 1~8의 4분면 색상을 출력 PDF의 실제 JPEG 픽셀과 비교해 확인.
8. 이미지·파일명이 서버로 새는가? → 브라우저 요청 감시에서 테스트 마커 유출 0.
9. PDF가 유효한가? → `pdf-lib`로 다운로드를 다시 열어 페이지 수와 용지 크기 확인.
10. 저사양 기기에서 한도가 안전한가? → 미검증. 이 한도를 확정된 기기 보증으로 홍보하지 않음.

## QA 실행 결과

| 검사 | 결과 |
|---|---|
| `npm.cmd run lint` | PASS |
| `npm.cmd run type-check` | PASS |
| `npm.cmd test` | 64개 파일, 742개 테스트 PASS |
| `npm.cmd run build` | PASS, ko/en/ja 정적 경로 생성 |
| `node tests/image-to-pdf-browser.mjs` | PASS: 320/375/768/1280px, 3개 언어, 3개 이미지 형식, 다운로드, 3페이지 실제 이미지 순서, Letter 가로, 21장 거부, EXIF 방향 1~8의 PDF 픽셀 방향, 투명 PNG의 흰 배경, 콘솔 오류 0, 유출 0 |
| `node tests/seo-browser.mjs` | PASS: sitemap 90 URL, canonical/hreflang/OG |

## 남은 확인

- 저사양 실제 모바일에서 20장·120 MP 처리 중 메모리 실패와 복구.
- 파일 크기 25 MiB 및 픽셀 한도의 경계값 전수 검사.
- 다른 브라우저의 PNG/WebP 투명도와 EXIF 방향 호환성. 현재 Chrome 출력 PDF의 내장 JPEG 픽셀은 자동 검증 완료.
- 무여백 PDF의 실제 프린터 재단 범위. 디지털 페이지는 검증했으나 인쇄 결과는 기기별로 다름.
- `npm audit --omit=dev`에서 기존 Next.js → sharp 의존성 경로의 high 3건 보고됨. `pdf-lib` 신규 취약점 보고는 없고 자동 수정 가능 버전도 표시되지 않음. 이번 기능 범위에서 의존성 강제 업그레이드는 하지 않음.

최종 상태는 `DONE`이 아닌 **NEEDS HUMAN REVIEW**. 푸시하지 않음.
