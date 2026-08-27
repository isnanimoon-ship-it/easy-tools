# YouTube Thumbnail Downloader / 유튜브 썸네일 추출기 SPEC

## 문서 상태

- 기능명: YouTube Thumbnail Downloader / 유튜브 썸네일 추출기
- 상태: `DONE`
- 우선순위: 여섯 번째 유틸리티 / P0
- Product Owner 승인일: 2026-08-27
- 개선 회차: 2/5
- 예정 URL: `/{locale}/tools/youtube-thumbnail-downloader`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자는 YouTube 영상 URL에서 영상 ID를 찾아 실제 사용할 수 있는 썸네일 해상도를 확인하고, 이미지를 크게 열거나 저장하고 싶다. YouTube URL 형식은 watch, short URL, Shorts, embed, live와 모바일 주소 등으로 나뉘며 모든 영상에 모든 썸네일 해상도가 존재하지 않는다. 단순히 후보 URL 다섯 개를 나열하면 존재하지 않는 고해상도 URL이 120×90 placeholder 이미지로 보일 수 있으므로 실제 이미지 규격을 검증해야 한다.

이 도구는 로그인, YouTube Data API와 API key 없이 URL/ID를 브라우저에서 해석하고 YouTube 이미지 CDN의 썸네일만 요청한다. YouTube 영상이나 오디오 자체를 다운로드하지 않는다.

## 2. 대상 사용자

- 본인 또는 사용 권한이 있는 영상의 썸네일을 확인하려는 크리에이터·편집자
- watch, Shorts, live 등 서로 다른 YouTube 주소에서 영상 ID를 빠르게 추출하려는 사용자
- 데스크톱과 모바일에서 제공되는 썸네일 해상도를 비교하려는 사용자
- 계정 로그인이나 API key 없이 간단히 이미지 원본을 열고 저장하려는 사용자

## 3. 가치 제안

YouTube URL 또는 영상 ID 하나를 입력하면 브라우저 안에서 정확한 ID를 식별하고, placeholder를 제외한 실제 사용 가능한 썸네일만 해상도별로 보여주며, 저장이 허용되는 브라우저 환경에서는 바로 저장하고 그렇지 않으면 원본 이미지를 열어 사용자가 직접 저장할 수 있게 한다.

## 4. 제품 원칙과 범위

### Must Have

- 지원 YouTube URL 또는 11자리 영상 ID 입력
- 명시적 `썸네일 추출` 실행과 Enter 제출
- URL API 기반 영상 ID 추출·검증
- Max Resolution, Standard Definition, High Quality, Medium Quality, Default 다섯 후보 생성
- 각 후보 이미지의 실제 로드와 자연 크기 검증
- 사용 가능한 썸네일 카드: 이름, 실제 해상도, 비율 보존 미리보기, 이미지 열기, 저장
- 사용할 수 없는 후보의 명확한 상태 표시 또는 카드 내 비활성 상태
- 전체 로딩, 후보별 로딩 실패, 입력 오류와 저장 실패 처리
- Clear와 입력 focus 복원
- 같은 입력 반복 실행의 안정성
- `ko`, `en`, `ja`, 모바일, 독립 URL·SEO·홈/공통 메뉴 등록
- 로컬 URL 파싱과 외부 이미지 요청 범위를 정확히 설명하는 개인정보 안내

### Should Have — 후속 SPEC 후보

- Clipboard에서 붙여넣기 버튼: 모바일 편의는 있지만 Clipboard read 권한·실패 UX가 추가되므로 기본 붙여넣기와 Enter 흐름을 먼저 제공한다.
- 썸네일 URL 복사: 개발자에게 유용하지만 핵심인 미리보기·열기·저장 이후 후속 개선으로 둔다.

### Could Have — 현재 제외

- 자동 실행: 붙여넣는 도중의 불완전 URL과 불필요한 외부 이미지 요청을 만들 수 있어 명시적 제출보다 우선순위가 낮다.
- `0.jpg`, `1.jpg`, `2.jpg`, `3.jpg`: 프레임 썸네일은 영상별 유용성과 제공 상태가 일정하지 않아 기본 다섯 종류 이후에 검토한다.
- 모든 썸네일을 새 탭으로 한 번에 열기: popup 차단과 다중 탭 UX 때문에 개별 열기를 우선한다.

### Do Not Build

- 최근 입력·검색 기록 저장
- 여러 URL 일괄 처리
- ZIP 일괄 다운로드
- YouTube 영상·오디오 다운로드 또는 변환
- playlist 자체 썸네일 추출
- 채널·재생목록 분석, 영상 제목·채널·재생시간 조회
- YouTube Data API, API key, 로그인, 사용자 계정
- 썸네일 편집·워터마크 제거·업스케일
- 서버 proxy, API route, Server Action 또는 사용자 입력 로그

후속 항목은 승인 없이 구현하지 않고 필요하면 `IDEAS.md`에서 별도로 관리한다.

## 5. 입력과 초기 상태

- 입력은 단일 행 text input이며 항상 보이는 label, 짧은 설명과 예시를 제공한다.
- 기본 예시는 `https://www.youtube.com/watch?v=dQw4w9WgXcQ` 형식만 안내하고 자동 입력하지 않는다.
- 최초 진입 시 입력·결과·오류가 없고 `썸네일 추출`과 Clear는 disabled다.
- 빈 문자열 또는 trim 후 빈 문자열은 오류를 띄우지 않으며 실행은 disabled다.
- 앞뒤 ASCII/Unicode 공백은 제출 시 제거하되 input 표시값은 사용자가 Clear하기 전 임의 변경하지 않는다.
- 입력 수정 시 기존 입력 오류는 즉시 제거한다. 이전 결과는 화면에서 즉시 제거해 새 입력의 결과로 오인하지 않게 한다.
- 실행 중 입력과 실행 버튼을 disabled하고 중복 제출을 막는다. Clear는 실행 중에도 사용할 수 있으며 현재 검증 실행을 무효화한다.
- 같은 URL/ID를 반복 제출하면 이전 상태를 초기화하고 동일한 검증을 다시 수행한다. 캐시 여부와 무관하게 오류가 나면 안 된다.

## 6. 지원 입력과 영상 ID 규칙

### 직접 영상 ID

- Product Owner 결정: 11자리 영상 ID 직접 입력을 Must Have로 지원한다.
- trim한 전체 문자열이 `^[A-Za-z0-9_-]{11}$`이면 직접 영상 ID로 판정한다.
- 11자 미만·초과 또는 다른 문자가 있는 ID처럼 보이는 문자열은 임의 보정하지 않고 오류다.

### 허용 host

- `youtube.com`, `www.youtube.com`, `m.youtube.com`
- `youtu.be`, `www.youtu.be`
- scheme은 `https:` 또는 `http:`만 허용한다. 결과 CDN URL은 항상 HTTPS를 사용한다.
- host는 URL API가 정규화한 소문자 값을 exact allowlist로 비교한다. `youtube.com.evil.example`, `notyoutube.com`, userinfo를 이용한 위장 URL은 거부한다.
- scheme이 없는 `youtube.com/watch?...` 입력은 사용자 편의를 위해 정확한 허용 host prefix일 때만 내부 parsing 후보에 `https://`를 붙여 재시도한다. 다른 임의 문자열에는 scheme을 추정하지 않는다.

### 지원 path와 ID 위치

| 입력 형식 | 영상 ID 위치 | 예시 |
|---|---|---|
| 일반 watch | query `v` | `https://www.youtube.com/watch?v=VIDEO_ID` |
| 짧은 URL | 첫 path segment | `https://youtu.be/VIDEO_ID` |
| Shorts | `/shorts/{id}` | `https://www.youtube.com/shorts/VIDEO_ID` |
| Embed | `/embed/{id}` | `https://www.youtube.com/embed/VIDEO_ID` |
| Live | `/live/{id}` | `https://www.youtube.com/live/VIDEO_ID` |
| 모바일 watch | query `v` | `https://m.youtube.com/watch?v=VIDEO_ID` |

- path segment는 `decodeURIComponent`로 임의 복원하지 않고 URL API가 제공한 segment를 사용한 뒤 ID 정규식으로 검증한다.
- `/watch`는 `v`가 정확히 하나 이상 있을 때 첫 번째 유효한 `v`만 사용한다. 첫 `v`가 무효이고 뒤에 유효한 `v`가 있어도 모호성을 피하려고 오류 처리한다.
- `shorts`, `embed`, `live`, `youtu.be`는 ID 뒤의 추가 path segment를 허용하지 않는다. trailing slash 하나는 허용한다.
- 대소문자가 의미 있는 영상 ID는 원형을 보존한다. path keyword와 host 규칙은 명시된 소문자 형식만 지원한다.

### query와 playlist 처리

- `t`, `start`, `si`, `feature`, `list`, `index`, `pp` 및 그 밖의 query/hash는 추출한 영상 ID에 영향을 주지 않는다.
- watch URL에 `v`와 `list`가 함께 있으면 `v` 영상의 썸네일을 처리한다.
- `/playlist?list=...`처럼 영상 ID가 없는 playlist URL은 현재 범위 밖 오류다.
- query가 매우 길어도 URL API로 한 번 parse하며 query 전체를 정규식으로 순회하지 않는다. 입력 길이에 하드 제한은 두지 않되 QA에서 긴 query를 검사한다.

## 7. 입력 오류

오류 코드는 locale 비의존적으로 구분하고 UI에서 사용자 문구로 변환한다.

| 오류 코드 | 조건 | 사용자 안내 의미 |
|---|---|---|
| `empty` | trim 후 비어 있음 | 오류를 표시하지 않음 |
| `not-youtube` | 허용 host가 아님 | 올바른 YouTube 영상 주소 입력 |
| `invalid-url` | URL API로 parse 불가 또는 금지 scheme/userinfo | 주소 형식 확인 |
| `unsupported-format` | 허용 host지만 지원하지 않는 path | 지원 URL 형식 안내 |
| `missing-video-id` | watch/지원 path에 ID가 없음 | 영상 ID를 찾을 수 없음 |
| `invalid-video-id` | ID가 11자리 허용 문자 규칙에 맞지 않음 | 올바른 영상 ID 확인 |
| `thumbnail-unavailable` | 기준 썸네일도 실제 규격으로 로드되지 않음 | 비공개·삭제·잘못된 ID 또는 썸네일 미제공 가능성 안내 |

- 개발자용 exception, URL parser 오류 원문, stack trace를 표시하지 않는다.
- 예상 가능한 오류를 Console Error 또는 unhandled rejection으로 남기지 않는다.
- 입력 전문을 오류·analytics·로그에 포함하지 않는다.

## 8. 썸네일 후보와 일반 용도

영상 ID가 확정되면 다음 순서와 HTTPS URL로 후보를 만든다.

`https://i.ytimg.com/vi/{VIDEO_ID}/{filename}`

| 표시명 | filename | 공식 일반 크기 | 비율 | 일반 용도 |
|---|---|---:|---:|---|
| Max Resolution | `maxresdefault.jpg` | 1280×720 | 16:9 | 제공되는 경우 가장 큰 영상 대표 이미지 |
| Standard Definition | `sddefault.jpg` | 640×480 | 4:3 | SD 카드·레거시 4:3 영역 |
| High Quality | `hqdefault.jpg` | 480×360 | 4:3 | 비교적 큰 호환 미리보기 |
| Medium Quality | `mqdefault.jpg` | 320×180 | 16:9 | 목록·중간 크기 미리보기 |
| Default | `default.jpg` | 120×90 | 4:3 | 작은 목록·fallback 미리보기 |

- 공식 YouTube Data API 문서는 `default`, `medium`, `high`, `standard`, `maxres`를 정의하지만 영상마다 일부 크기가 없을 수 있고 실제 크기도 달라질 수 있다고 명시한다.
- `i.ytimg.com/vi/{id}/{filename}` 규칙은 API 응답 없이 사용하는 현재 CDN 운영 규칙이며 영구 공개 계약으로 간주하지 않는다. URL 생성은 한 순수 함수에 격리해 회귀 테스트와 향후 교체가 가능해야 한다.
- 표시 해상도는 고정 문구가 아니라 로드된 이미지의 `naturalWidth × naturalHeight`를 사용한다.

## 9. 썸네일 존재·placeholder 판별

### Architect 결정

서버 proxy와 YouTube Data API 없이 브라우저 `Image` 객체를 사용한다. 다섯 후보를 제한된 병렬 실행으로 로드하고 `onload`, `onerror`, `naturalWidth`, `naturalHeight`를 수집한다. canvas pixel 읽기나 response body 분석은 하지 않으므로 이미지 표시 자체에는 CORS 권한이 필요하지 않다.

### 가용 판정

- Max Resolution: 로드 성공 및 `naturalWidth >= 1280`, `naturalHeight >= 720`
- Standard Definition: 로드 성공 및 `naturalWidth >= 640`, `naturalHeight >= 480`
- High Quality: 로드 성공 및 `naturalWidth >= 480`, `naturalHeight >= 360`
- Medium Quality: 로드 성공 및 `naturalWidth >= 320`, `naturalHeight >= 180`
- Default: 로드 성공 및 `naturalWidth >= 120`, `naturalHeight >= 90`
- width와 height를 둘 다 검사한다. 한 축만 크거나 0인 값은 가용으로 보지 않는다.

### placeholder 통제

- 실제 Chrome 조사에서 고해상도가 없는 영상의 `maxresdefault.jpg`와 `sddefault.jpg`가 HTTP 오류 대신 120×90 이미지를 반환하는 경우를 확인했다. 따라서 HTTP 200 또는 `onload`만으로 가용 판정하지 않는다.
- High Quality가 기대 규격으로 제공되지 않으면 영상이 없거나 공개 썸네일을 사용할 수 없는 것으로 보고 Default의 120×90만 단독 노출하지 않는다. 전체 결과를 `thumbnail-unavailable`로 처리한다.
- Max/SD만 가용하지 않고 HQ/MQ/Default가 가용하면 나머지 카드는 정상 표시하고 Max/SD는 `이 영상에서는 제공되지 않음` 상태로 표시한다.
- 검증은 이미지 픽셀 유사도나 특정 placeholder hash에 의존하지 않는다. CDN 이미지가 규격을 바꾸면 잘못 숨길 가능성이 있으므로 실제 자연 크기와 오류 상태를 QA 기록에 남긴다.
- 후보별 로드는 10초 timeout을 둔다. timeout은 해당 후보 unavailable로 처리하되 다른 후보 결과를 막지 않는다.
- 모든 후보가 실패하면 네트워크 문제와 썸네일 미제공을 확정적으로 구분할 수 없으므로 `이미지를 확인할 수 없습니다. 연결 상태나 영상 주소를 확인하세요.`에 해당하는 중립 오류를 표시한다.

## 10. 비동기·경쟁 상태

- 제출할 때마다 증가하는 request token 또는 `AbortController`와 동등한 실행 식별자를 만든다.
- 이전 입력의 이미지 `onload`, `onerror`, timeout이 늦게 도착해도 현재 실행 식별자와 다르면 상태를 변경하지 않는다.
- Clear, 입력 수정, 새 제출은 이전 실행을 무효화하고 timer와 event handler를 정리한다.
- 다섯 후보 상태는 `pending`, `available`, `unavailable`로 관리한다.
- 전체 `pending` 동안 결과 영역에 skeleton 또는 텍스트 loading을 표시한다. 후보가 판정될 때마다 카드를 점진적으로 표시할 수 있지만 화면 순서는 고정한다.
- 같은 입력 반복 실행과 빠른 서로 다른 URL 연속 제출에서 이전 영상 카드가 섞이면 안 된다.

## 11. 이미지 열기와 저장

### 이미지 열기 — 항상 제공

- 가용 카드의 `이미지 열기`는 원본 HTTPS 썸네일 URL을 새 탭으로 연다.
- anchor는 `target="_blank"`와 `rel="noopener noreferrer"`를 사용한다.
- unavailable 카드에는 링크를 제공하지 않는다.

### 저장 — 브라우저 우선 방식

- Architect의 최신 안정 Chrome 조사에서 `i.ytimg.com` 이미지를 cross-origin `fetch`로 읽을 수 있음을 확인했으므로 `fetch → Blob → URL.createObjectURL → 임시 anchor download → URL.revokeObjectURL`을 Must Have 구현으로 선택한다.
- 저장은 사용자 클릭 때만 실행하며 미리보기 로드 시 Blob을 미리 내려받지 않는다.
- response가 성공이고 `Content-Type`이 `image/`로 시작하는지 확인한다. 실패·비이미지 응답은 저장 성공으로 처리하지 않는다.
- filename은 `youtube-{VIDEO_ID}-{variant}.jpg`처럼 안전한 ASCII 고정 형식을 사용한다.
- 임시 anchor를 DOM에서 제거하고 object URL을 항상 revoke한다. 같은 버튼의 중복 클릭은 저장 진행 중 disabled한다.
- CDN CORS·브라우저 정책은 외부에서 변경될 수 있다. fetch, Blob, object URL 또는 download 동작이 실패하면 카드와 미리보기를 유지하고 locale별 `직접 저장할 수 없습니다. 이미지를 연 뒤 브라우저의 이미지 저장 기능을 사용하세요.` 오류와 `이미지 열기`를 제공한다.
- cross-origin anchor의 `download` 속성만 단독으로 사용하지 않는다. 브라우저가 이를 무시하고 navigation할 수 있기 때문이다.
- 새 탭 열기를 다운로드 성공으로 표시하거나 강제 저장을 보장한다고 표현하지 않는다.

## 12. 결과 UI

- 화면 순서: 제목/설명 → 입력 form → 전체 오류/로딩 → 추출한 ID 요약 → 썸네일 카드 → 사용법 → 지원 URL → FAQ/권리·개인정보 안내.
- 입력은 모바일에서 충분한 너비와 최소 44px 높이를 제공하고 긴 URL은 input 내부에서 처리해 문서 폭을 늘리지 않는다.
- 제출은 `<form>` submit으로 구현해 입력 focus 상태에서 Enter가 동작한다.
- 결과에는 추출한 영상 ID만 표시하고 원 입력 URL 전체를 반복 노출하지 않는다.
- 카드는 Max, SD, HQ, MQ, Default 순서를 유지한다.
- 가용 카드는 이름, 실제 해상도, 16:9 또는 실제 이미지 box의 비율을 보존한 미리보기, 이미지 열기, 저장 버튼을 제공한다.
- 미리보기는 `width`, `height`, `aspect-ratio`, `object-fit: contain`과 중립 배경을 사용해 16:9·4:3·Shorts 썸네일을 늘이거나 자르지 않는다.
- `alt`는 영상 제목을 알 수 없으므로 `{quality} YouTube thumbnail preview`에 해당하는 locale 문구로 제공한다. 영상 제목을 추정하지 않는다.
- unavailable 후보는 기본적으로 compact 상태 카드로 표시해 어떤 크기가 없는지 알 수 있게 하며 broken `<img>`를 렌더링하지 않는다.
- 후보 로드 실패 시 broken image icon 대신 상태 문구와 재실행 안내를 제공한다.
- 저장 중인 카드만 busy/disabled 처리하고 결과 전체를 막지 않는다.
- Clear는 입력, ID, 후보, 로딩, 전체/카드 오류와 저장 상태를 지우고 입력으로 focus를 돌린다.

## 13. 접근성

- input에 visible label과 description을 연결한다.
- 전체 로딩은 `aria-live="polite"` status, 입력·전체 실패는 `role="alert"`로 전달한다.
- 썸네일 결과 영역은 heading과 list 시맨틱을 사용한다.
- 카드의 품질명과 해상도를 스크린 리더가 함께 인지할 수 있게 한다.
- unavailable은 색상·투명도만으로 표현하지 않고 텍스트로 표시한다.
- 모든 버튼·링크는 키보드로 접근 가능하고 visible focus를 유지한다.
- 실행·Clear·이미지 열기·저장은 최소 44px 터치 영역을 제공한다.
- 저장 진행·성공·실패는 해당 카드와 연결된 status/alert로 알린다.
- motion은 필수 정보 전달에 사용하지 않는다.

## 14. 다국어, SEO 및 탐색

- 사용자 문구는 `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 동일한 `Tools.youtubeThumbnailDownloader` namespace에서 관리한다.
- 세 locale에 제목, 설명, input, 실행·Clear, URL/ID 오류, 로딩, 품질명, 해상도, unavailable, 열기·저장과 실패, 사용법, 지원 URL, FAQ, 개인정보·권리 문구를 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 `tools/youtube-thumbnail-downloader`를 가리킨다.
- 각 locale에 고유 title·description과 기능명을 나타내는 `<h1>` 하나를 제공한다.
- 도구 UI가 첫 화면의 중심이며 SEO 설명을 UI 앞에 길게 배치하지 않는다.
- 도구 아래에 간결한 사용법 3단계, 지원 URL 형식 목록, 해상도 설명과 다음 FAQ를 제공한다.
  - 모든 영상에 Max Resolution이 있나요? — 아니다.
  - Shorts도 사용할 수 있나요? — 같은 영상 ID 규칙으로 처리한다.
  - 영상도 다운로드하나요? — 아니다. 썸네일 이미지만 제공한다.
  - `+`나 playlist parameter가 결과에 영향을 주나요? — 영상 ID 외 query는 무시한다.
- 관련 유틸리티 링크는 현재 제공하지 않는다. URL Encoder / Decoder는 핵심 사용 흐름과 직접 연결되지 않아 도구 하단의 집중도를 낮추므로 제외한다.
- 홈 카드와 공통 반응형 메뉴에 현재 locale을 유지하는 링크를 등록한다.

## 15. 개인정보·권리·보안

- URL parsing과 영상 ID 추출은 브라우저에서 수행하며 사이트 서버, API route, Server Action, 데이터베이스로 보내지 않는다.
- 입력 URL, ID, 결과와 최근 기록을 cookie, localStorage, sessionStorage, IndexedDB에 저장하지 않는다.
- 썸네일 확인을 위해 추출한 영상 ID가 포함된 이미지 요청은 사용자의 브라우저에서 `i.ytimg.com`으로 전송된다. 이 외부 요청 사실과 Google/YouTube가 자체 정책에 따라 요청 정보를 처리할 수 있음을 UI에 명확히 알린다.
- 저장 클릭 시 같은 CDN URL을 브라우저가 다시 요청할 수 있음을 안내 문구에 포함한다.
- 사용자 입력 URL 전체의 query는 CDN에 보내지 않고 검증된 11자리 영상 ID만 URL path에 사용한다.
- 영상 ID는 strict allowlist 정규식을 통과한 뒤에만 URL에 삽입해 path·query injection을 막는다.
- 결과 URL은 고정 `https://i.ytimg.com/vi/` origin과 고정 filename allowlist로만 구성한다.
- 사용자 입력을 HTML로 해석하거나 비정제 DOM에 삽입하지 않는다.
- 미리보기와 열기 대상은 검증된 YouTube CDN URL로 제한한다.
- 이 도구는 썸네일의 소유권이나 재사용 권한을 부여하지 않는다. 사용자는 본인 콘텐츠이거나 권리자의 허가·관련 법률·YouTube 정책에 따라 사용할 책임이 있다는 안내를 제공한다.
- YouTube와의 공식 제휴·승인을 암시하지 않고 YouTube 상표는 기능 식별에 필요한 텍스트 범위로만 사용한다.

## 16. 성능과 외부 의존성

- YouTube Data API, API key와 새 런타임 라이브러리를 사용하지 않는다.
- 다섯 이미지는 최대 다섯 개의 외부 CDN 요청이며 같은 후보를 중복 preload하지 않는다.
- 이미지 요소에 적절한 `loading`과 `decoding` 속성을 사용하되 존재 판별이 필요한 첫 결과는 사용자가 기다리는 작업이므로 무조건 lazy load해 검증이 멈추지 않게 한다.
- 결과 카드의 이미지 렌더 크기를 제한해 원본 1280×720이 모바일 layout을 확장하지 않게 한다.
- CDN 응답 속도는 통제할 수 없으므로 순수 URL parse/후보 생성은 QA 장비에서 10ms 목표, UI에는 즉시 loading 상태를 표시한다.
- 전체 외부 검증은 후보별 10초 timeout 안에서 종료한다. 외부 지연은 성능 점수에 기록하되 앱 응답성과 timeout 복구가 정상이라면 단독 High 이슈로 분류하지 않는다.
- CSP 또는 Next.js image optimization을 도입할 경우 `i.ytimg.com`만 명시적으로 허용한다. 최초 구현은 존재 판별과 외부 원본 동작을 단순하게 유지하기 위해 native `<img>` 사용을 우선 검토한다.

## 17. 수용 기준

1. 초기 상태에서 입력·결과·오류가 비고 실행·Clear가 disabled다.
2. 입력 앞뒤 공백은 추출 시 무시되며 입력 수정은 이전 결과·오류를 제거한다.
3. `youtube.com/watch?v=`, `youtu.be`, `/shorts/`, `/embed/`, `/live/`가 동일 ID에 대해 같은 후보 URL을 만든다.
4. `www` 없는 YouTube, `m.youtube.com`, http/https와 scheme 없는 정확한 YouTube host 입력을 지원한다.
5. `t`, `start`, `si`, `feature`, `list`, `index`, `pp`, hash와 매우 긴 query가 ID를 바꾸지 않는다.
6. watch URL에 `v`와 playlist parameter가 함께 있으면 영상 ID를 사용하고 playlist-only URL은 범위 밖 오류를 낸다.
7. 정확한 11자리 ID 직접 입력은 URL과 같은 결과를 만들며 짧거나 길거나 허용 외 문자가 있는 ID는 거부된다.
8. 일반 사이트, 위장 YouTube host, malformed URL, userinfo, 금지 scheme, 지원하지 않는 path, ID 누락을 구분된 친절한 오류로 처리한다.
9. Submit은 버튼과 Enter 모두 동작하고 실행 중 중복 제출을 막으며 loading 상태를 표시한다.
10. 다섯 후보 URL이 고정 HTTPS origin, 검증된 ID와 정확한 filename으로 생성된다.
11. Max/SD/HQ/MQ/Default의 실제 자연 크기를 검사하고 가용 카드에 실제 해상도를 표시한다.
12. 120×90 placeholder를 Max 또는 SD로 표시하지 않는다.
13. Max가 있는 영상은 Max 카드를, Max가 없는 영상은 unavailable 상태와 나머지 사용 가능한 카드를 정확히 표시한다.
14. invalid·비공개·삭제·이미지 실패에서 broken image만 노출하거나 Default placeholder를 정상 영상 결과처럼 표시하지 않는다.
15. 후보 하나의 timeout·실패가 다른 가용 후보 표시를 막지 않는다.
16. 같은 URL 반복 실행과 빠른 서로 다른 URL 연속 제출에서 오류가 없고 이전 비동기 결과가 섞이지 않는다.
17. 미리보기는 실제 비율을 유지하고 Shorts를 포함해 늘어남·잘림·layout shift를 통제한다.
18. 가용 카드의 이미지 열기는 안전한 새 탭으로 원본 CDN 이미지를 열고 unavailable 카드에는 링크가 없다.
19. 저장은 image Blob을 검증해 안전한 filename으로 내려받고 object URL·임시 DOM을 정리한다.
20. CORS·fetch·download 실패는 성공으로 위장하지 않고 결과를 유지하며 이미지 열기를 이용한 수동 저장을 안내한다.
21. Clear는 실행을 무효화하고 모든 상태를 지운 뒤 입력으로 focus를 돌린다.
22. 320/375/768/1024/1280px에서 긴 URL, 16:9·4:3 카드, 버튼과 문구가 문서 가로 overflow·잘림·겹침을 만들지 않는다.
23. 키보드만으로 입력·제출·Clear·열기·저장을 사용하고 label, loading, 가용/불가, 저장 상태를 보조기기가 인지한다.
24. `ko/en/ja` URL에서 번역·metadata·canonical·hreflang과 홈/공통 메뉴 링크가 올바르다.
25. 명확한 H1, 사용법, 지원 URL, 해상도, FAQ, 권리·개인정보 안내가 도구 흐름을 방해하지 않고 제공된다.
26. 정상·입력 오류·이미지 실패·timeout·저장 실패에서 Console Error와 unhandled rejection이 0이다.
27. 입력 URL 전체가 사이트 서버·네트워크·URL·브라우저 저장소에 유출되지 않고, 외부 요청에는 검증된 ID와 고정 CDN 경로만 포함된다.
28. 순수 parsing 성능, 외부 검증 시간·요청 수와 timeout 복구를 QA 환경에서 측정해 기록한다.
29. YouTube 주소 형식을 모르는 사용자가 별도 설명을 읽지 않고 YouTube의 주소창 또는 공유 기능에서 복사한 일반 영상·모바일·Shorts·Live URL을 그대로 붙여넣어 첫 제출에 성공한다. 지원 범위 밖의 채널·검색·playlist-only 등 영상 ID가 없는 주소는 성공으로 간주하지 않으며, 사용자가 복사해야 할 주소 형식을 오류 메시지로 안내한다.

## 18. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- 필수 테스트에는 fail, skip, todo가 없어야 한다.

### 순수 URL/ID 로직

- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- `youtube.com/live/VIDEO_ID`
- 추가 query/hash, playlist parameter가 있는 watch URL
- `youtube.com`, `www.youtube.com`, `m.youtube.com`, http/https, exact host의 scheme 없는 입력
- 직접 11자리 ID
- 빈 값, 일반 사이트, 위장 host, malformed URL, userinfo, 금지 scheme
- ID가 없는 watch/playlist, 짧거나 긴 ID, invalid character, 추가 path segment
- 매우 긴 query
- 서로 다른 지원 URL이 같은 ID와 동일한 다섯 후보를 만드는지 비교
- 고정 CDN origin·filename allowlist와 injection 불가 검증

### 이미지 가용성과 UI mock 테스트

- 다섯 후보의 기대 자연 크기와 실제 해상도 표시
- Max 존재, Max/SD가 120×90 placeholder, HQ 기준 실패, 후보별 error/timeout
- 전체 loading과 후보별 점진 결과
- 빠른 연속 실행, Clear 중 실행 완료, stale event 무시
- 비율 보존과 broken image fallback
- Enter 제출, disabled, 동일 입력 반복, Clear/focus
- 이미지 열기 URL·`noopener noreferrer`
- 저장 fetch 성공, HTTP 실패, non-image Blob, CORS rejection, object URL 생성·revoke, 안전 filename, 중복 저장 방지
- `ko/en/ja` 메시지와 홈/메뉴 링크

### QA 실제 Chrome

- production build, 최신 안정 Chrome
- viewport 320×800, 375×812, 768×1024, 1024×768, 1280×900
- `ko`, `en`, `ja`
- 직접 URL, reload, back/forward, 홈 카드·공통 메뉴 이동
- 사용자가 지정한 QA 필수 20개 입력·이미지 케이스 전체
- 실제 Max가 있는 공개 영상과 Max가 없는 공개 영상으로 자연 크기·placeholder 검증
- 실제 이미지 open과 저장 다운로드 파일명·크기·MIME 검증
- 외부 이미지 네트워크 차단으로 broken image fallback·timeout을 재현
- Clipboard 버튼은 최초 범위에 없으므로 테스트하지 않는다.
- 키보드 Enter/focus 순서, 스크린 리더용 label/status/alert, 터치 영역
- 긴 URL과 16:9·4:3 카드의 overflow·회전 대응
- Console Error, page error, unhandled rejection 0
- 입력에 query marker를 넣고 사이트 서버 요청·현재 URL·cookie·local/session storage에 포함되지 않는지 확인
- 외부 요청은 `i.ytimg.com/vi/{validated-id}/{allowlisted-filename}` 다섯 후보와 사용자 저장 재요청만 있는지 확인

### 비전문 사용자 첫 시도 성공 기준

- Critic 필수 질문: "YouTube 주소 형식을 모르는 사용자가 설명을 읽지 않고 일반 영상·모바일 공유·Shorts·Live 주소를 붙여넣어 첫 시도에 성공하는가?"
- 데스크톱 주소창의 일반 `watch` URL, 모바일 공유 `youtu.be` URL, Shorts 공유 URL과 Live URL을 형식 구분 없이 각각 붙여넣고 한 번의 제출로 영상 ID와 썸네일 결과를 얻어야 한다.
- 앞뒤 ASCII/Unicode 공백이나 줄바꿈, 재생 시간·공유·재생목록 등 추가 query/hash가 포함된 대표 복사 URL도 한 번의 제출로 처리되어야 한다.
- 위의 지원 대표 URL 케이스는 모두 통과해야 하며 하나라도 실패하면 이 기준은 FAIL이다.
- 채널·검색·playlist-only 등 영상 ID가 없는 주소와 지원하지 않는 YouTube path는 임의로 성공시키지 않는다. 앱이 깨지지 않고, 올바른 영상 주소를 주소창이나 공유 기능에서 다시 복사하도록 사용자가 이해할 수 있는 안내를 제공해야 한다.
- 제품 문구와 평가 보고서에서 지원 범위를 `모든 YouTube 주소`로 과장하지 않는다.

## 19. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 목록 Critical 0, High 0
- 필수 자동 검사와 테스트 전부 PASS
- TypeScript 오류 0
- Console Error와 처리되지 않은 rejection 0
- 주요 YouTube URL, Shorts, 직접 ID와 잘못된 URL 처리 PASS
- 실제 Max 있음/없음과 placeholder 판별 PASS
- 이미지 비율, 열기, 저장 성공·실패 fallback PASS
- 모바일 PASS
- 서버·YouTube Data API·API key 없는 구조
- 모든 수용 기준에 QA 실행 증거 연결
- 비전문 사용자 첫 시도 성공 기준 PASS
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.

## 20. Architect 사전 조사

### 공식 자료 확인

- YouTube 공식 thumbnail resource 문서는 영상 썸네일에 `default`, `medium`, `high`, `standard`, `maxres`가 있으며 같은 유형의 영상이라도 원본에 따라 일부 크기가 없을 수 있다고 설명한다.
- 공식 일반 규격은 Default 120×90, Medium 320×180, High 480×360, Standard 640×480, Max Resolution 1280×720이다.
- 공식 문서: `https://developers.google.com/youtube/v3/docs/thumbnails`
- API 정책을 적용받는 Data API는 사용하지 않는다. 다만 썸네일 소유권과 YouTube 정책을 존중하고 이미지를 변형하거나 공식 제휴를 암시하지 않는다.

### 실제 Chrome 조사 결과 — 2026-08-27

- 공개 HD 영상 `dQw4w9WgXcQ`: Max 1280×720, SD 640×480, HQ 480×360, MQ 320×180, Default 120×90 로드 확인.
- 오래된 공개 영상 `jNQXAC9IVRw`: Max와 SD URL이 image load에는 성공하지만 각각 120×90을 반환하고, HQ 480×360, MQ 320×180, Default 120×90 확인.
- 따라서 `onload` 또는 HTTP 성공만 검사하는 방식은 Max/SD placeholder를 정상 썸네일로 오판한다. 자연 크기 기대값 검사가 필수다.
- Chrome cross-origin `fetch`로 `i.ytimg.com` HQ 이미지를 읽어 status 200과 CORS response를 확인했다. Blob 저장 구현이 현재 가능하지만 외부 정책 변경을 고려해 런타임 실패 fallback이 필수다.

## 21. Architect 검토

### 결론

현재 프로젝트 구조와 충돌 없이 구현 가능하다. URL/ID parsing, 후보 생성, 이미지 자연 크기 검증과 Blob 저장은 브라우저에서 수행할 수 있으며 YouTube Data API, API key, 서버와 새 런타임 의존성이 필요하지 않다. 다만 CDN filename 규칙과 CORS는 외부 운영 동작이므로 영구 보장하지 않고 실패 UX와 회귀 테스트를 제품 계약에 포함해야 한다.

### 권장 구현 경계

```text
app/[locale]/tools/youtube-thumbnail-downloader/page.tsx
components/tools/youtube-thumbnail-downloader/youtube-thumbnail-downloader.tsx
components/tools/youtube-thumbnail-downloader/youtube-thumbnail-downloader.test.tsx
lib/tools/youtube-thumbnail-downloader/parse-youtube-input.ts
lib/tools/youtube-thumbnail-downloader/parse-youtube-input.test.ts
lib/tools/youtube-thumbnail-downloader/thumbnails.ts
lib/tools/youtube-thumbnail-downloader/thumbnails.test.ts
tests/youtube-thumbnail-downloader-browser.mjs
messages/{ko,en,ja}.json                              # Tools.youtubeThumbnailDownloader
```

- page와 locale metadata·SEO 설명은 Server Component에 둔다.
- input, 실행 token, 이미지 load, 후보 상태, Clear, open/save 상호작용만 도구 전용 Client Component로 격리한다.
- URL/ID parsing과 후보 생성은 DOM·React와 무관한 순수 함수로 둔다.
- 실제 `Image` load와 save는 dependency injection 가능한 adapter 함수 경계로 두어 timeout·stale event·CORS 실패를 결정적으로 테스트한다.
- 후보 정의는 readonly ordered array 한 곳에 두어 URL filename, 표시명 key와 기대 최소 크기가 분산되지 않게 한다.

### 기존 구조와의 비충돌 확인

- `/{locale}/tools/youtube-thumbnail-downloader`는 기존 도구와 다른 stable kebab-case slug다.
- `Tools.youtubeThumbnailDownloader`는 기존 namespace와 병렬로 추가할 수 있다.
- `strict` TypeScript, `@/*` alias, Server/Client Component 경계와 기존 테스트 기반을 유지한다.
- 홈 카드와 Header에 한 항목을 추가한다. 도구 수 증가로 desktop nav가 좁아질 수 있으므로 기존 `lg` 전환점과 1024/1280px 실제 locale별 폭을 QA한다.

### 공통 컴포넌트 판단

- 기존 `Button`은 실행·Clear·저장에 재사용한다.
- 기존 `TextInput`은 단순 controlled single-line API가 현재 비동기 error description·form submit 요구를 모두 충족하는지 Builder가 확인하고, 맞지 않으면 도구 전용 input을 사용한다.
- 기존 `ResultPanel`과 `CopyButton`은 이미지 카드·다운로드 상태에 맞지 않으므로 억지로 확장하지 않는다.
- 썸네일 카드는 이 기능 전용이다. 두 번째 이미지 도구가 생기기 전 범용 gallery 추상화를 만들지 않는다.

### 주요 위험과 통제

- 외부 CDN filename 규칙 변경: 순수 후보 정의에 격리하고 실제 Chrome smoke test로 감지한다.
- 120×90 placeholder 오판: variant별 두 축 자연 크기와 HQ 기준 영상을 함께 검증한다.
- stale image callback: 실행 token, handler/timer cleanup과 빠른 연속 제출 테스트로 막는다.
- CORS 변경으로 저장 실패: 실패를 catch하고 이미지 열기·수동 저장 안내를 유지한다.
- cross-origin download 속성 무시: Blob object URL만 다운로드 성공 경로로 사용한다.
- object URL 누수: `finally`와 unmount cleanup에서 revoke한다.
- 위장 URL·path injection: URL API, exact host allowlist, strict 11자리 ID, 고정 CDN origin/filename으로 차단한다.
- 개인정보 오해: 사이트 서버에는 보내지 않지만 YouTube CDN에 ID가 전송된다는 사실을 UI에 공개한다.
- 권리 오해: 영상 다운로드 기능이 아니며 사용 권한 책임을 명시한다.

### 의존성·서버 판정

- YouTube Data API: 사용하지 않음
- API key·로그인: 불필요
- 사이트 서버·proxy: 사용하지 않음
- 새 런타임 의존성: 불필요
- 외부 런타임 의존성: `i.ytimg.com` 이미지 응답과 CORS 정책
- offline 지원: URL/ID parsing과 후보 생성만 가능하며 실제 썸네일 확인·열기·저장은 네트워크 필요. UI에 명시한다.

### Architect 판정

- 구조 충돌: 없음
- URL/locale 충돌: 없음
- 기술적 구현 가능성: 있음
- maxres 존재 판별: 자연 크기 검증으로 가능, CDN 규격 변경 위험은 명시
- 직접 저장: 현재 Chrome에서 Blob 방식 가능, 런타임 fallback 필수
- 서버/API key 없는 우선 구조: 충족
- 새 의존성: 없음
- Builder 인계 상태: `READY`
